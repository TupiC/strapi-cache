import rawBody from 'raw-body';
import { CacheKeyGenerator, generateGraphqlCacheKey, resolveGraphqlCacheKey } from '../utils/key';
import Stream, { Readable } from 'stream';
import { loggy } from '../utils/log';
import { CacheService } from '../types/cache.types';
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
import { parseGraphqlPayload, getRootFieldsFromQuery } from '../utils/graphql';
import { applyCorsHeaders, getCorsConfig, resolveCorsOrigin } from '../utils/cors';

const middleware = async (ctx: any, next: any) => {
  const { url, method } = ctx.request;
  if (!url.startsWith(strapi.plugin('graphql')?.config('endpoint', '/graphql'))) {
    await next();
    return;
  }

  const isGet = method === 'GET';
  if (!isGet && method !== 'POST') {
    await next();
    return;
  }

  const { cacheHeaders, cacheHeadersDenyList, cacheHeadersAllowList, cacheAuthorizedRequests } =
    getCacheHeaderConfig();
  const authorizationHeader = ctx.request.headers['authorization'];

  if (authorizationHeader && !cacheAuthorizedRequests) {
    loggy.info('Authorized request bypassing GraphQL cache');
    await next();
    return;
  }

  const cacheControlHeader = ctx.request.headers['cache-control'];
  const noCache = cacheControlHeader && cacheControlHeader.includes('no-cache');

  if (noCache) {
    await next();
    return;
  }

  const keyGenerator = strapi.plugin('strapi-cache').config('keyGenerator') as
    CacheKeyGenerator | undefined;
  let body: string;

  if (isGet) {
    const { query, variables, operationName } = ctx.request.query;
    body = JSON.stringify({
      query: query ?? '',
      variables: variables ?? '',
      operationName: operationName ?? '',
    });
  } else {
    const originalReq = ctx.req;
    const bodyBuffer = await rawBody(originalReq);
    body = bodyBuffer.toString();

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
  }

  const payload = parseGraphqlPayload(body, isGet);
  const rootFields = getRootFieldsFromQuery(payload.query);
  const graphqlKey = generateGraphqlCacheKey(body, isGet ? 'GET' : 'POST', rootFields, strapi);
  ctx.rootFields = rootFields.length ? rootFields : undefined;
  ctx.operationName = payload.operationName;
  const key = resolveGraphqlCacheKey(ctx, graphqlKey, keyGenerator);
  loggy.info(
    `GraphQL request: ${JSON.stringify({
      operationName: payload.operationName,
      variables: payload.variables,
      rootFields: rootFields.length ? rootFields : undefined,
    })}`
  );

  const isIntrospectionQuery = body.includes('IntrospectionQuery');
  if (isIntrospectionQuery) {
    loggy.info('Skipping cache for introspection query');
    await next();
    return;
  }
  const cacheService = strapi.plugin('strapi-cache').services.service as CacheService;
  const cacheStore = cacheService.getCacheInstance();
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

  const shouldCache =
    (ctx.method === 'POST' || ctx.method === 'GET') &&
    ctx.status === 200 &&
    url.startsWith(strapi.plugin('graphql')?.config('endpoint', '/graphql'));

  if (shouldCache) {
    loggy.info(`MISS with key: ${key}`);
    if (corsConfig) applyCorsHeaders(ctx, corsConfig, corsOrigin);
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
