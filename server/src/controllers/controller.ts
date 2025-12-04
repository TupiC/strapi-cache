import type { Core } from '@strapi/strapi';
import { Context } from 'koa';
import { CacheService } from 'src/types/cache.types';
import { escapeRegExp } from 'src/utils/key';

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
    const { key } = ctx.request.body as { key?: string };

    if (!key || typeof key !== 'string' || key.trim() === '') {
      ctx.status = 400;
      ctx.body = {
        error: 'Key is required and must be a non-empty string',
      };
      return;
    }

    const service = strapi.plugin('strapi-cache').service('service') as CacheService;
    const regex = new RegExp(escapeRegExp(key));

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
