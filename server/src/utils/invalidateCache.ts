import { Core } from '@strapi/strapi';
import { CacheProvider } from 'src/types/cache.types';
import { loggy } from './log';

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

export async function invalidateGraphqlCache(cacheStore: CacheProvider) {
  try {
    const graphqlRegex = new RegExp(`^(GET|POST):\/graphql(:.*)?$`);

    await cacheStore.clearByRegexp([graphqlRegex]);
    loggy.info(`Invalidated cache for ${graphqlRegex}`);
  } catch (error) {
    loggy.error('Cache invalidation error:');
    loggy.error(error);
  }
}
