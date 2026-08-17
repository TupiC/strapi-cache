import { bench, describe, vi } from 'vitest';
import { InMemoryCacheProvider } from '../server/src/services/memory/provider';
import { RedisCacheProvider } from '../server/src/services/redis/provider';
import { generateCacheKey, generateGraphqlCacheKey } from '../server/src/utils/key';

const BENCHMARK_TIME_MS = 500;
const BENCHMARK_WARMUP_MS = 100;
const benchmarkOptions = {
  time: BENCHMARK_TIME_MS,
  warmupTime: BENCHMARK_WARMUP_MS,
};

const largeBody = {
  data: Array.from({ length: 1_000 }, (_, index) => ({
    id: index,
    title: `Article ${index}`,
    content: 'x'.repeat(200),
  })),
};
const largeCacheEntry = {
  body: largeBody,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=60',
  },
};

const createStrapi = (configuration: Record<string, unknown>) => ({
  plugin: () => ({
    config: (key: string) => configuration[key],
  }),
});

vi.stubGlobal('strapi', {
  plugin: () => ({
    config: (key: string) => (key === 'debug' ? false : undefined),
  }),
  log: {
    info: () => undefined,
    error: () => undefined,
    warn: () => undefined,
  },
});

describe('cache hot paths', () => {
  const memoryProvider = new InMemoryCacheProvider(
    createStrapi({
      max: 1_000,
      ttl: 60_000,
      size: 10 * 1024 * 1024,
      allowStale: false,
      cacheGetTimeoutInMs: 1_000,
    }) as any
  );

  memoryProvider.init();
  void memoryProvider.set('GET:/api/articles', largeCacheEntry);

  bench(
    'memory provider: cache hit',
    async () => {
      await memoryProvider.get('GET:/api/articles');
    },
    benchmarkOptions
  );

  bench(
    'memory provider: cache miss',
    async () => {
      await memoryProvider.get('GET:/api/missing');
    },
    benchmarkOptions
  );

  bench(
    'REST cache key generation',
    () => {
      generateCacheKey({
        request: {
          method: 'GET',
          url: '/api/articles?populate[author]=*&pagination[pageSize]=100',
        },
      } as any);
    },
    benchmarkOptions
  );

  bench(
    'GraphQL cache key generation',
    () => {
      generateGraphqlCacheKey(
        JSON.stringify({
          query:
            'query Articles($limit: Int!) { articles(pagination: { limit: $limit }) { documentId title author { name } } }',
          variables: { limit: 100 },
          operationName: 'Articles',
        }),
        'POST',
        ['articles']
      );
    },
    benchmarkOptions
  );
});

const redisUrl = process.env.BENCHMARK_REDIS_URL;

describe.skipIf(!redisUrl)('Redis provider hot paths', () => {
  let redisProvider: RedisCacheProvider;
  const redisBenchmarkOptions = {
    ...benchmarkOptions,
    setup: async () => {
      redisProvider = new RedisCacheProvider(
        createStrapi({
          provider: 'redis',
          redisConfig: redisUrl,
          redisClusterNodes: [],
          redisClusterOptions: {},
          cacheGetTimeoutInMs: 1_000,
          redisScanDeleteCount: 100,
          ttl: 60_000,
        }) as any
      );
      redisProvider.init();
      await redisProvider.set('benchmark:cache-hit', largeCacheEntry);
    },
    teardown: async () => {
      const client = (redisProvider as any).client;
      await client?.del('benchmark:cache-hit');
      await client?.quit();
    },
  };

  bench(
    'Redis provider: cache hit (250 KB)',
    async () => {
      await redisProvider.get('benchmark:cache-hit');
    },
    redisBenchmarkOptions
  );

  bench(
    'Redis provider: cache set (250 KB)',
    async () => {
      await redisProvider.set('benchmark:cache-hit', largeCacheEntry);
    },
    redisBenchmarkOptions
  );
});
