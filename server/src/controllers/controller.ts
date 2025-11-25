import type { Core } from '@strapi/strapi';
import { Context } from 'koa';
import { CacheService } from 'src/types/cache.types';

interface PluginConfig {
  cacheableRoutes: string[];
  disableAdminPopups: boolean;
}

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async purgeCache(ctx: Context) {
    const service = strapi.plugin('strapi-cache').service('service') as CacheService;

    await service.getCacheInstance().reset();

    ctx.body = {
      message: 'Cache purged successfully',
    };
  },
  async purgeCacheByKey(ctx: Context) {
    const { key } = ctx.params;
    const service = strapi.plugin('strapi-cache').service('service') as CacheService;
    const regex = new RegExp(`(^|\/)?${key}(\/|\\?|$)`);

    await service.getCacheInstance().clearByRegexp([regex]);

    ctx.body = {
      message: `Cache purged successfully for key: ${key}`,
    };
  },
  async config(ctx: Context) {
    try {
      // construct config object with only the properties needed by admin
      const config: PluginConfig = {
        cacheableRoutes: strapi.plugin('strapi-cache').config('cacheableRoutes') ?? [],
        disableAdminPopups: strapi.plugin('strapi-cache').config('disableAdminPopups') ?? false,
      };

      ctx.body = config;
    } catch (error) {
      console.error('Error constructing config:', error);
      ctx.status = 500;
      ctx.body = { error: 'Configuration not available' };
    }
  },
});

export default controller;
