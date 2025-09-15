import { Context } from 'koa';
import { generateCacheKey } from '../utils/key';
import { CacheService } from '../../src/types/cache.types';
import { loggy } from '../utils/log';
import Stream from 'stream';
import { decodeBufferToText, decompressBuffer, streamToBuffer } from '../utils/body';
import { getCacheHeaderConfig, getHeadersToStore } from '../utils/header';

const middleware = async (ctx: Context, next: any) => {
  const cacheService = strapi.plugin('strapi-cache').services.service as CacheService;
  const cacheableRoutes = strapi.plugin('strapi-cache').config('cacheableRoutes') as string[];
  const excludeRoutes = strapi.plugin('strapi-cache').config('excludeRoutes') as string[];
  const { cacheHeaders, cacheHeadersDenyList, cacheHeadersAllowList, cacheAuthorizedRequests } =
    getCacheHeaderConfig();
  const cacheStore = cacheService.getCacheInstance();
  const { url } = ctx.request;
  const key = generateCacheKey(ctx);
  const cacheEntry = await cacheStore.get(key);
  const cacheControlHeader = ctx.request.headers['cache-control'];
  const noCache = cacheControlHeader && cacheControlHeader.includes('no-cache');

  const routeIsExcluded = excludeRoutes.some((route) => url.startsWith(route));
  
  if (routeIsExcluded) {
    loggy.info(`Route excluded from cache: ${url}`);
    await next();
    return;
  }

  const routeIsCachable =
    cacheableRoutes.some((route) => url.startsWith(route)) ||
    (cacheableRoutes.length === 0 && url.startsWith('/api'));

  const authorizationHeader = ctx.request.headers['authorization'];

  if (authorizationHeader && !cacheAuthorizedRequests) {
    loggy.info(`Authorized request bypassing cache: ${key}`);
    await next();
    return;
  }

  if (cacheEntry && !noCache) {
    loggy.info(`HIT with key: ${key}`);
    ctx.status = 200;
    ctx.body = cacheEntry.body;

    if (cacheHeaders) {
      ctx.set(cacheEntry.headers);
    }

    const middlewaresConfig = strapi.config.get('middlewares') as any[];
    const corsMiddleware = middlewaresConfig.find((mw: any) => mw.name === 'strapi::cors');

    if (corsMiddleware) {
      loggy.info('CORS middleware is set, checking allowed origins');
      const corsConfig = corsMiddleware?.config;
      const origin = ctx?.request?.headers?.origin;
      let allowedOrigins = corsConfig?.origin ?? '*';

      if (typeof allowedOrigins === 'string') {
        allowedOrigins = [allowedOrigins];
      }

      if (allowedOrigins.includes(origin)) {
        loggy.info(`Setting Access-Control-Allow-Origin to ${origin}`);
        ctx.set('Access-Control-Allow-Origin', origin);
      } else if (typeof origin === 'undefined' || allowedOrigins.includes('*')) {
        loggy.info('No origin header or * in allowed origins, setting to *');
        ctx.set('Access-Control-Allow-Origin', '*');
      }
    } else {
      loggy.info('No CORS middleware set, setting to request origin or *');
      ctx.set('Access-Control-Allow-Origin', ctx.request.headers.origin || '*');
    }

    return;
  }

  await next();

  if (ctx.method === 'GET' && ctx.status >= 200 && ctx.status < 300 && routeIsCachable) {
    loggy.info(`MISS with key: ${key}`);
    const headersToStore = getHeadersToStore(
      ctx,
      cacheHeaders,
      cacheHeadersAllowList,
      cacheHeadersDenyList
    );

    if (ctx.body instanceof Stream) {
      const buf = await streamToBuffer(ctx.body);
      const contentEncoding = ctx.response.headers['content-encoding'];
      const decompressed = await decompressBuffer(buf, contentEncoding);
      const responseText = decodeBufferToText(decompressed);

      await cacheStore.set(key, { body: responseText, headers: headersToStore });
      ctx.body = buf;
    } else {
      await cacheStore.set(key, { body: ctx.body, headers: headersToStore });
    }
  }
};

export default middleware;
