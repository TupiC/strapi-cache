import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Context } from 'koa';
import cacheMiddleware from '../../server/src/middlewares/cache';

describe('cache middleware', () => {
  const mockCacheStore = {
    get: vi.fn(),
    set: vi.fn(),
  };

  const keyGenerator = vi.fn((ctx: Context) => `custom:${ctx.request.method}:${ctx.request.url}`);

  const pluginConfig = vi.fn((key: string) => {
    switch (key) {
      case 'cacheableEntities':
        return undefined;
      case 'cacheableRoutes':
        return [];
      case 'excludeRoutes':
        return [];
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
    plugin: vi.fn().mockReturnValue({
      services: {
        service: {
          getCacheInstance: () => mockCacheStore,
        },
      },
      config: pluginConfig,
    }),
    config: {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === 'api.rest.prefix') {
          return '/api';
        }
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

  it('uses configured keyGenerator for cache lookup', async () => {
    const ctx = {
      request: {
        url: '/api/articles?populate=*',
        method: 'GET',
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

    await cacheMiddleware(ctx, next);

    expect(keyGenerator).toHaveBeenCalledWith(ctx, 'GET:/api/articles?populate=*');
    expect(mockCacheStore.get).toHaveBeenCalledWith('custom:GET:/api/articles?populate=*');
    expect(next).not.toHaveBeenCalled();
  });
});
