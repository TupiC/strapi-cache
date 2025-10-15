import { Core } from '@strapi/strapi';
import { CacheProvider } from 'src/types/cache.types';
import { loggy } from './log';

export async function invalidateCache(event: any, cacheStore: CacheProvider, strapi: Core.Strapi) {
  const { model } = event;
  const uid = model.uid;
  const restApiPrefix = strapi.config.get('api.rest.prefix', '/api');

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
  event: any,
  cacheStore: CacheProvider,
  strapi: Core.Strapi
) {
  try {
    const graphqlRegex = new RegExp(`^POST:\/graphql(:.*)?$`);

    await cacheStore.clearByRegexp([graphqlRegex]);
    loggy.info(`Invalidated cache for ${graphqlRegex}`);
  } catch (error) {
    loggy.error('Cache invalidation error:');
    loggy.error(error);
  }
}
