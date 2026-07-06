import { Core } from '@strapi/strapi';
import { createHash } from 'crypto';
import { Context } from 'koa';

export type CacheKeyGenerator = (context: Context, defaultKey?: string) => string;

export const getCustomCacheKey = (
  context: Context,
  keyGenerator?: CacheKeyGenerator,
  fallbackKey?: string
) => {
  if (typeof keyGenerator !== 'function') {
    return undefined;
  }

  const customKey = keyGenerator(context, fallbackKey);
  if (typeof customKey === 'string') {
    return customKey;
  }

  return undefined;
};

export const resolveGraphqlCacheKey = (
  context: Context,
  fallbackKey: string,
  keyGenerator?: CacheKeyGenerator
) => getCustomCacheKey(context, keyGenerator, fallbackKey) ?? fallbackKey;

export const generateCacheKey = (context: Context, keyGenerator?: CacheKeyGenerator) => {
  const { url } = context.request;
  const { method } = context.request;

  const customKey = getCustomCacheKey(context, keyGenerator, `${method}:${url}`);
  if (customKey !== undefined) {
    return customKey;
  }

  return `${method}:${url}`;
};

export const generateGraphqlCacheKey = (
  payload: string,
  method: 'GET' | 'POST' = 'POST',
  rootFields: string[] = [],
  strapi?: Core.Strapi
) => {
  const hash = createHash('sha256').update(payload).digest('base64url');
  const rootFieldsSegment =
    rootFields.length > 0 ? [...rootFields].sort((a, b) => a.localeCompare(b)).join(',') : '_';
  return `${method}:${strapi?.plugin('graphql')?.config('endpoint', '/graphql') ?? '/graphql'}:${rootFieldsSegment}:${hash}`;
};

export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const generateEntityKey = (url: string, restApiPrefix: string): string => {
  const regex = new RegExp(`${restApiPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([^/?]*)`);
  const match = url.match(regex);
  return match ? match[1] : '';
};
