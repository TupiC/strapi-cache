import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invalidateCache, invalidateGraphqlCache } from '../../server/src/utils/invalidateCache';
import type { CacheProvider } from '../../server/src/types/cache.types';
import type { Core } from '@strapi/strapi';

// Mock the logger
vi.mock('../../server/src/utils/log', () => ({
  loggy: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import the mocked logger
import { loggy } from '../../server/src/utils/log';

describe('invalidateCache', () => {
  let mockCacheStore: Pick<CacheProvider, 'clearByRegexp'>;
  let mockStrapi: Pick<Core.Strapi, 'config' | 'contentType' | 'plugin'>;

  beforeEach(() => {
    mockCacheStore = {
      clearByRegexp: vi.fn().mockResolvedValue(undefined),
    };

    mockStrapi = {
      config: {
        get: vi.fn(),
      },
      contentType: vi.fn(),
      plugin: vi.fn().mockReturnValue({
        config: vi.fn().mockReturnValue([]),
      }),
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should invalidate cache for collection type content', async () => {
    const event = {
      model: {
        uid: 'api::article.article',
      },
    };

    const contentType = {
      kind: 'collectionType',
      info: {
        pluralName: 'articles',
      },
    };

    mockStrapi.config.get.mockReturnValue('/api');
    mockStrapi.contentType.mockReturnValue(contentType);

    await invalidateCache(event, mockCacheStore, mockStrapi);

    expect(mockStrapi.config.get).toHaveBeenCalledWith('api.rest.prefix', '/api');
    expect(mockStrapi.contentType).toHaveBeenCalledWith('api::article.article');
    expect(mockCacheStore.clearByRegexp).toHaveBeenCalledWith([
      /^.*:\/api\/articles(\/.*)?(\?.*)?$/,
    ]);
    expect(loggy.info).toHaveBeenCalledWith('Invalidated cache for /api/articles');
  });

  it('should invalidate cache for single type content', async () => {
    const event = {
      model: {
        uid: 'api::homepage.homepage',
      },
    };

    const contentType = {
      kind: 'singleType',
      info: {
        singularName: 'homepage',
      },
    };

    mockStrapi.config.get.mockReturnValue('/api');
    mockStrapi.contentType.mockReturnValue(contentType);

    await invalidateCache(event, mockCacheStore, mockStrapi);

    expect(mockCacheStore.clearByRegexp).toHaveBeenCalledWith([
      /^.*:\/api\/homepage(\/.*)?(\?.*)?$/,
    ]);
    expect(loggy.info).toHaveBeenCalledWith('Invalidated cache for /api/homepage');
  });

  it('should use custom REST API prefix', async () => {
    const event = {
      model: {
        uid: 'api::article.article',
      },
    };

    const contentType = {
      kind: 'collectionType',
      info: {
        pluralName: 'articles',
      },
    };

    mockStrapi.config.get.mockReturnValue('/custom-api');
    mockStrapi.contentType.mockReturnValue(contentType);

    await invalidateCache(event, mockCacheStore, mockStrapi);

    expect(mockCacheStore.clearByRegexp).toHaveBeenCalledWith([
      /^.*:\/custom-api\/articles(\/.*)?(\?.*)?$/,
    ]);
    expect(loggy.info).toHaveBeenCalledWith('Invalidated cache for /custom-api/articles');
  });

  it('should handle content type not found', async () => {
    const event = {
      model: {
        uid: 'api::nonexistent.nonexistent',
      },
    };

    mockStrapi.config.get.mockReturnValue('/api');
    mockStrapi.contentType.mockReturnValue(null);

    await invalidateCache(event, mockCacheStore, mockStrapi);

    expect(mockStrapi.contentType).toHaveBeenCalledWith('api::nonexistent.nonexistent');
    expect(mockCacheStore.clearByRegexp).not.toHaveBeenCalled();
    expect(loggy.info).toHaveBeenCalledWith('Content type api::nonexistent.nonexistent not found');
  });

  it('should handle content type without kind', async () => {
    const event = {
      model: {
        uid: 'api::article.article',
      },
    };

    const contentType = {
      info: {
        pluralName: 'articles',
      },
      // kind is missing
    };

    mockStrapi.config.get.mockReturnValue('/api');
    mockStrapi.contentType.mockReturnValue(contentType);

    await invalidateCache(event, mockCacheStore, mockStrapi);

    expect(mockCacheStore.clearByRegexp).not.toHaveBeenCalled();
    expect(loggy.info).toHaveBeenCalledWith('Content type api::article.article not found');
  });

  it('should handle cache store errors gracefully', async () => {
    const event = {
      model: {
        uid: 'api::article.article',
      },
    };

    const contentType = {
      kind: 'collectionType',
      info: {
        pluralName: 'articles',
      },
    };

    const error = new Error('Cache store error');
    mockStrapi.config.get.mockReturnValue('/api');
    mockStrapi.contentType.mockReturnValue(contentType);
    mockCacheStore.clearByRegexp.mockRejectedValue(error);

    await invalidateCache(event, mockCacheStore, mockStrapi);

    expect(mockCacheStore.clearByRegexp).toHaveBeenCalled();
    expect(loggy.error).toHaveBeenCalledWith('Cache invalidation error:');
    expect(loggy.error).toHaveBeenCalledWith(error);
  });

  it('should throw error for malformed event without model', async () => {
    const event = {
      // model is missing
    };

    mockStrapi.config.get.mockReturnValue('/api');

    await expect(invalidateCache(event, mockCacheStore, mockStrapi)).rejects.toThrow();

    expect(mockCacheStore.clearByRegexp).not.toHaveBeenCalled();
    expect(loggy.info).not.toHaveBeenCalled();
  });

  it('should skip invalidation when entity is not in cacheableEntities list', async () => {
    const event = {
      model: {
        uid: 'api::article.article',
        tableName: 'articles',
      },
    };

    const contentType = {
      kind: 'collectionType',
      info: {
        pluralName: 'articles',
      },
    };

    mockStrapi.config.get.mockReturnValue('/api');
    mockStrapi.contentType.mockReturnValue(contentType);
    mockStrapi.plugin.mockReturnValue({
      config: vi.fn().mockReturnValue(['users', 'products']), // articles not in list
    });

    await invalidateCache(event, mockCacheStore, mockStrapi);

    expect(mockCacheStore.clearByRegexp).not.toHaveBeenCalled();
    expect(loggy.info).toHaveBeenCalledWith('Not invalidated. articles is not cacheable.');
  });

  it('should invalidate cache when entity is in cacheableEntities list', async () => {
    const event = {
      model: {
        uid: 'api::article.article',
        tableName: 'articles',
      },
    };

    const contentType = {
      kind: 'collectionType',
      info: {
        pluralName: 'articles',
      },
    };

    mockStrapi.config.get.mockReturnValue('/api');
    mockStrapi.contentType.mockReturnValue(contentType);
    mockStrapi.plugin.mockReturnValue({
      config: vi.fn().mockReturnValue(['articles', 'users']), // articles is in list
    });

    await invalidateCache(event, mockCacheStore, mockStrapi);
    expect(mockCacheStore.clearByRegexp).toHaveBeenCalledWith([
      /^.*:\/api\/articles(\/.*)?(\?.*)?$/,
    ]);
    expect(loggy.info).toHaveBeenCalledWith('Invalidated cache for /api/articles');
  });

  it('should invalidate all entities when cacheableEntities is not configured (defaults to all cacheable)', async () => {
    const event = {
      model: {
        uid: 'api::article.article',
        tableName: 'articles',
      },
    };

    const contentType = {
      kind: 'collectionType',
      info: {
        pluralName: 'articles',
      },
    };

    mockStrapi.config.get.mockReturnValue('/api');
    mockStrapi.contentType.mockReturnValue(contentType);
    mockStrapi.plugin.mockReturnValue({
      config: vi.fn().mockReturnValue(null), // null/falsy means all entities are cacheable
    });

    await invalidateCache(event, mockCacheStore, mockStrapi);

    expect(mockCacheStore.clearByRegexp).toHaveBeenCalledWith([
      /^.*:\/api\/articles(\/.*)?(\?.*)?$/,
    ]);
    expect(loggy.info).toHaveBeenCalledWith('Invalidated cache for /api/articles');
  });
});

describe('invalidateGraphqlCache', () => {
  let mockCacheStore: Pick<CacheProvider, 'clearByRegexp'>;
  let mockStrapi: Pick<Core.Strapi, 'contentType'>;

  beforeEach(() => {
    mockCacheStore = {
      clearByRegexp: vi.fn().mockResolvedValue(undefined),
    };

    mockStrapi = {
      contentType: vi.fn(),
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should invalidate GraphQL cache for specific collection only', async () => {
    const event = { model: { uid: 'api::article.article' } };
    mockStrapi.contentType.mockReturnValue({
      info: { singularName: 'article', pluralName: 'articles' },
    });

    await invalidateGraphqlCache(event, mockCacheStore, mockStrapi);

    expect(mockCacheStore.clearByRegexp).toHaveBeenCalledWith([
      /^(GET|POST):\/graphql:[^:]*\b(article|articles)\b[^:]*:/,
    ]);
    expect(loggy.info).toHaveBeenCalledWith(
      'Invalidated GraphQL cache for api::article.article (article, articles)'
    );
  });

  it('should purge all GraphQL cache when content type not found', async () => {
    const event = { model: { uid: 'api::unknown.unknown' } };
    mockStrapi.contentType.mockReturnValue(null);

    await invalidateGraphqlCache(event, mockCacheStore, mockStrapi);

    expect(mockCacheStore.clearByRegexp).toHaveBeenCalledWith([/^(GET|POST):\/graphql:.*/]);
    expect(loggy.info).toHaveBeenCalledWith(
      'Content type api::unknown.unknown not found, purging all GraphQL cache'
    );
  });

  it('should handle cache store errors gracefully', async () => {
    const event = { model: { uid: 'api::article.article' } };
    mockStrapi.contentType.mockReturnValue({
      info: { singularName: 'article', pluralName: 'articles' },
    });
    const error = new Error('GraphQL cache store error');
    mockCacheStore.clearByRegexp.mockRejectedValue(error);

    await invalidateGraphqlCache(event, mockCacheStore, mockStrapi);

    expect(mockCacheStore.clearByRegexp).toHaveBeenCalled();
    expect(loggy.error).toHaveBeenCalledWith('GraphQL cache invalidation error:');
    expect(loggy.error).toHaveBeenCalledWith(error);
  });

  it('should create regex that matches GraphQL cache keys with root fields', () => {
    const regex = /^(GET|POST):\/graphql:[^:]*\b(article|articles)\b[^:]*:/;

    expect(regex.test('POST:/graphql:article,category:abc123')).toBe(true);
    expect(regex.test('POST:/graphql:articles:xyz')).toBe(true);
    expect(regex.test('GET:/graphql:article:hash')).toBe(true);
    expect(regex.test('POST:/graphql:category,author:hash')).toBe(false);
    expect(regex.test('POST:/api/articles')).toBe(false);
  });
});
