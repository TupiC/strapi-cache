import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Context } from 'koa';
import cacheMiddleware from '../../server/src/middlewares/cache';

describe('cache middleware', () => {
  const mockCacheStore = {
    get: vi.fn(),
    set: vi.fn(),
  };
  const getCacheInstance = vi.fn(() => mockCacheStore);

  const keyGenerator = vi.fn((ctx: Context) => `custom:${ctx.request.method}:${ctx.request.url}`);
  let cacheableRoutes: string[] = [];
  let excludeRoutes: string[] = [];
  let cacheAuthorizedRequests = false;

  const pluginConfig = vi.fn((key: string) => {
    switch (key) {
      case 'cacheableEntities':
        return undefined;
      case 'cacheableRoutes':
        return cacheableRoutes;
      case 'excludeRoutes':
        return excludeRoutes;
      case 'keyGenerator':
        return keyGenerator;
      case 'cacheHeaders':
        return false;
      case 'cacheHeadersDenyList':
        return [];
      case 'cacheHeadersAllowList':
        return [];
      case 'cacheAuthorizedRequests':
        return cacheAuthorizedRequests;
      default:
        return undefined;
    }
  });

  const mockStrapi = {
    plugin: vi.fn().mockReturnValue({
      services: {
        service: {
          getCacheInstance,
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
    cacheableRoutes = [];
    excludeRoutes = [];
    cacheAuthorizedRequests = false;
    mockCacheStore.get.mockResolvedValue({
      body: { cached: true },
      headers: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createContext = ({
    url = '/api/articles',
    method = 'GET',
    headers = {},
    status = 200,
    body,
  }: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    status?: number;
    body?: unknown;
  } = {}) =>
    ({
      request: { url, method, headers },
      method,
      response: { headers: {} },
      set: vi.fn(),
      status,
      body,
    }) as unknown as Context;

  it('uses configured keyGenerator for cache lookup', async () => {
    const ctx = createContext({ url: '/api/articles?populate=*' });

    const next = vi.fn();

    await cacheMiddleware(ctx, next);

    expect(keyGenerator).toHaveBeenCalledWith(ctx, 'GET:/api/articles?populate=*');
    expect(mockCacheStore.get).toHaveBeenCalledWith('custom:GET:/api/articles?populate=*');
    expect(next).not.toHaveBeenCalled();
  });

  it('bypasses the cache before lookup for non-GET requests', async () => {
    const ctx = createContext({ method: 'POST' });
    const next = vi.fn();

    await cacheMiddleware(ctx, next);

    expect(getCacheInstance).not.toHaveBeenCalled();
    expect(mockCacheStore.get).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('bypasses excluded routes before lookup', async () => {
    excludeRoutes = ['/api/private'];
    const ctx = createContext({ url: '/api/private/profile' });
    const next = vi.fn();

    await cacheMiddleware(ctx, next);

    expect(getCacheInstance).not.toHaveBeenCalled();
    expect(mockCacheStore.get).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('bypasses non-cacheable routes before lookup', async () => {
    cacheableRoutes = ['/api/products'];
    const ctx = createContext({ url: '/api/articles' });
    const next = vi.fn();

    await cacheMiddleware(ctx, next);

    expect(getCacheInstance).not.toHaveBeenCalled();
    expect(mockCacheStore.get).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('bypasses authorized requests before lookup', async () => {
    const ctx = createContext({ headers: { authorization: 'Bearer token' } });
    const next = vi.fn();

    await cacheMiddleware(ctx, next);

    expect(getCacheInstance).not.toHaveBeenCalled();
    expect(mockCacheStore.get).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('still reads authorized requests when configured to cache them', async () => {
    cacheAuthorizedRequests = true;
    const ctx = createContext({ headers: { authorization: 'Bearer token' } });
    const next = vi.fn();

    await cacheMiddleware(ctx, next);

    expect(mockCacheStore.get).toHaveBeenCalledWith('custom:GET:/api/articles');
    expect(next).not.toHaveBeenCalled();
  });

  it('bypasses no-cache requests before lookup', async () => {
    const ctx = createContext({ headers: { 'cache-control': 'no-cache' } });
    const next = vi.fn();

    await cacheMiddleware(ctx, next);

    expect(getCacheInstance).not.toHaveBeenCalled();
    expect(mockCacheStore.get).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('stores a successful cacheable response after a miss', async () => {
    mockCacheStore.get.mockResolvedValueOnce(null);
    const ctx = createContext();
    const next = vi.fn(async () => {
      ctx.status = 200;
      ctx.body = { data: { articles: [] } };
    });

    await cacheMiddleware(ctx, next);

    expect(next).toHaveBeenCalledOnce();
    expect(mockCacheStore.set).toHaveBeenCalledWith('custom:GET:/api/articles', {
      body: { data: { articles: [] } },
      headers: null,
    });
  });
});
