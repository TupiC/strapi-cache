import { Core } from '@strapi/strapi';
import { createHash } from 'crypto';
import { Context } from 'koa';

export type CacheKeyGenerator = (context: Context) => string;

export const getCustomCacheKey = (context: Context, keyGenerator?: CacheKeyGenerator) => {
  if (typeof keyGenerator !== 'function') {
    return undefined;
  }

  const customKey = keyGenerator(context);
  if (typeof customKey === 'string') {
    return customKey;
  }

  return undefined;
};

export const resolveGraphqlCacheKey = (
  context: Context,
  fallbackKey: string,
  keyGenerator?: CacheKeyGenerator,
  withAuth: Boolean = false
) => {
  const customKey = getCustomCacheKey(context, keyGenerator);
  if (customKey !== undefined) {
    if (withAuth) {
      return `${customKey}:withAuth`;
    }
    return customKey;
  }
  return fallbackKey;
};

export const generateCacheKey = (
  context: Context,
  keyGenerator?: CacheKeyGenerator,
  withAuth: Boolean = false
) => {
  const customKey = getCustomCacheKey(context, keyGenerator);
  if (customKey !== undefined) {
    if (withAuth) {
      return `${customKey}:withAuth`;
    }
    return customKey;
  }

  const { url } = context.request;
  const { method } = context.request;

  if (withAuth) {
    return `${method}:${url}:withAuth`;
  }

  return `${method}:${url}`;
};

export const generateGraphqlCacheKey = (
  payload: string,
  method: 'GET' | 'POST' = 'POST',
  rootFields: string[] = [],
  strapi?: Core.Strapi,
  withAuth: Boolean = false
) => {
  const hash = createHash('sha256').update(payload).digest('base64url');
  const rootFieldsSegment =
    rootFields.length > 0 ? [...rootFields].sort((a, b) => a.localeCompare(b)).join(',') : '_';
  return `${method}:${strapi?.plugin('graphql')?.config('endpoint', '/graphql') ?? '/graphql'}:${rootFieldsSegment}:${hash}${withAuth ? ':withAuth' : ''}`;
};

export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const generateEntityKey = (url: string, restApiPrefix: string): string => {
  const regex = new RegExp(`${restApiPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([^/?]*)`);
  const match = url.match(regex);
  return match ? match[1] : '';
};
