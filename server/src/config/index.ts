export default {
  default: ({ env }) => ({
    debug: false,
    max: 1000,
    ttl: 1000 * 60 * 60,
    size: 1024 * 1024 * 10,
    allowStale: false,
    cacheableRoutes: [],
    provider: 'memory',
    redisConfig: env('REDIS_URL'),
    redisClusterNodes: [],
    redisClusterOptions: {},
    cacheHeaders: true,
    cacheHeadersDenyList: [],
    cacheHeadersAllowList: [],
    cacheAuthorizedRequests: false,
    cacheGetTimeoutInMs: 1000,
    autoPurgeCache: true,
    autoPurgeCacheOnStart: true,
  }),
  validator: (config) => {
    if (typeof config.debug !== 'boolean') {
      throw new Error(`Invalid config: debug must be a boolean`);
    }
    if (typeof config.max !== 'number') {
      throw new Error(`Invalid config: max must be a number`);
    }
    if (typeof config.ttl !== 'number') {
      throw new Error(`Invalid config: ttl must be a number`);
    }
    if (typeof config.size !== 'number') {
      throw new Error(`Invalid config: size must be a number`);
    }
    if (typeof config.allowStale !== 'boolean') {
      throw new Error(`Invalid config: allowStale must be a boolean`);
    }
    if (
      !Array.isArray(config.cacheableRoutes) ||
      config.cacheableRoutes.some((item) => typeof item !== 'string')
    ) {
      throw new Error(`Invalid config: cacheableRoutes must be an string array`);
    }
    if (typeof config.provider !== 'string') {
      throw new Error(`Invalid config: provider must be a string`);
    }
    if (config.provider !== 'memory' && config.provider !== 'redis') {
      throw new Error(`Invalid config: provider must be 'memory' or 'redis'`);
    }
    if (config.provider === 'redis') {
      if (!config.redisConfig) {
        throw new Error(`Invalid config: redisConfig must be set when using redis provider`);
      }
      if (typeof config.redisConfig !== 'string' && typeof config.redisConfig !== 'object') {
        throw new Error(`Invalid config: redisConfig must be a string or object when using redis provider`);
      }
      if (
        !Array.isArray(config.redisClusterNodes) ||
        config.redisClusterNodes.some((item) => !('host' in item && 'port' in item))
      ) {
        throw new Error(
          `Invalid config: redisClusterNodes must be as a list of objects with keys 'host' and 'port'`
        );
      }
      if (typeof config.redisClusterOptions !== 'object') {
        throw new Error(`Invalid config: redisClusterOptions must be an object`);
      }
    }
    if (typeof config.cacheHeaders !== 'boolean') {
      throw new Error(`Invalid config: cacheHeaders must be a boolean`);
    }
    if (
      !Array.isArray(config.cacheHeadersDenyList) ||
      config.cacheHeadersDenyList.some((item) => typeof item !== 'string')
    ) {
      throw new Error(`Invalid config: cacheHeadersDenyList must be an string array`);
    }
    if (
      !Array.isArray(config.cacheHeadersAllowList) ||
      config.cacheHeadersAllowList.some((item) => typeof item !== 'string')
    ) {
      throw new Error(`Invalid config: cacheHeadersAllowList must be an string array`);
    }
    if (typeof config.cacheAuthorizedRequests !== 'boolean') {
      throw new Error(`Invalid config: cacheAuthorizedRequests must be a boolean`);
    }
    if (typeof config.cacheGetTimeoutInMs !== 'number') {
      throw new Error(`Invalid config: cacheGetTimeoutInMs must be a number`);
    }
    if (typeof config.autoPurgeCache !== 'boolean') {
      throw new Error(`Invalid config: autoPurgeCache must be a boolean`);
    }
    if (typeof config.autoPurgeCacheOnStart !== 'boolean') {
      throw new Error(`Invalid config: autoPurgeCacheOnStart must be a boolean`);
    }
    if (config.namespace && typeof config.namespace !== 'string') {
      throw new Error(`Invalid config: namespace must be a string`);
    }
  },
};
