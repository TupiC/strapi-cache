import { Core } from '@strapi/strapi';
import { createHash } from 'crypto';
import { Context } from 'koa';

export const generateCacheKey = (context: Context) => {
  const { url } = context.request;
  const { method } = context.request;

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
    rootFields.length > 0
      ? [...rootFields].sort((a, b) => a.localeCompare(b)).join(',')
      : '_';
  return `${method}:${strapi?.plugin('graphql')?.config('endpoint', '/graphql') ?? '/graphql'}:${rootFieldsSegment}:${hash}`;
};

export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const generateEntityKey = (url: string, restApiPrefix: string): string => {
  const regex = new RegExp(`${restApiPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([^/?]*)`);
  const match = url.match(regex);
  return match ? match[1] : '';
}
