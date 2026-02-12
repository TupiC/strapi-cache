import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RedisCacheProvider } from '../../server/src/services/redis/provider';
import type { Core } from '@strapi/strapi';
import type { Redis, ChainableCommander } from 'ioredis';

// Mock logger
vi.mock('../../server/src/utils/log', () => ({
  loggy: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock ioredis
vi.mock('ioredis', () => {
  const mockPipeline = {
    del: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  };

  const Redis = vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    pipeline: vi.fn().mockReturnValue(mockPipeline),
    on: vi.fn(),
    quit: vi.fn(),
  }));

  Redis.Cluster = vi.fn();

  return { Redis, Cluster: Redis.Cluster };
});

describe('RedisCacheProvider', () => {
  let provider: RedisCacheProvider;
  let mockStrapi: Pick<Core.Strapi, 'plugin'>;
  let mockClient: Pick<Redis, 'get' | 'set' | 'del' | 'keys' | 'pipeline' | 'on' | 'quit'>;
  let mockPipeline: Pick<ChainableCommander, 'del' | 'exec'>;

  beforeEach(() => {
    mockPipeline = {
      del: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };

    mockClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      keys: vi.fn(),
      pipeline: vi.fn().mockReturnValue(mockPipeline),
      on: vi.fn(),
      quit: vi.fn(),
    };

    mockStrapi = {
      plugin: vi.fn().mockReturnValue({
        config: vi.fn((key: string) => {
          if (key === 'redisConfig') return { keyPrefix: 'test-prefix:' };
          if (key === 'cacheGetTimeoutInMs') return 1000;
          if (key === 'redisClusterNodes') return [];
          return undefined;
        }),
      }),
    };

    // Create provider with mock strapi
    provider = new RedisCacheProvider(mockStrapi);

    // Replace the client with mock and set initialized
    (provider as any).client = mockClient;
    (provider as any).initialized = true;
    (provider as any).keyPrefix = 'test-prefix:';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('delAll', () => {
    it('should delete keys using Redis pipeline and strip prefixes', async () => {
      await provider.delAll([
        'test-prefix:key1',
        'test-prefix:articles/123',
        'test-prefix:GET:/api/articles?populate=*',
      ]);

      expect(mockClient.pipeline).toHaveBeenCalledOnce();
      expect(mockPipeline.del).toHaveBeenCalledTimes(3);
      expect(mockPipeline.del).toHaveBeenCalledWith('key1');
      expect(mockPipeline.del).toHaveBeenCalledWith('articles/123');
      expect(mockPipeline.del).toHaveBeenCalledWith('GET:/api/articles?populate=*');
      expect(mockPipeline.exec).toHaveBeenCalledOnce();
    });

    it('should handle edge cases (empty array)', async () => {
      await provider.delAll([]);

      expect(mockClient.pipeline).toHaveBeenCalledOnce();
      expect(mockPipeline.del).not.toHaveBeenCalled();
      expect(mockPipeline.exec).toHaveBeenCalledOnce();
    });

    it('should handle large batches efficiently', async () => {
      const keys = Array.from({ length: 1000 }, (_, i) => `test-prefix:key${i}`);
      await provider.delAll(keys);

      expect(mockClient.pipeline).toHaveBeenCalledOnce();
      expect(mockPipeline.del).toHaveBeenCalledTimes(1000);
      expect(mockPipeline.exec).toHaveBeenCalledOnce();
    });

    it('should propagate pipeline errors', async () => {
      mockPipeline.exec.mockRejectedValue(new Error('Pipeline failed'));

      await expect(provider.delAll(['test-prefix:key1'])).rejects.toThrow('Pipeline failed');
    });
  });

  describe('clearByRegexp - integration with delAll', () => {
    it('should filter matching keys and use delAll for batch deletion', async () => {
      provider.keys = vi.fn().mockResolvedValue([
        'test-prefix:GET:/api/articles',
        'test-prefix:GET:/api/articles/123',
        'test-prefix:GET:/api/users',
      ]);
      const delAllSpy = vi.spyOn(provider, 'delAll');

      await provider.clearByRegexp([/\/api\/articles/]);

      expect(delAllSpy).toHaveBeenCalledWith([
        'test-prefix:GET:/api/articles',
        'test-prefix:GET:/api/articles/123',
      ]);
      expect(mockClient.pipeline).toHaveBeenCalled();
    });

    it('should handle edge cases (no matching keys, null response)', async () => {
      const delAllSpy = vi.spyOn(provider, 'delAll');

      // No matching keys
      provider.keys = vi.fn().mockResolvedValue(['test-prefix:GET:/api/users']);
      await provider.clearByRegexp([/\/api\/articles/]);
      expect(delAllSpy).toHaveBeenCalledWith([]);

      // Null response
      provider.keys = vi.fn().mockResolvedValue(null);
      await provider.clearByRegexp([/\/api\/articles/]);
      expect(delAllSpy).toHaveBeenCalledTimes(1); // Only called once (not twice)
    });
  });
});
