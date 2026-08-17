import { Context } from 'koa';
import { OutgoingHttpHeaders } from 'http';

const encodedBodyHeaders = new Set([
  'content-encoding',
  'content-length',
  'content-md5',
  'content-range',
  'digest',
  'etag',
  'transfer-encoding',
]);

export function getHeadersToStore(
  ctx: Context,
  cacheHeaders: boolean,
  cacheHeadersAllowList: string[] = [],
  cacheHeadersDenyList: string[] = []
): OutgoingHttpHeaders | null {
  let headersToStore: OutgoingHttpHeaders | null = null;

  if (cacheHeaders) {
    let headers = ctx.response.headers;

    if (cacheHeadersAllowList.length) {
      headers = Object.fromEntries(
        Object.entries(headers).filter(([key]) => cacheHeadersAllowList.includes(key.toLowerCase()))
      );
    }

    if (cacheHeadersDenyList.length) {
      headers = Object.fromEntries(
        Object.entries(headers).filter(([key]) => !cacheHeadersDenyList.includes(key.toLowerCase()))
      );
    }

    headersToStore = headers;
  }

  return headersToStore;
}

export function getHeadersForUncompressedBody(
  headers: OutgoingHttpHeaders | null
): OutgoingHttpHeaders | null {
  if (!headers) return null;

  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => !encodedBodyHeaders.has(key.toLowerCase()))
  );
}

export function getCacheHeaderConfig() {
  const cacheHeaders = strapi.plugin('strapi-cache').config('cacheHeaders') as boolean;
  const cacheHeadersDenyList = strapi
    .plugin('strapi-cache')
    .config('cacheHeadersDenyList') as string[];
  const cacheHeadersAllowList = strapi
    .plugin('strapi-cache')
    .config('cacheHeadersAllowList') as string[];
  const cacheAuthorizedRequests = strapi
    .plugin('strapi-cache')
    .config('cacheAuthorizedRequests') as boolean;

  return {
    cacheHeaders,
    cacheHeadersDenyList,
    cacheHeadersAllowList,
    cacheAuthorizedRequests,
  };
}
