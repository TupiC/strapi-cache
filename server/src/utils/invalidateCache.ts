import { Core } from '@strapi/strapi';
import { CacheProvider } from 'src/types/cache.types';
import { loggy } from './log';
import { UID } from '@strapi/strapi';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const getGraphqlEndpoint = (strapi: Core.Strapi) =>
  strapi.plugin('graphql')?.config('endpoint', '/graphql') ?? '/graphql';
const getGraphqlAllKeysRegex = (strapi: Core.Strapi) =>
  new RegExp(`^(GET|POST):${escapeRegex(getGraphqlEndpoint(strapi))}.*`);

export async function invalidateCache(event: any, cacheStore: CacheProvider, strapi: Core.Strapi) {
  const { model } = event;
  const uid = model.uid;
  const restApiPrefix = strapi.config.get('api.rest.prefix', '/api');
  const cacheableEntities = strapi.plugin('strapi-cache').config('cacheableEntities') as
    string[] | undefined;
  const cacheableRoutes =
    (strapi.plugin('strapi-cache').config('cacheableRoutes') as string[] | undefined) ?? [];
  const excludeRoutes =
    (strapi.plugin('strapi-cache').config('excludeRoutes') as string[] | undefined) ?? [];

  try {
    const contentType = strapi.contentType(uid);

    if (!contentType || !contentType.kind) {
      loggy.info(`Content type ${uid} not found`);
      return;
    }

    const pluralName =
      contentType.kind === 'singleType'
        ? contentType.info.singularName
        : contentType.info.pluralName;
    const apiPath = `${restApiPrefix}/${pluralName}`;
    const entityNames = [
      model.tableName,
      contentType.info.singularName,
      contentType.info.pluralName,
    ].filter(Boolean);
    const entityIsCacheable = cacheableEntities?.length
      ? entityNames.some((name) => cacheableEntities.includes(name))
      : undefined;
    const routeIsExcluded = excludeRoutes.some((route) => apiPath.startsWith(route));
    const routeIsCacheable =
      cacheableRoutes.some((route) => apiPath.startsWith(route)) ||
      (cacheableRoutes.length === 0 && apiPath.startsWith(restApiPrefix));
    const isCacheable = !routeIsExcluded && (entityIsCacheable ?? routeIsCacheable);

    if (!isCacheable) {
      loggy.info(`Not invalidated. ${apiPath} is not cacheable.`);
      return;
    }

    const regex = new RegExp(`^.*:${escapeRegex(apiPath)}(/.*)?(\\?.*)?$`);

    await cacheStore.clearByRegexp([regex]);
    loggy.info(`Invalidated cache for ${apiPath}`);
  } catch (error) {
    loggy.error('Cache invalidation error:');
    loggy.error(error);
  }
}

export async function invalidateGraphqlCache(
  event: { model: { uid: string } },
  cacheStore: CacheProvider,
  strapi: Core.Strapi
) {
  try {
    const { model } = event;
    const contentType = strapi.contentType(model.uid as UID.ContentType);

    if (!contentType || !contentType.info) {
      loggy.info(`Content type ${model.uid} not found, purging all GraphQL cache`);
      const graphqlRegex = getGraphqlAllKeysRegex(strapi);
      await cacheStore.clearByRegexp([graphqlRegex]);
      return;
    }

    const singularName = contentType.info.singularName ?? '';
    const pluralName = contentType.info.pluralName ?? '';
    const fieldNames = [...new Set([singularName, pluralName].filter(Boolean))];

    if (fieldNames.length === 0) {
      loggy.info(`No field names for ${model.uid}, purging all GraphQL cache`);
      const graphqlRegex = getGraphqlAllKeysRegex(strapi);
      await cacheStore.clearByRegexp([graphqlRegex]);
      return;
    }

    const escapedNames = fieldNames.map((name) => escapeRegex(name)).join('|');
    const graphqlRegex = new RegExp(
      `^(GET|POST):${escapeRegex(getGraphqlEndpoint(strapi))}:[^:]*\\b(${escapedNames})\\b[^:]*:`
    );

    await cacheStore.clearByRegexp([graphqlRegex]);
    loggy.info(`Invalidated GraphQL cache for ${model.uid} (${fieldNames.join(', ')})`);
  } catch (error) {
    loggy.error('GraphQL cache invalidation error:');
    loggy.error(error);
  }
}
