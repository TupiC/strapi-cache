import { bench, describe, vi, type BenchTask } from "vitest";
import { InMemoryCacheProvider } from "../server/src/services/memory/provider";
import { RedisCacheProvider } from "../server/src/services/redis/provider";
import { generateCacheKey, generateGraphqlCacheKey } from "../server/src/utils/key";
import cacheMiddleware from "../server/src/middlewares/cache";
import graphqlMiddleware from "../server/src/middlewares/graphql";
import { createContext, createStrapi, payloads, graphqlPayload, verifyResponse } from "./fixtures";

// Keep at least ten samples in the slowest 1% when reporting p99.
const benchmarkOptions = { time: 2_000, warmupTime: 500, iterations: 1_000 };
const redisUrl = process.env.BENCHMARK_REDIS_URL;
const concurrency = 8;

const createMemoryProvider = () => {
  const provider = new InMemoryCacheProvider(createStrapi() as any);
  provider.init();
  return provider;
};

vi.stubGlobal("strapi", createStrapi());

describe("cache hot paths", () => {
  const provider = createMemoryProvider();
  for (const payload of payloads) {
    const key = `GET:/api/articles/${payload.label}`;
    bench(
      `memory provider: cache hit (${payload.label})`,
      async () => {
        await provider.get(key);
      },
      {
        ...benchmarkOptions,
        setup: async () => {
          await provider.set(key, payload.entry);
          if (!(await provider.get(key))) throw new Error("Memory hit fixture was not cached");
        },
      },
    );
  }
  bench(
    "memory provider: cache miss",
    async () => {
      await provider.get("GET:/api/missing");
    },
    benchmarkOptions,
  );

  const context = createContext("REST");
  bench(
    "REST cache key generation",
    () => {
      generateCacheKey(context);
    },
    benchmarkOptions,
  );
  bench(
    "GraphQL cache key generation",
    () => {
      generateGraphqlCacheKey(graphqlPayload, "POST", ["articles"]);
    },
    benchmarkOptions,
  );
});

describe("complete middleware (memory provider)", () => {
  for (const protocol of ["REST", "GraphQL"] as const) {
    const middleware = protocol === "REST" ? cacheMiddleware : graphqlMiddleware;
    for (const payload of payloads) {
      for (const mode of ["hit", "miss"] as const) {
        let sequence = 0;
        let ctx: ReturnType<typeof createContext>;
        const prepareContext = () => {
          // Unique requests guarantee genuine misses without timing cache deletion.
          ctx = createContext(protocol, mode === "miss" ? ++sequence : 0);
        };
        const run = async (verify = false) => {
          let nextCalled = false;
          await middleware(ctx, async () => {
            if (mode === "hit") throw new Error("Expected middleware cache hit");
            nextCalled = true;
            ctx.status = 200;
            ctx.type = "json";
            ctx.body = payload.body;
          });
          if (nextCalled !== (mode === "miss")) throw new Error("Incorrect middleware path");
          if (verify) {
            verifyResponse(ctx, payload.entry.body);
          }
        };
        bench(
          `${protocol}: cache ${mode} (${payload.label})`,
          async () => {
            await run();
          },
          {
            ...benchmarkOptions,
            setup: async (task: BenchTask) => {
              const provider = createMemoryProvider();
              vi.stubGlobal("strapi", createStrapi(provider));
              sequence = 0;
              if (mode === "hit") {
                const ctx = createContext(protocol);
                await middleware(ctx, async () => {
                  ctx.status = 200;
                  ctx.type = "json";
                  ctx.body = payload.body;
                });
                verifyResponse(ctx, payload.entry.body);
              }
              prepareContext();
              await run(true);
              // Vitest creates the Tinybench task without iteration hooks. Install
              // its public beforeEach hook here, which runs before the sample timer.
              task.opts.beforeEach = prepareContext;
            },
          },
        );
      }
    }
  }
});

describe.skipIf(!redisUrl)("Redis provider hot paths", () => {
  let provider: RedisCacheProvider;
  let keys: string[];
  let cleanup = Promise.resolve();
  const verifyResult = (entry: any, payload: (typeof payloads)[number]) => {
    // Check metadata and length without scanning the full body inside the timer.
    if (
      entry?.bodyType !== "json" ||
      typeof entry.body !== "string" ||
      entry.body.length !== payload.entry.body.length
    ) {
      throw new Error("Redis operation failed or returned an invalid cache entry");
    }
  };
  const optionsFor = (payload: (typeof payloads)[number]) => ({
    ...benchmarkOptions,
    setup: async () => {
      // Tinybench does not await teardown. Wait for it explicitly before reconnecting.
      await cleanup;
      provider = new RedisCacheProvider(createStrapi(undefined, redisUrl) as any);
      provider.init();
      keys = Array.from(
        { length: concurrency },
        (_, index) => `benchmark:${payload.label}:${index}`,
      );
      const writes = await Promise.all(keys.map((key) => provider.set(key, payload.entry)));
      for (const result of writes) verifyResult(result, payload);
      const entries = await Promise.all(keys.map((key) => provider.get(key)));
      if (entries.some((entry) => entry?.body !== payload.entry.body)) {
        throw new Error("Redis fixture was not cached");
      }
    },
    teardown: () => {
      const client = (provider as any).client;
      const keysToDelete = keys;
      cleanup = (async () => {
        try {
          await client.del(...keysToDelete);
        } finally {
          await client.quit();
        }
      })();
      return cleanup;
    },
  });
  for (const payload of payloads) {
    bench(
      `Redis provider: cache hit (${payload.label})`,
      async () => {
        verifyResult(await provider.get(keys[0]), payload);
      },
      optionsFor(payload),
    );
    bench(
      `Redis provider: cache set (${payload.label})`,
      async () => {
        verifyResult(await provider.set(keys[0], payload.entry), payload);
      },
      optionsFor(payload),
    );
    bench(
      `Redis provider: ${concurrency} concurrent hits (${payload.label}, batch)`,
      async () => {
        const results = await Promise.all(keys.map((key) => provider.get(key)));
        for (const result of results) verifyResult(result, payload);
      },
      optionsFor(payload),
    );
    bench(
      `Redis provider: ${concurrency} concurrent sets (${payload.label}, batch)`,
      async () => {
        const results = await Promise.all(keys.map((key) => provider.set(key, payload.entry)));
        for (const result of results) verifyResult(result, payload);
      },
      optionsFor(payload),
    );
  }
  bench(
    "Redis provider: cache miss",
    async () => {
      await provider.get("benchmark:missing");
    },
    optionsFor(payloads[0]),
  );
});
