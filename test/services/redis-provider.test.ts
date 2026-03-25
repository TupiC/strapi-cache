import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { RedisCacheProvider } from '../../server/src/services/redis/provider';
import type { Core } from '@strapi/strapi';
import type { ChainableCommander } from 'ioredis';

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
  const Redis = vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    pipeline: vi.fn(),
    scanStream: vi.fn(),
    on: vi.fn(),
    quit: vi.fn(),
  }));

  Redis.Cluster = vi.fn();

  return { Redis, Cluster: Redis.Cluster };
});

function createMockStream() {
  return Object.assign(new EventEmitter(), {
    pause: vi.fn(),
    resume: vi.fn(),
  });
}

// Flush all pending microtasks and macrotasks
function flushAsync() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('RedisCacheProvider', () => {
  let provider: RedisCacheProvider;
  let mockStrapi: Pick<Core.Strapi, 'plugin'>;
  let mockClient: InstanceType<typeof Redis>;
  let mockPipeline: Pick<ChainableCommander, 'del' | 'exec'>;

  beforeEach(() => {
    mockPipeline = {
      del: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };

    // Use Object.create to ensure instanceof Redis passes in clearByRegexp
    mockClient = Object.create((Redis as any).prototype);
    Object.assign(mockClient, {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      keys: vi.fn(),
      pipeline: vi.fn().mockReturnValue(mockPipeline),
      scanStream: vi.fn(),
      on: vi.fn(),
      quit: vi.fn(),
    });

    mockStrapi = {
      plugin: vi.fn().mockReturnValue({
        config: vi.fn((key: string) => {
          if (key === 'redisConfig') return { keyPrefix: 'test-prefix:' };
          if (key === 'cacheGetTimeoutInMs') return 1000;
          if (key === 'redisClusterNodes') return [];
          if (key === 'redisScanDeleteCount') return 100;
          return undefined;
        }),
      }),
    };

    provider = new RedisCacheProvider(mockStrapi);

    (provider as any).client = mockClient;
    (provider as any).initialized = true;
    (provider as any).keyPrefix = 'test-prefix:';
    (provider as any).redisScanDeleteCount = 100;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('clearByRegexp', () => {
    it('should call scanStream with correct match and count params', async () => {
      const stream = createMockStream();
      (mockClient.scanStream as ReturnType<typeof vi.fn>).mockReturnValue(stream);

      const promise = provider.clearByRegexp([/\/api\/articles/]);
      stream.emit('end');
      await promise;

      expect(mockClient.scanStream).toHaveBeenCalledWith({ match: 'test-prefix:*', count: 100 });
    });

    it('should filter matching keys and delete via pipeline', async () => {
      const stream = createMockStream();
      (mockClient.scanStream as ReturnType<typeof vi.fn>).mockReturnValue(stream);

      const promise = provider.clearByRegexp([/\/api\/articles/]);

      stream.emit('data', ['test-prefix:GET:/api/articles', 'test-prefix:GET:/api/users']);
      await flushAsync();
      stream.emit('end');
      await promise;

      expect(mockClient.pipeline).toHaveBeenCalledOnce();
      expect(mockPipeline.del).toHaveBeenCalledOnce();
      expect(mockPipeline.del).toHaveBeenCalledWith('GET:/api/articles');
      expect(mockPipeline.exec).toHaveBeenCalledOnce();
    });

    it('should skip pipeline when no keys in batch match', async () => {
      const stream = createMockStream();
      (mockClient.scanStream as ReturnType<typeof vi.fn>).mockReturnValue(stream);

      const promise = provider.clearByRegexp([/\/api\/articles/]);

      stream.emit('data', ['test-prefix:GET:/api/users', 'test-prefix:GET:/api/products']);
      await flushAsync();
      stream.emit('end');
      await promise;

      expect(mockClient.pipeline).not.toHaveBeenCalled();
      expect(mockPipeline.del).not.toHaveBeenCalled();
    });

    it('should pause and resume stream around each batch', async () => {
      const stream = createMockStream();
      (mockClient.scanStream as ReturnType<typeof vi.fn>).mockReturnValue(stream);

      const promise = provider.clearByRegexp([/\/api\/articles/]);

      stream.emit('data', ['test-prefix:GET:/api/articles/1']);
      expect(stream.pause).toHaveBeenCalledTimes(1);
      await flushAsync();
      expect(stream.resume).toHaveBeenCalledTimes(1);

      stream.emit('data', ['test-prefix:GET:/api/articles/2']);
      expect(stream.pause).toHaveBeenCalledTimes(2);
      await flushAsync();
      expect(stream.resume).toHaveBeenCalledTimes(2);

      stream.emit('end');
      await promise;

      expect(mockPipeline.del).toHaveBeenCalledTimes(2);
      expect(mockPipeline.del).toHaveBeenCalledWith('GET:/api/articles/1');
      expect(mockPipeline.del).toHaveBeenCalledWith('GET:/api/articles/2');
    });

    it('should strip keyPrefix before calling pipeline.del', async () => {
      const stream = createMockStream();
      (mockClient.scanStream as ReturnType<typeof vi.fn>).mockReturnValue(stream);

      const promise = provider.clearByRegexp([/some\/key/]);

      stream.emit('data', ['test-prefix:some/key']);
      await flushAsync();
      stream.emit('end');
      await promise;

      expect(mockPipeline.del).toHaveBeenCalledWith('some/key');
    });

    it('should pass key unchanged when it does not start with keyPrefix', async () => {
      const stream = createMockStream();
      (mockClient.scanStream as ReturnType<typeof vi.fn>).mockReturnValue(stream);

      const promise = provider.clearByRegexp([/bare-key/]);

      stream.emit('data', ['bare-key']);
      await flushAsync();
      stream.emit('end');
      await promise;

      expect(mockPipeline.del).toHaveBeenCalledWith('bare-key');
    });

    it('should reject when stream emits an error', async () => {
      const stream = createMockStream();
      (mockClient.scanStream as ReturnType<typeof vi.fn>).mockReturnValue(stream);

      const promise = provider.clearByRegexp([/\/api\/articles/]);
      stream.emit('error', new Error('scan failed'));

      await expect(promise).rejects.toThrow('scan failed');
    });

    it('should iterate master nodes in cluster mode', async () => {
      const nodePipeline1 = { del: vi.fn().mockReturnThis(), exec: vi.fn().mockResolvedValue([]) };
      const nodePipeline2 = { del: vi.fn().mockReturnThis(), exec: vi.fn().mockResolvedValue([]) };
      const nodeStream1 = createMockStream();
      const nodeStream2 = createMockStream();

      const mockCluster = {
        nodes: vi.fn().mockReturnValue([
          { scanStream: vi.fn().mockReturnValue(nodeStream1), pipeline: vi.fn().mockReturnValue(nodePipeline1) },
          { scanStream: vi.fn().mockReturnValue(nodeStream2), pipeline: vi.fn().mockReturnValue(nodePipeline2) },
        ]),
      };

      (provider as any).client = mockCluster;

      const promise = provider.clearByRegexp([/\/api\/articles/]);

      nodeStream1.emit('data', ['test-prefix:GET:/api/articles/1']);
      nodeStream2.emit('data', ['test-prefix:GET:/api/articles/2']);
      await flushAsync();
      nodeStream1.emit('end');
      nodeStream2.emit('end');
      await promise;

      expect(mockCluster.nodes).toHaveBeenCalledWith('master');
      expect(nodePipeline1.del).toHaveBeenCalledWith('GET:/api/articles/1');
      expect(nodePipeline2.del).toHaveBeenCalledWith('GET:/api/articles/2');
    });
  });
});
