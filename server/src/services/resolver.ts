import type { Core } from '@strapi/strapi';
import { InMemoryCacheProvider } from './memory/provider';
import { RedisCacheProvider } from './redis/provider';
import { CacheProvider } from '../../src/types/cache.types';
import { loggy } from '../../src/utils/log';

export const resolveCacheProvider = (strapi: Core.Strapi): CacheProvider => {
  const providerType = strapi.plugin('strapi-cache').config('provider') || 'memory';

  loggy.info(`Selected cache provider: ${providerType}`);

  let instance: CacheProvider;

  switch (providerType) {
    case 'redis':
    case 'valkey':
      instance = new RedisCacheProvider(strapi);
      break;
    default:
      instance = new InMemoryCacheProvider(strapi);
      break;
  }

  return instance;
};
