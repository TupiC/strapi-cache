import Koa from "koa";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import type { CacheProvider } from "../server/src/types/cache.types";

const app = new Koa();
export const graphqlPayload = JSON.stringify({
  query:
    "query Articles($limit: Int!) { articles(pagination: { limit: $limit }) { documentId title author { name } } }",
  variables: { limit: 100 },
  operationName: "Articles",
});

export const payloads = [1, 32, 250].map((kilobytes) => {
  const targetBytes = kilobytes * 1_024;
  const articleCount = Math.floor(targetBytes / 256);
  const body = {
    data: Array.from({ length: articleCount }, (_, index) => ({
      id: index,
      title: `Article ${index}`,
      content: "",
    })),
  };
  const contentBytes = targetBytes - Buffer.byteLength(JSON.stringify(body));
  const contentLength = Math.floor(contentBytes / articleCount);
  const extraBytes = contentBytes % articleCount;
  for (const [index, article] of body.data.entries()) {
    article.content = "x".repeat(contentLength + (index < extraBytes ? 1 : 0));
  }
  return {
    label: `${kilobytes} KB`,
    body,
    entry: {
      body: JSON.stringify(body),
      bodyType: "json" as const,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    },
  };
});

export const createStrapi = (provider?: CacheProvider, redisUrl?: string) => {
  const settings: Record<string, unknown> = {
    max: 1_000,
    ttl: 60_000,
    size: 10 * 1_024 * 1_024,
    allowStale: false,
    debug: false,
    cacheGetTimeoutInMs: 1_000,
    cacheableEntities: ["articles"],
    cacheableRoutes: [],
    excludeRoutes: ["/api/private"],
    cacheHeaders: true,
    cacheHeadersAllowList: [],
    cacheHeadersDenyList: [],
    cacheAuthorizedRequests: false,
    keyGenerator: undefined,
    provider: redisUrl ? "redis" : "memory",
    redisConfig: redisUrl,
    redisClusterNodes: [],
    redisClusterOptions: {},
    redisScanDeleteCount: 100,
  };
  const cachePlugin = {
    config: (key: string) => settings[key],
    services: { service: { getCacheInstance: () => provider } },
  };
  const middlewares = [
    { name: "strapi::cors", config: { origin: ["https://benchmark.example"], credentials: true } },
  ];
  return {
    plugin: (name: string) =>
      name === "graphql" ? { config: (_key: string, fallback: unknown) => fallback } : cachePlugin,
    config: {
      get: (key: string, fallback?: unknown) =>
        key === "plugin::strapi-cache"
          ? settings
          : key === "middlewares"
            ? middlewares
            : key === "api.rest.prefix"
              ? "/api"
              : fallback,
    },
    log: { info: () => undefined, error: () => undefined, warn: () => undefined },
  };
};

export const createContext = (protocol: "REST" | "GraphQL", sequence = 0) => {
  const req = new IncomingMessage(new Socket());
  req.method = protocol === "REST" ? "GET" : "POST";
  req.url =
    protocol === "REST"
      ? `/api/articles?populate[author]=*&pagination[pageSize]=100&request=${sequence}`
      : "/graphql";
  req.headers = { origin: "https://benchmark.example" };
  if (protocol === "GraphQL") {
    const body = sequence
      ? graphqlPayload.replace('"limit":100', `"limit":${sequence + 100}`)
      : graphqlPayload;
    req.headers["content-type"] = "application/json";
    req.headers["content-length"] = String(Buffer.byteLength(body));
    req.push(body);
  }
  req.push(null);
  return app.createContext(req, new ServerResponse(req));
};

export const verifyResponse = (ctx: Koa.Context, expectedBody: string) => {
  if (
    ctx.status !== 200 ||
    ctx.body !== expectedBody ||
    ctx.response.get("content-type") !== "application/json; charset=utf-8" ||
    ctx.response.get("access-control-allow-origin") !== "https://benchmark.example"
  ) {
    throw new Error("Middleware fixture did not return the expected JSON and CORS headers");
  }
};
