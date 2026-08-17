import { Context } from 'koa';
import { CacheKeyGenerator, generateCacheKey, generateEntityKey } from '../utils/key';
import { CacheService } from '../../src/types/cache.types';
import { loggy } from '../utils/log';
import Stream from 'stream';
import {
  normalizeStreamForCache,
  restoreCachedBody,
  streamToBuffer,
  toWireReadyBody,
} from '../utils/body';
import {
  getCacheHeaderConfig,
  getHeadersForUncompressedBody,
  getHeadersToStore,
} from '../utils/header';
import { applyCorsHeaders, getCorsConfig, resolveCorsOrigin } from '../utils/cors';

const middleware = async (ctx: Context, next: any) => {
  const { url, method } = ctx.request;

  if (method !== 'GET') {
    return next();
  }

  const cacheableEntities = strapi.plugin('strapi-cache').config('cacheableEntities') as
    string[] | undefined;
  const cacheableRoutes = strapi.plugin('strapi-cache').config('cacheableRoutes') as string[];
  const excludeRoutes = strapi.plugin('strapi-cache').config('excludeRoutes') as string[];
  const restApiPrefix = strapi.config.get('api.rest.prefix', '/api');
  const routeIsExcluded = excludeRoutes.some((route) => url.startsWith(route));

  if (routeIsExcluded) {
    loggy.info(`Route excluded from cache: ${url}`);
    return next();
  }

  const entityKey = generateEntityKey(url, restApiPrefix);
  const entityIsCacheable = cacheableEntities?.length
    ? cacheableEntities.includes(entityKey)
    : undefined;
  const routeIsCacheable =
    cacheableRoutes.some((route) => url.startsWith(route)) ||
    (cacheableRoutes.length === 0 && url.startsWith(restApiPrefix));
  const isCacheable = entityIsCacheable ?? routeIsCacheable;

  if (!isCacheable) {
    return next();
  }

  const { cacheHeaders, cacheHeadersDenyList, cacheHeadersAllowList, cacheAuthorizedRequests } =
    getCacheHeaderConfig();
  const cacheControlHeader = ctx.request.headers['cache-control'];
  const noCache = cacheControlHeader && cacheControlHeader.includes('no-cache');
  const authorizationHeader = ctx.request.headers['authorization'];

  if (authorizationHeader && !cacheAuthorizedRequests) {
    loggy.info(`Authorized request bypassing cache: ${url}`);
    return next();
  }

  if (noCache) {
    return next();
  }

  const cacheService = strapi.plugin('strapi-cache').services.service as CacheService;
  const keyGenerator = strapi.plugin('strapi-cache').config('keyGenerator') as
    CacheKeyGenerator | undefined;
  const cacheStore = cacheService.getCacheInstance();
  const key = generateCacheKey(ctx, keyGenerator);
  const cacheEntry = await cacheStore.get(key);

  const middlewaresConfig = strapi.config.get('middlewares') as any[];
  const corsConfig = getCorsConfig(middlewaresConfig);
  const corsOrigin = corsConfig ? await resolveCorsOrigin(ctx, corsConfig) : '';

  if (cacheEntry && !noCache) {
    loggy.info(`HIT with key: ${key}`);
    ctx.status = 200;
    if (cacheHeaders && cacheEntry.headers) {
      ctx.set(cacheEntry.headers);
    }
    const cachedBody = restoreCachedBody(cacheEntry.body);
    if (cacheEntry.bodyType === 'json' && !ctx.response.headers['content-type']) {
      ctx.type = 'json';
    }
    ctx.body = cachedBody;

    if (corsConfig) applyCorsHeaders(ctx, corsConfig, corsOrigin);

    return;
  }

  await next();

  if (ctx.method === 'GET' && ctx.status === 200 && isCacheable) {
    loggy.info(`MISS with key: ${key}`);
    if (corsConfig) applyCorsHeaders(ctx, corsConfig, corsOrigin);
    const headersToStore = getHeadersToStore(
      ctx,
      cacheHeaders,
      cacheHeadersAllowList,
      cacheHeadersDenyList
    );

    const setCache = !corsConfig || Boolean(corsOrigin);

    if (ctx.body instanceof Stream) {
      const buf = await streamToBuffer(ctx.body);
      ctx.body = buf;
      if (setCache) {
        const contentEncoding = ctx.response.headers['content-encoding'];
        const contentType = ctx.response.headers['content-type'];
        try {
          const wireReadyBody = await normalizeStreamForCache(buf, contentEncoding, contentType);
          if (wireReadyBody) {
            await cacheStore.set(key, {
              body: wireReadyBody.body,
              bodyType: wireReadyBody.bodyType,
              headers: getHeadersForUncompressedBody(headersToStore),
            });
          } else {
            loggy.warn(`Skipping cache for unsupported content encoding: ${contentEncoding}`);
          }
        } catch (error) {
          loggy.warn(`Skipping cache because the response could not be decoded: ${error}`);
        }
      }
    } else {
      if (setCache) {
        const wireReadyBody = await toWireReadyBody(
          ctx.body,
          ctx.response.headers['content-type'] as string | undefined
        );
        if (wireReadyBody.bodyType === 'json' && !ctx.response.headers['content-type']) {
          ctx.type = 'json';
        }
        await cacheStore.set(key, {
          body: wireReadyBody.body,
          bodyType: wireReadyBody.bodyType,
          headers: headersToStore,
        });
        ctx.body = wireReadyBody.body;
      }
    }
  }
};

export default middleware;
