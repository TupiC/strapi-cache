import { describe, expect, it, vi } from "vitest";
import { get, set } from "lodash";
import {
  getRestCacheSettings,
  invalidateRestCacheSettings,
} from "../../server/src/utils/restSettings";
import { generateEntityKey } from "../../server/src/utils/key";
import cacheMiddleware from "../../server/src/middlewares/cache";
import type { Context } from "koa";

const createInstance = () => {
  const values = {
    "plugin::strapi-cache": {
      cacheableEntities: ["articles"],
      cacheableRoutes: ["/api/articles"],
      excludeRoutes: ["/api/private"],
      cacheHeaders: true,
      cacheHeadersAllowList: ["content-type"],
      cacheHeadersDenyList: ["set-cookie"],
      cacheAuthorizedRequests: false,
      keyGenerator: undefined,
    },
    api: { rest: { prefix: "/api" } },
    middlewares: [{ name: "strapi::cors", config: { origin: ["https://a.test"] } }],
  };
  const config = {
    get: vi.fn((path: string, fallback?: unknown) => get(values, path, fallback)),
    set: vi.fn(function (path: string, value: unknown) {
      expect(this).toBe(config);
      set(values, path, value);
      return this;
    }),
  };
  const plugin = { config: vi.fn((key: string) => config.get(`plugin::strapi-cache.${key}`)) };
  const instance = { config, plugin: vi.fn(() => plugin) } as any;
  return { instance, config, plugin, values };
};

