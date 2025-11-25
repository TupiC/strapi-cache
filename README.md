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
- 🗄️ **Supports in-memory and Redis caching**

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

## ⚙️ Configuration

In your Strapi project, navigate to `config/plugins.js` and add the following configuration:

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
    excludeRoutes: ['/api/products/private'], // (NEW) Exclude routes which start with these paths from being cached (takes precedence over cacheableRoutes). **Note:** `excludeRoutes` takes precedence over `cacheableRoutes`.
    provider: 'memory', // Cache provider ('memory' or 'redis')
    redisConfig: env('REDIS_URL', 'redis://localhost:6379'), // Redis config takes either a string or an object see https://github.com/redis/ioredis for references to what object is available, the object or string is passed directly to ioredis client (if using Redis)
    redisClusterNodes: [], // If provided any cluster node (this list is not empty), initialize ioredis redis cluster client. Each object must have keys 'host' and 'port'. See https://github.com/redis/ioredis for references
    redisClusterOptions: {}, // Options for ioredis redis cluster client. redisOptions key is taken from redisConfig parameter above if not set here. See https://github.com/redis/ioredis for references
    cacheHeaders: true, // Plugin also stores response headers in the cache (set to false if you don't want to cache headers)
    cacheHeadersDenyList: ['access-control-allow-origin', 'content-encoding'], // Headers to exclude from the cache (must be lowercase, if empty array, no headers are excluded, cacheHeaders must be true)
    cacheHeadersAllowList: ['content-type', 'content-security-policy'], // Headers to include in the cache (must be lowercase, if empty array, all headers are cached, cacheHeaders must be true)
    cacheAuthorizedRequests: false, // Cache requests with authorization headers (set to true if you want to cache authorized requests)
    cacheGetTimeoutInMs: 1000, // Timeout for getting cached data in milliseconds (default is 1 second)
    autoPurgeCache: true, // Automatically purge cache on content CRUD operations
    autoPurgeCacheOnStart: true, // Automatically purge cache on Strapi startup
    disableAdminPopups: false, // Disable popups in the admin panel
  },
},
```

## 🔍 Routes

The plugin creates three new routes

- `POST /strapi-cache/purge-cache` (purges the whole cache)
- `POST /strapi-cache/purge-cache/:key` (purges cache entries that have the key in the cache key)
- `GET /strapi-cache/cacheable-routes` (returns the cacheable routes defined in the config)
- `GET /strapi-cache/config` (returns the current plugin config)

All of these routes are protected by the policies `admin::isAuthenticatedAdmin` and `plugin::strapi-cache.purge-cache`. The `plugin::strapi-cache.purge-cache` policy can be managed in the plugin's permissions section under the settings.

## 🗂️ How It Works

- **Storage**: The plugin keeps cached data in memory or Redis, depending on the configuration.
- **Packages**: Uses [lru-cache](https://github.com/isaacs/node-lru-cache) for in-memory cache. Uses [ioredis](https://github.com/redis/ioredis) for Redis caching.
- **Automatic Invalidation**: Cache is cleared automatically when content is updated, deleted, or created. (GraphQL cache clears on any content update.)
- **`no-cache` Header Support**: Respects the `no-cache` header, letting you skip the cache by setting `Cache-Control: no-cache` in your request.
- **Default Cached Requests**: By default, caches all GET requests to `/api` (or whatever prefix you defined) and POST requests to `/graphql`. You can customize which content types to cache in the config (only for GET requests).

## 🔮 Planned Features

- [x] **Cache Invalidation**: Automatically invalidate cache on content updates, deletions, or creations.
- [x] **GraphQL Caching**: Cache GraphQL queries.
- [x] **Purge Cache Button**: Add a UI option in the Strapi admin panel to manually purge the cache for content-types.
- [ ] **Purge Whole Cache Button**: Add a UI option in the Strapi admin settings panel to purge the whole cache.
- [x] **Route/Content-Type Specific Caching**: Allow users to define which routes should be cached based.
- [x] **Switchable Cache Providers**: Explore support for other caching providers like Redis for distributed caching.

## 🛑 Problems

If you encounter any issues, please feel free to open an issue on the [GitHub repo](https://github.com/TupiC/strapi-cache/issues/new).

## 🛠️ Contributing

Contributions are welcome! If you have suggestions or improvements, please open an issue or submit a pull request.
