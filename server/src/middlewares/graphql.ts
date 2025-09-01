import rawBody from 'raw-body';
import { generateGraphqlCacheKey } from '../utils/key';
import Stream, { Readable } from 'stream';
import { loggy } from '../utils/log';
import { CacheService } from '../types/cache.types';
import { decodeBufferToText, decompressBuffer, streamToBuffer } from '../utils/body';
import { getCacheHeaderConfig, getHeadersToStore } from '../utils/header';

const middleware = async (ctx: any, next: any) => {
  const cacheService = strapi.plugin('strapi-cache').services.service as CacheService;
  const { cacheHeaders, cacheHeadersDenyList, cacheHeadersAllowList, cacheAuthorizedRequests } =
    getCacheHeaderConfig();
  const cacheStore = cacheService.getCacheInstance();
  const { url } = ctx.request;

  const originalReq = ctx.req;
  const bodyBuffer = await rawBody(originalReq);
  const body = bodyBuffer.toString();

  const clonedReq = new Readable();
  clonedReq.push(bodyBuffer);
  clonedReq.push(null);

  (clonedReq as any).headers = { ...originalReq.headers };
  (clonedReq as any).method = originalReq.method;
  (clonedReq as any).url = originalReq.url;
  (clonedReq as any).httpVersion = originalReq.httpVersion;
  (clonedReq as any).socket = originalReq.socket;
  (clonedReq as any).connection = originalReq.connection;

  ctx.req = clonedReq;
  ctx.request.req = clonedReq;

  const isIntrospectionQuery = body.includes('IntrospectionQuery');
  if (isIntrospectionQuery) {
    loggy.info('Skipping cache for introspection query');
    await next();
    return;
  }

  const key = generateGraphqlCacheKey(body);
  const cacheEntry = await cacheStore.get(key);
  const authorizationHeader = ctx.request.headers['authorization'];

  if (authorizationHeader && !cacheAuthorizedRequests) {
    loggy.info(`Authorized request bypassing cache: ${key}`);
    await next();
    return;
  }

  if (cacheEntry) {
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

  if (
    ctx.method === 'POST' &&
    ctx.status >= 200 &&
    ctx.status < 300 &&
    url.startsWith('/graphql')
  ) {
    loggy.info(`MISS with key: ${key}`);
    const headers = ctx.request.headers;
    const authorizationHeader = headers['authorization'];

    if (authorizationHeader && !cacheAuthorizedRequests) {
      loggy.info(`Authorized request not caching: ${key}`);
      return;
    }

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
