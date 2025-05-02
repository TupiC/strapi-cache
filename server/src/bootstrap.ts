import type { Core } from '@strapi/strapi';
import { invalidateCache, invalidateGraphqlCache } from './utils/invalidateCache';
import { CacheService } from './types/cache.types';
import { loggy } from './utils/log';
import { actions } from './permissions';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  loggy.info('Initializing');
  try {
    const cacheService = strapi.plugin('strapi-cache').services.service as CacheService;
    const cacheStore = cacheService.getCacheInstance();
    cacheStore.init();

    strapi.db.lifecycles.subscribe({
      async afterCreate(event) {
        await invalidateCache(event, cacheStore, strapi);
        await invalidateGraphqlCache(cacheStore);
      },
      async afterUpdate(event) {
        await invalidateCache(event, cacheStore, strapi);
        await invalidateGraphqlCache(cacheStore);
      },
      async afterDelete(event) {
        await invalidateCache(event, cacheStore, strapi);
        await invalidateGraphqlCache(cacheStore);
      },
    });

    if (!cacheStore) {
      loggy.error('Plugin could not be initialized');
      return;
    }
  } catch (error) {
    loggy.error('Plugin could not be initialized');
    return;
  }
  loggy.info('Plugin initialized');

  strapi.admin.services.permission.actionProvider.registerMany(actions);
};

export default bootstrap;
