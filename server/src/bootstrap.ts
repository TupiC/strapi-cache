import type { Core } from '@strapi/strapi';
import { invalidateCache, invalidateGraphqlCache } from './utils/invalidateCache';
import { CacheService } from './types/cache.types';
import { loggy } from './utils/log';
import { actions } from './permissions';

const runInBackground = (label: string, task: () => Promise<void>) => {
  void Promise.resolve()
    .then(task)
    .catch((error) => {
      loggy.error(`${label} error:`);
      loggy.error(error);
    });
};

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  loggy.info('Initializing');
  try {
    const cacheService = strapi.plugin('strapi-cache').services.service as CacheService;
    const autoPurgeCache = !!strapi.plugin('strapi-cache').config('autoPurgeCache');
    const autoPurgeGraphQL = !!strapi.plugin('strapi-cache').config('autoPurgeGraphQL');
    const autoPurgeCacheOnStart = !!strapi.plugin('strapi-cache').config('autoPurgeCacheOnStart');
    const cacheStore = cacheService.getCacheInstance();

    if (!cacheStore) {
      loggy.error('Plugin could not be initialized');
      return;
    }

    cacheStore.init();

    if (autoPurgeCache) {
      strapi.db.lifecycles.subscribe({
        afterCreate(event) {
          runInBackground('Cache invalidation', () => invalidateCache(event, cacheStore, strapi));
        },
        afterUpdate(event) {
          runInBackground('Cache invalidation', () => invalidateCache(event, cacheStore, strapi));
        },
        afterDelete(event) {
          runInBackground('Cache invalidation', () => invalidateCache(event, cacheStore, strapi));
        },
      });
    }

    if (autoPurgeGraphQL) {
      strapi.db.lifecycles.subscribe({
        afterCreate(event: any) {
          runInBackground('GraphQL cache invalidation', () =>
            invalidateGraphqlCache(event, cacheStore, strapi)
          );
        },
        afterUpdate(event: any) {
          runInBackground('GraphQL cache invalidation', () =>
            invalidateGraphqlCache(event, cacheStore, strapi)
          );
        },
        afterDelete(event: any) {
          runInBackground('GraphQL cache invalidation', () =>
            invalidateGraphqlCache(event, cacheStore, strapi)
          );
        },
      });
    }

    if (autoPurgeCacheOnStart) {
      cacheStore
        .reset()
        .then(() => {
          loggy.info('Cache purged successfully');
        })
        .catch((error) => {
          loggy.error(`Error purging cache on start: ${error.message}`);
        });
    }
  } catch (error) {
    loggy.error('Plugin could not be initialized');
    return;
  }
  loggy.info('Plugin initialized');

  strapi.admin.services.permission.actionProvider.registerMany(actions);
};

export default bootstrap;