describe("REST settings snapshots", () => {
  it("reuses settings and the matcher with three config lookups and no per-option reads", () => {
    const { instance, config, plugin } = createInstance();
    const first = getRestCacheSettings(instance);
    const reads = config.get.mock.calls.length;
    const pluginReads = plugin.config.mock.calls.length;

    expect(getRestCacheSettings(instance)).toBe(first);
    expect(config.get).toHaveBeenCalledTimes(reads + 3);
    expect(plugin.config).toHaveBeenCalledTimes(pluginReads);
    expect(generateEntityKey("/api/articles/123?populate=*", first.entityMatcher)).toBe("articles");
    expect(generateEntityKey("/api/users", first.entityMatcher)).toBe("users");
  });

  it("keeps settings isolated between Strapi instances", () => {
    const a = createInstance();
    const b = createInstance();
    b.config.set("api.rest.prefix", "/api.v2");
    b.config.set("plugin::strapi-cache.cacheableEntities", ["users"]);

    const first = getRestCacheSettings(a.instance);
    const second = getRestCacheSettings(b.instance);
    expect(first).not.toBe(second);
    expect(first.cacheableEntities).toEqual(["articles"]);
    expect(second.cacheableEntities).toEqual(["users"]);
    expect(generateEntityKey("/api.v2/users", second.entityMatcher)).toBe("users");
    expect(generateEntityKey("/apiXv2/users", second.entityMatcher)).toBe("");
    expect(getRestCacheSettings(a.instance)).toBe(first);
  });

  it("refreshes routes, entities, exclusions, headers and key generation after config.set", () => {
    const { instance, config } = createInstance();
    const first = getRestCacheSettings(instance);
    const keyGenerator = () => "updated-key";
    config.set("plugin::strapi-cache.cacheableRoutes", ["/api/users"]);
    config.set("plugin::strapi-cache.cacheableEntities", ["users"]);
    config.set("plugin::strapi-cache.excludeRoutes", ["/api/articles"]);
    config.set("plugin::strapi-cache.cacheHeaders", false);
    config.set("plugin::strapi-cache.cacheAuthorizedRequests", true);
    config.set("plugin::strapi-cache.cacheHeadersAllowList", ["etag"]);
    config.set("plugin::strapi-cache.cacheHeadersDenyList", ["content-length"]);
    config.set("plugin::strapi-cache.keyGenerator", keyGenerator);

    const second = getRestCacheSettings(instance);
    expect(second).not.toBe(first);
    expect(second).toMatchObject({
      cacheableRoutes: ["/api/users"],
      cacheableEntities: ["users"],
      excludeRoutes: ["/api/articles"],
      cacheHeaders: false,
      cacheAuthorizedRequests: true,
      cacheHeadersAllowList: ["etag"],
      cacheHeadersDenyList: ["content-length"],
      keyGenerator,
    });
    expect(first.excludeRoutes).toEqual(["/api/private"]);
    expect(getRestCacheSettings(instance)).toBe(second);
  });

  it("refreshes CORS and rebuilds the matcher after prefix or parent-object updates", () => {
    const { instance, config } = createInstance();
    const first = getRestCacheSettings(instance);
    const origin = vi.fn(async () => "https://dynamic.test");
    config.set("api", { rest: { prefix: "/v2/api+" } });
    config.set("middlewares", [{ name: "strapi::cors", config: { origin, credentials: false } }]);

    const second = getRestCacheSettings(instance);
    expect(second.entityMatcher).not.toBe(first.entityMatcher);
    expect(generateEntityKey("/v2/api+/articles", second.entityMatcher)).toBe("articles");
    expect(generateEntityKey("/api/articles", second.entityMatcher)).toBe("");
    expect(second.corsConfig).toEqual({ origin, credentials: false, expose: undefined });
    expect(first.corsConfig?.origin).toEqual(["https://a.test"]);
  });

  it("preserves setter chaining and observes updates through an existing bound setter", () => {
    const { instance, config } = createInstance();
    const observedSet = config.set;
    const update = config.set.bind(config);
    getRestCacheSettings(instance);
    expect(update("api.rest.prefix", "/custom")).toBe(config);
    const second = getRestCacheSettings(instance);
    expect(second.restApiPrefix).toBe("/custom");
    expect(config.set).toBe(observedSet);
    expect(config.set("api.rest.prefix", "/other").set("api.rest.prefix", "/final")).toBe(config);
    expect(getRestCacheSettings(instance).restApiPrefix).toBe("/final");
  });

  it("preserves setter errors without invalidating the existing snapshot", () => {
    const { instance, config } = createInstance();
    config.set.mockImplementation(() => {
      throw new Error("invalid update");
    });
    const first = getRestCacheSettings(instance);
    expect(() => config.set("api.rest.prefix", "/custom")).toThrow("invalid update");
    expect(getRestCacheSettings(instance)).toBe(first);
  });

  it("rebuilds when the config provider is replaced", () => {
    const { instance } = createInstance();
    const first = getRestCacheSettings(instance);
    const replacement = createInstance();
    replacement.config.set("api.rest.prefix", "/replacement");
    instance.config = replacement.config;
    instance.plugin = replacement.instance.plugin;
    const second = getRestCacheSettings(instance);
    expect(second).not.toBe(first);
    expect(second.restApiPrefix).toBe("/replacement");
    instance.config.set("api.rest.prefix", "/next");
    expect(getRestCacheSettings(instance).restApiPrefix).toBe("/next");
  });

  it("automatically refreshes after direct mutations without changing the active snapshot", () => {
    const { instance, values } = createInstance();
    const first = getRestCacheSettings(instance);
    values["plugin::strapi-cache"].excludeRoutes.push("/api/articles");
    values.api.rest.prefix = "/custom";
    values.middlewares[0].config.origin.push("https://b.test");
    expect(first.excludeRoutes).toEqual(["/api/private"]);
    expect(first.corsConfig?.origin).toEqual(["https://a.test"]);

    const second = getRestCacheSettings(instance);
    expect(second.excludeRoutes).toContain("/api/articles");
    expect(second.corsConfig?.origin).toContain("https://b.test");
    expect(generateEntityKey("/custom/articles", second.entityMatcher)).toBe("articles");
  });

  it("detects same-length array edits and scalar changes made directly", () => {
    const { instance, values } = createInstance();
    const first = getRestCacheSettings(instance);
    const plugin = values["plugin::strapi-cache"];
    plugin.cacheableEntities[0] = "users";
    plugin.cacheableRoutes[0] = "/api/users";
    plugin.excludeRoutes[0] = "/api/articles";
    plugin.cacheHeadersAllowList[0] = "etag";
    plugin.cacheHeadersDenyList[0] = "content-length";
    plugin.cacheHeaders = false;
    plugin.cacheAuthorizedRequests = true;
    values.middlewares[0].config.origin[0] = "https://b.test";

    const second = getRestCacheSettings(instance);
    expect(second).not.toBe(first);
    expect(second).toMatchObject({
      cacheableEntities: ["users"],
      cacheableRoutes: ["/api/users"],
      excludeRoutes: ["/api/articles"],
      cacheHeadersAllowList: ["etag"],
      cacheHeadersDenyList: ["content-length"],
      cacheHeaders: false,
      cacheAuthorizedRequests: true,
      corsConfig: { origin: ["https://b.test"] },
    });
    expect(second.entityMatcher).toBe(first.entityMatcher);
    expect(getRestCacheSettings(instance)).toBe(second);
  });

  it("detects CORS insertion, removal and nested configuration changes", () => {
    const { instance, config } = createInstance();
    config.set("middlewares", []);
    expect(getRestCacheSettings(instance).corsConfig).toBeNull();
    const middlewares = config.get("middlewares") as any[];
    middlewares.push("strapi::cors");
    const first = getRestCacheSettings(instance);
    expect(first.corsConfig).toMatchObject({});
    expect(getRestCacheSettings(instance)).toBe(first);
    middlewares[0] = { name: "strapi::cors", config: { credentials: false, expose: ["x-one"] } };
    expect(getRestCacheSettings(instance).corsConfig).toMatchObject({
      credentials: false,
      expose: ["x-one"],
    });
    middlewares[0].config.credentials = true;
    middlewares[0].config.expose[0] = "x-two";
    expect(getRestCacheSettings(instance).corsConfig).toMatchObject({
      credentials: true,
      expose: ["x-two"],
    });
    middlewares[0].name = "strapi::other";
    expect(getRestCacheSettings(instance).corsConfig).toBeNull();
  });

  it("retains explicit invalidation without modifying Strapi setters", () => {
    const { instance, config } = createInstance();
    const setter = config.set;
    const first = getRestCacheSettings(instance);
    invalidateRestCacheSettings(instance);
    expect(getRestCacheSettings(instance)).not.toBe(first);
    expect(config.set).toBe(setter);
  });

  it.each(["direct mutation", "previously captured setter"])(
    "bypasses authorized requests after caching is disabled via %s",
    async (mode) => {
      const { instance, config, values, plugin } = createInstance();
      values["plugin::strapi-cache"].cacheAuthorizedRequests = true;
      const update = config.set.bind(config);
      const store = { get: vi.fn(async () => ({ body: "cached", headers: {} })) };
      instance.plugin = () => ({
        ...plugin,
        services: { service: { getCacheInstance: () => store } },
      });
      vi.stubGlobal("strapi", instance);
      const context = () =>
        ({
          request: {
            method: "GET",
            url: "/api/articles",
            headers: { authorization: "Bearer token" },
          },
          response: { headers: {} },
          set: vi.fn(),
        }) as unknown as Context;
      try {
        await cacheMiddleware(context(), vi.fn());
        expect(store.get).toHaveBeenCalledOnce();
        if (mode === "direct mutation") {
          (
            config.get("plugin::strapi-cache") as (typeof values)["plugin::strapi-cache"]
          ).cacheAuthorizedRequests = false;
        } else {
          update("plugin::strapi-cache.cacheAuthorizedRequests", false);
        }
        const next = vi.fn();
        await cacheMiddleware(context(), next);
        expect(store.get).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledOnce();
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );
});
