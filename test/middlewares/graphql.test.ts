import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Context } from 'koa';
import graphqlMiddleware from '../../server/src/middlewares/graphql';

describe('graphql middleware', () => {
  const mockCacheStore = {
    get: vi.fn(),
    set: vi.fn(),
  };

  const keyGenerator = vi.fn((ctx: Context) => `custom:${ctx.request.method}:${ctx.request.url}`);
  const pluginConfig = vi.fn((key: string) => {
    switch (key) {
      case 'keyGenerator':
        return keyGenerator;
      case 'cacheHeaders':
        return false;
      case 'cacheHeadersDenyList':
        return [];
      case 'cacheHeadersAllowList':
        return [];
      case 'cacheAuthorizedRequests':
        return false;
      default:
        return undefined;
    }
  });

  const mockStrapi = {
    plugin: vi.fn((pluginName: string) => {
      if (pluginName === 'strapi-cache') {
        return {
          services: {
            service: {
              getCacheInstance: () => mockCacheStore,
            },
          },
          config: pluginConfig,
        };
      }
      if (pluginName === 'graphql') {
        return {
          config: vi.fn().mockReturnValue('/graphql'),
        };
      }
      return undefined;
    }),
    config: {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === 'middlewares') {
          return [];
        }
        return defaultValue;
      }),
    },
  };

  vi.stubGlobal('strapi', mockStrapi);

  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheStore.get.mockResolvedValue({
      body: { cached: true },
      headers: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses configured keyGenerator for GraphQL cache lookup', async () => {
    const ctx = {
      request: {
        url: '/graphql?query=%7Barticles%7Bdata%7Bid%7D%7D%7D',
        method: 'GET',
        query: {
          query: '{ articles { data { id } } }',
        },
        headers: {},
      },
      method: 'GET',
      response: {
        headers: {},
      },
      set: vi.fn(),
      status: 200,
      body: undefined,
    } as unknown as Context;

    const next = vi.fn();

    await graphqlMiddleware(ctx, next);

    expect(keyGenerator).toHaveBeenCalledWith(ctx);
    expect(mockCacheStore.get).toHaveBeenCalledWith(
      'custom:GET:/graphql?query=%7Barticles%7Bdata%7Bid%7D%7D%7D'
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('falls back to generated GraphQL key when keyGenerator returns non-string', async () => {
    keyGenerator.mockReturnValueOnce(123 as unknown as string);

    const ctx = {
      request: {
        url: '/graphql?query=%7Barticles%7Bdata%7Bid%7D%7D%7D',
        method: 'GET',
        query: {
          query: '{ articles { data { id } } }',
        },
        headers: {},
      },
      method: 'GET',
      response: {
        headers: {},
      },
      set: vi.fn(),
      status: 200,
      body: undefined,
    } as unknown as Context;

    const next = vi.fn();
    await graphqlMiddleware(ctx, next);

    expect(mockCacheStore.get).toHaveBeenCalledTimes(1);
    expect(mockCacheStore.get.mock.calls[0][0]).toMatch(/^GET:\/graphql:articles:[A-Za-z0-9_-]+$/);
  });

  it('stores only custom GraphQL key when keyGenerator returns custom key', async () => {
    mockCacheStore.get.mockResolvedValueOnce(null);

    const ctx = {
      request: {
        url: '/graphql?query=%7Barticles%7Bdata%7Bid%7D%7D%7D',
        method: 'GET',
        query: {
          query: '{ articles { data { id } } }',
        },
        headers: {},
      },
      method: 'GET',
      response: {
        headers: {},
      },
      set: vi.fn(),
      status: 200,
      body: undefined,
    } as unknown as Context;

    const next = vi.fn(async () => {
      ctx.status = 200;
      ctx.body = { data: { articles: { data: [] } } };
    });

    await graphqlMiddleware(ctx, next);

    expect(mockCacheStore.set).toHaveBeenCalledTimes(1);
    expect(mockCacheStore.set.mock.calls[0][0]).toBe(
      'custom:GET:/graphql?query=%7Barticles%7Bdata%7Bid%7D%7D%7D'
    );
    expect(mockCacheStore.set.mock.calls[0][1]).toEqual({
      body: { data: { articles: { data: [] } } },
      headers: null,
    });
  });
});
