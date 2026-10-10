import type { Core } from "@strapi/strapi";
import { getCorsConfig } from "./cors";
import type { getCacheHeaderConfig } from "./header";
import { CacheKeyGenerator, createEntityKeyMatcher } from "./key";

type ConfigProvider = Core.Strapi["config"];

type RestCacheSettings = ReturnType<typeof getCacheHeaderConfig> & {
  cacheableEntities?: string[];
  cacheableRoutes: string[];
  excludeRoutes: string[];
  restApiPrefix: string;
  entityMatcher: RegExp;
  keyGenerator?: CacheKeyGenerator;
  corsConfig: ReturnType<typeof getCorsConfig>;
};

type PluginSettings = Omit<RestCacheSettings, "restApiPrefix" | "entityMatcher" | "corsConfig">;
const emptyList: string[] = [];
const snapshots = new WeakMap<
  Core.Strapi,
  {
    config: ConfigProvider;
    settings: RestCacheSettings;
  }
>();

const sameValue = (current: unknown, previous: unknown): boolean =>
  current === previous ||
  (Array.isArray(current) &&
    Array.isArray(previous) &&
    current.length === previous.length &&
    previous.every((value, index) => value === current[index]));

const sameCors = (
  current: RestCacheSettings["corsConfig"],
  previous: RestCacheSettings["corsConfig"],
): boolean =>
  current === null || previous === null
    ? current === previous
    : sameValue(current.origin, previous.origin) &&
      current.credentials === previous.credentials &&
      sameValue(current.expose, previous.expose);

export const getRestCacheSettings = (instance: Core.Strapi): RestCacheSettings => {
  const config = instance.config;
  // Read the whole plugin config once rather than looking up each option. Compare
  // against copied values so in-place mutations and previously captured setters
  // are visible without intercepting Strapi's config provider.
  const plugin = config.get("plugin::strapi-cache") as PluginSettings;
  const restApiPrefix = config.get("api.rest.prefix", "/api") as string;
  const cors = getCorsConfig(config.get("middlewares", []) as any[]);
  const snapshot = snapshots.get(instance);
  const previous = snapshot?.settings;
  if (
    snapshot?.config === config &&
    previous &&
    previous.restApiPrefix === restApiPrefix &&
    previous.cacheHeaders === plugin.cacheHeaders &&
    previous.cacheAuthorizedRequests === plugin.cacheAuthorizedRequests &&
    previous.keyGenerator === plugin.keyGenerator &&
    sameValue(plugin.cacheableEntities, previous.cacheableEntities) &&
    sameValue(plugin.cacheableRoutes, previous.cacheableRoutes) &&
    sameValue(plugin.excludeRoutes, previous.excludeRoutes) &&
    sameValue(plugin.cacheHeadersAllowList ?? emptyList, previous.cacheHeadersAllowList) &&
    sameValue(plugin.cacheHeadersDenyList ?? emptyList, previous.cacheHeadersDenyList) &&
    sameCors(cors, previous.corsConfig)
  ) {
    return previous;
  }

  const settings: RestCacheSettings = {
    cacheHeaders: plugin.cacheHeaders,
    cacheAuthorizedRequests: plugin.cacheAuthorizedRequests,
    cacheHeadersAllowList: [...(plugin.cacheHeadersAllowList ?? emptyList)],
    cacheHeadersDenyList: [...(plugin.cacheHeadersDenyList ?? emptyList)],
    cacheableEntities: plugin.cacheableEntities ? [...plugin.cacheableEntities] : undefined,
    cacheableRoutes: [...plugin.cacheableRoutes],
    excludeRoutes: [...plugin.excludeRoutes],
    restApiPrefix,
    entityMatcher:
      previous?.restApiPrefix === restApiPrefix
        ? previous.entityMatcher
        : createEntityKeyMatcher(restApiPrefix),
    keyGenerator: plugin.keyGenerator,
    corsConfig: cors
      ? {
          ...cors,
          origin: Array.isArray(cors.origin) ? [...cors.origin] : cors.origin,
          expose: Array.isArray(cors.expose) ? [...cors.expose] : cors.expose,
        }
      : null,
  };
  snapshots.set(instance, { config, settings });
  return settings;
};

// Optional explicit refresh; ordinary runtime changes are detected automatically.
export const invalidateRestCacheSettings = (instance: Core.Strapi): void => {
  snapshots.delete(instance);
};
