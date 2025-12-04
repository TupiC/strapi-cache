import { createHash } from 'crypto';
import { Context } from 'koa';

export const generateCacheKey = (context: Context) => {
  const { url } = context.request;
  const { method } = context.request;

  return `${method}:${url}`;
};

export const generateGraphqlCacheKey = (payload: string) => {
  const hash = createHash('sha256').update(payload).digest('base64url');
  return `POST:/graphql:${hash}`;
};

export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
