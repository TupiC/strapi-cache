import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invalidateCache, invalidateGraphqlCache } from '../../server/src/utils/invalidateCache';

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
  let mockCacheStore: any;
  let mockStrapi: any;

  beforeEach(() => {
    mockCacheStore = {
      clearByRegexp: vi.fn().mockResolvedValue(undefined),
    };

    mockStrapi = {
      config: {
        get: vi.fn(),
      },
      contentType: vi.fn(),
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
});

describe('invalidateGraphqlCache', () => {
  let mockCacheStore: any;

  beforeEach(() => {
    mockCacheStore = {
      clearByRegexp: vi.fn().mockResolvedValue(undefined),
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should invalidate GraphQL cache with correct regex', async () => {
    await invalidateGraphqlCache(mockCacheStore);

    expect(mockCacheStore.clearByRegexp).toHaveBeenCalledWith([/^POST:\/graphql(:.*)?$/]);
    expect(loggy.info).toHaveBeenCalledWith('Invalidated cache for /^POST:\\/graphql(:.*)?$/');
  });

  it('should handle cache store errors gracefully', async () => {
    const error = new Error('GraphQL cache store error');
    mockCacheStore.clearByRegexp.mockRejectedValue(error);

    await invalidateGraphqlCache(mockCacheStore);

    expect(mockCacheStore.clearByRegexp).toHaveBeenCalledWith([/^POST:\/graphql(:.*)?$/]);
    expect(loggy.error).toHaveBeenCalledWith('Cache invalidation error:');
    expect(loggy.error).toHaveBeenCalledWith(error);
  });

  it('should create regex that matches GraphQL cache keys', () => {
    const regex = /^POST:\/graphql(:.*)?$/;

    expect(regex.test('POST:/graphql:abc123')).toBe(true);
    expect(regex.test('POST:/graphql')).toBe(true);
    expect(regex.test('GET:/graphql')).toBe(false);
    expect(regex.test('POST:/api/articles')).toBe(false);
  });
});
