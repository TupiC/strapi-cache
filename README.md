# 🧠 strapi-cache

**A powerful LRU-Cache plugin for Strapi v5**
Boost your API performance with automatic in-memory or Redis caching for REST and GraphQL requests.

[![npm version](https://img.shields.io/npm/v/strapi-cache)](https://www.npmjs.com/package/strapi-cache)
![Strapi Version](https://img.shields.io/badge/strapi-v5-blue)
![License: MIT](https://img.shields.io/badge/license-MIT-green)
![npm](https://img.shields.io/npm/dt/strapi-cache)

---

## ✨ Features

- ⚡️ **Cache REST API responses**
- 🔮 **Cache GraphQL queries**
- ♻️ **LRU (Least Recently Used) caching strategy**
- 🔧 Simple integration with Strapi config
- 📦 Lightweight with zero overhead
- 🗄️ **Supports in-memory, Redis and Valkey caching**

---

## 🚀 Installation

Install via npm or yarn:

```bash
npm install strapi-cache
```

or

```bash
yarn add strapi-cache
```

## Quickstart

```javascript
// config/plugins.{js,ts}
'strapi-cache': {
  enabled: true,
},
```

To use **Redis** or **Valkey** instead of memory, set `provider` and `redisConfig` (required for those providers):

```javascript
// config/plugins.{js,ts}
'strapi-cache': {
  enabled: true,
  config: {
    provider: 'redis', // or 'valkey'
    redisConfig: env('REDIS_URL', 'redis://127.0.0.1:6379'),
  },
},
```

See [ioredis](https://github.com/redis/ioredis) (Redis) or [iovalkey](https://github.com/valkey-io/iovalkey) (Valkey) for advanced `redisConfig` shapes (URL string or client options object).

Full configuration example:

```javascript
// config/plugins.{js,ts}
'strapi-cache': {
  enabled: true,
  config: {
    debug: false, // Enable debug logs
    max: 1000, // Maximum number of items in the cache (only for memory cache)
    ttl: 1000 * 60 * 60, // Time to live for cache items (1 hour)
    size: 1024 * 1024 * 1024, // Maximum size of the cache (1 GB) (only for memory cache)
    allowStale: false, // Allow stale cache items (only for memory cache)
    cacheableRoutes: ['/api/products', '/api/categories'], // Caches routes which start with these paths (if empty array, all '/api' routes are cached)
    // cacheableEntities: ['products', 'categories'], // (Optional) Specify which entities to cache. When set, only these entities will be cached (ignores cacheableRoutes). If not set (undefined), cacheableRoutes logic is used
    excludeRoutes: ['/api/products/private'], // Exclude routes which start with these paths from being cached (takes precedence over cacheableRoutes). **Note:** `excludeRoutes` takes precedence over `cacheableRoutes`.
    provider: 'memory', // Cache provider ('memory', 'redis' or 'valkey')
    redisConfig: env('REDIS_URL', 'redis://localhost:6379'), // Redis/Valkey config: string or object. See https://github.com/redis/ioredis (Redis) or https://github.com/valkey-io/iovalkey (Valkey)
    redisClusterNodes: [], // If provided any cluster node (this list is not empty), initialize cluster client. Each object must have keys 'host' and 'port'
    redisClusterOptions: {}, // Options for ioredis redis cluster client. redisOptions key is taken from redisConfig parameter above if not set here. See https://github.com/redis/ioredis for references
    cacheHeaders: true, // Plugin also stores response headers in the cache (set to false if you don't want to cache headers)
    cacheHeadersDenyList: ['access-control-allow-origin', 'content-encoding'], // Headers to exclude from the cache (must be lowercase, if empty array, no headers are excluded, cacheHeaders must be true)
    cacheHeadersAllowList: ['content-type', 'content-security-policy'], // Headers to include in the cache (must be lowercase, if empty array, all headers are cached, cacheHeaders must be true)
    cacheAuthorizedRequests: false, // Cache requests with authorization headers (set to true if you want to cache authorized requests)
    cacheGetTimeoutInMs: 1000, // Timeout for getting cached data in milliseconds (default is 1 second)
    autoPurgeCache: true, // Automatically purge cache on content CRUD operations
    autoPurgeGraphQL: true, // Automatically purge GraphQL cache on content CRUD operations
    autoPurgeCacheOnStart: true, // Automatically purge cache on Strapi startup
    disableAdminPopups: false, // Disable popups in the admin panel
    disableAdminButtons: false, // Disable the purge cache buttons in the admin panel (list view and edit view)
  },
},
```

## ⚙️ Configuration

Possible configuration keys are listed below; omitted keys keep the plugin defaults.

| Key                       | Description                                                                                                                   | Possible values                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `debug`                   | Log cache decisions and operations to the server console                                                                      | `true` or `false` (default: `false`)                                                                                          |
| `provider`                | Where entries are stored                                                                                                      | `'memory'`, `'redis'`, or `'valkey'` (default: `'memory'`)                                                                    |
| `redisConfig`             | Redis/Valkey connection: URL string or client options passed to ioredis/iovalkey                                              | String or object; **required** when `provider` is `'redis'` or `'valkey'`. Default: value of `REDIS_URL` from the environment |
| `redisClusterNodes`       | Seed nodes for Redis cluster mode; non-empty list switches to a cluster client                                                | Array of `{ host: string, port: number }` (default: `[]`)                                                                     |
| `redisClusterOptions`     | Options for the cluster client (e.g. `scaleReads`); `redisOptions` often come from `redisConfig`                              | Object (default: `{}`)                                                                                                        |
| `redisScanDeleteCount`    | `COUNT` hint for `SCAN` when purging keys (Redis/Valkey)                                                                      | Positive number (default: `100`)                                                                                              |
| `max`                     | Maximum number of entries (in-memory provider only)                                                                           | Positive integer (default: `1000`)                                                                                            |
| `ttl`                     | Time-to-live for each entry, in milliseconds                                                                                  | Non-negative number (default: `3600000`, i.e. 1 hour)                                                                         |
| `size`                    | Approximate max total size in bytes (in-memory provider only)                                                                 | Positive integer (default: `10485760`, i.e. 10 MB)                                                                            |
| `allowStale`              | Whether stale entries may be returned (in-memory provider only)                                                               | `true` or `false` (default: `false`)                                                                                          |
| `cacheableRoutes`         | Only URLs starting with one of these paths are cached; if empty, every URL under the REST API prefix matches                  | Array of path prefix strings (default: `[]` meaning “all API routes”)                                                         |
| `cacheableEntities`       | If non-empty, only these API “entity” segments are cached; **when set, this drives eligibility instead of** `cacheableRoutes` | Array of strings (e.g. collection/table names), or omit / leave empty to use `cacheableRoutes`                                |
| `excludeRoutes`           | URLs starting with any of these prefixes are **never** cached; evaluated before `cacheableRoutes` / entities                  | Array of path prefix strings (default: `[]`)                                                                                  |
| `cacheHeaders`            | Store and replay response headers with the body                                                                               | `true` or `false` (default: `true`)                                                                                           |
| `cacheHeadersDenyList`    | Header names (lowercase) to strip when `cacheHeaders` is `true`                                                               | Array of strings (default: `[]`)                                                                                              |
| `cacheHeadersAllowList`   | If non-empty, only these header names (lowercase) are stored; if empty, all headers are stored (subject to deny list)         | Array of strings (default: `[]`)                                                                                              |
| `cacheAuthorizedRequests` | Whether to cache requests that include an `Authorization` header                                                              | `true` or `false` (default: `false`)                                                                                          |
| `cacheGetTimeoutInMs`     | Max time to wait for a cache read before treating it as a miss                                                                | Milliseconds (default: `1000`)                                                                                                |
| `autoPurgeCache`          | Invalidate relevant REST cache entries after content create/update/delete                                                     | `true` or `false` (default: `true`)                                                                                           |
| `autoPurgeGraphQL`        | Invalidate GraphQL cache after content create/update/delete                                                                   | `true` or `false` (default: `false` if omitted; set `true` to enable)                                                         |
| `autoPurgeCacheOnStart`   | Clear the cache when Strapi starts                                                                                            | `true` or `false` (default: `true`)                                                                                           |
| `disableAdminPopups`      | Turn off admin UI notifications for cache actions                                                                             | `true` or `false` (default: `false`)                                                                                          |
| `disableAdminButtons`     | Hide manual purge controls in the admin (list and edit views)                                                                 | `true` or `false` (default: `false`)                                                                                          |

## 🔍 Routes

The plugin creates three new routes

- `POST /strapi-cache/purge-cache` (purges the whole cache)
- `POST /strapi-cache/purge-cache/key` (purges cache entries that have the key in the cache key, expects JSON body with `key` field)
- `GET /strapi-cache/cacheable-routes` (returns the cacheable routes defined in the config)
- `GET /strapi-cache/config` (returns the current plugin config)

All of these routes are protected by the policies `admin::isAuthenticatedAdmin` and `plugin::strapi-cache.purge-cache`. The `plugin::strapi-cache.purge-cache` policy can be managed in the plugin's permissions section under the settings.

## 🗂️ How It Works

- **Storage**: The plugin keeps cached data in memory, Redis or Valkey, depending on the configuration.
- **Packages**: Uses [lru-cache](https://github.com/isaacs/node-lru-cache) for in-memory cache. Uses [ioredis](https://github.com/redis/ioredis) for Redis and [iovalkey](https://github.com/valkey-io/iovalkey) for Valkey caching.
- **Automatic Invalidation**: When `autoPurgeCache` is enabled (default), relevant REST cache entries are invalidated on content create, update, or delete. When `autoPurgeGraphQL` is enabled, GraphQL cache is invalidated the same way (it is off unless you set it in config).
- **`no-cache` Header Support**: Respects the `no-cache` header, letting you skip the cache by setting `Cache-Control: no-cache` in your request.
- **Default Cached Requests**: By default, caches all GET requests to `/api` (or whatever prefix you defined) and POST requests to `/graphql`. You can customize which routes or entities to cache using `cacheableRoutes` or `cacheableEntities` config options.

## 🔮 Planned Features

- [x] **Cache Invalidation**: Automatically invalidate cache on content updates, deletions, or creations.
- [x] **GraphQL Caching**: Cache GraphQL queries.
- [x] **Purge Cache Button**: Add a UI option in the Strapi admin panel to manually purge the cache for content-types.
- [x] **Purge Whole Cache Button**: Add a UI option in the Strapi admin settings panel to purge the whole cache.
- [x] **Route/Content-Type Specific Caching**: Allow users to define which routes should be cached based.
- [x] **Switchable Cache Providers**: Explore support for other caching providers like Redis for distributed caching.

If you have any feature requests or suggestions, please open a dedicated issue.

## 🛑 Problems

If you encounter any issues, please feel free to open an issue on the [GitHub repo](https://github.com/TupiC/strapi-cache/issues/new).

## 🛠️ Contributing

Contributions are welcome! If you have suggestions or improvements, please open an issue or submit a pull request.
