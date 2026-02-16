import { Core } from '@strapi/strapi';
import { CacheProvider } from 'src/types/cache.types';
import { loggy } from './log';
import { UID } from '@strapi/strapi';

export async function invalidateCache(event: any, cacheStore: CacheProvider, strapi: Core.Strapi) {
  const { model } = event;
  const uid = model.uid;
  const restApiPrefix = strapi.config.get('api.rest.prefix', '/api');
  const cacheableEntities = strapi.plugin('strapi-cache').config('cacheableEntities') as
    | string[]
    | undefined;
  const entityIsCacheable = cacheableEntities?.length
    ? cacheableEntities.includes(model.tableName)
    : true;

  // do not contact cache store with not-cacheable entity
  if (!entityIsCacheable) {
    loggy.info(`Not invalidated. ${model.tableName} is not cacheable.`);
    return;
  }

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
    const regex = new RegExp(`^.*:${apiPath}(/.*)?(\\?.*)?$`);

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
      const graphqlRegex = new RegExp(`^(GET|POST):/graphql:.*`);
      await cacheStore.clearByRegexp([graphqlRegex]);
      return;
    }

    const singularName = contentType.info.singularName ?? '';
    const pluralName = contentType.info.pluralName ?? '';
    const fieldNames = [...new Set([singularName, pluralName].filter(Boolean))];

    if (fieldNames.length === 0) {
      loggy.info(`No field names for ${model.uid}, purging all GraphQL cache`);
      const graphqlRegex = new RegExp(`^(GET|POST):/graphql:.*`);
      await cacheStore.clearByRegexp([graphqlRegex]);
      return;
    }

    const escapedNames = fieldNames
      .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    const graphqlRegex = new RegExp(`^(GET|POST):/graphql:[^:]*\\b(${escapedNames})\\b[^:]*:`);

    await cacheStore.clearByRegexp([graphqlRegex]);
    loggy.info(`Invalidated GraphQL cache for ${model.uid} (${fieldNames.join(', ')})`);
  } catch (error) {
    loggy.error('GraphQL cache invalidation error:');
    loggy.error(error);
  }
}
