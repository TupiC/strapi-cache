// MEMORY
export default ({ env }) => ({
  'strapi-cache': {
    enabled: true,
    config: {
      debug: true, // Enable debug logs
      max: 1000, // Maximum number of items in the cache (only for memory cache)
      ttl: 1000 * 60 * 60, // Time to live for cache items (1 hour)
      size: 1024 * 1024 * 1024, // Maximum size of the cache (1 GB) (only for memory cache)
      allowStale: false, // Allow stale cache items (only for memory cache)
      cacheableRoutes: [], // Caches routes which start with these paths (if empty array, all '/api' routes are cached)
      provider: 'memory', // Cache provider ('memory' or 'redis')
      redisConfig: env('REDIS_URL', 'redis://localhost:6379'), // Redis config takes either a string or an object see https://ioredis.readthedocs.io/en/stable/README for references to what object is available, the object or string is passed directly to ioredis client (if using Redis)
      redisClusterNodes: [], // If provided any cluster node (this list is not empty), initialize ioredis redis cluster client. Each object must have keys 'host' and 'port'. See https://ioredis.readthedocs.io/en/stable/README for references
      redisClusterOptions: {}, // Options for ioredis redis cluster client. redisOptions key is taken from redisConfig parameter above if not set here. See https://ioredis.readthedocs.io/en/stable/README for references
      cacheHeaders: true,
      cacheAuthorizedRequests: false,
    },
  },
});

// REDIS STANDALONE
// docker compose -f redis-standalone.docker-compose.yml up
// export default ({ env }) => ({
//   'strapi-cache': {
//     enabled: true,
//     config: {
//       debug: true, // Enable debug logs
//       max: 1000, // Maximum number of items in the cache (only for memory cache)
//       ttl: 1000 * 60 * 60, // Time to live for cache items (1 hour)
//       size: 1024 * 1024 * 1024, // Maximum size of the cache (1 GB) (only for memory cache)
//       allowStale: false, // Allow stale cache items (only for memory cache)
//       cacheableRoutes: [], // Caches routes which start with these paths (if empty array, all '/api' routes are cached)
//       provider: 'redis', // Cache provider ('memory' or 'redis')
//       redisConfig: env('REDIS_URL', 'redis://localhost:6379'), // Redis config takes either a string or an object see https://ioredis.readthedocs.io/en/stable/README for references to what object is available, the object or string is passed directly to ioredis client (if using Redis)
//       redisClusterNodes: [], // If provided any cluster node (this list is not empty), initialize ioredis redis cluster client. Each object must have keys 'host' and 'port'. See https://ioredis.readthedocs.io/en/stable/README for references
//       redisClusterOptions: {}, // Options for ioredis redis cluster client. redisOptions key is taken from redisConfig parameter above if not set here. See https://ioredis.readthedocs.io/en/stable/README for references
//       cacheHeaders: true,
//       cacheAuthorizedRequests: false,
//     },
//   },
// });

// REDIS CLUSTER
// docker compose -f redis-cluster.docker-compose.yml up  
// export default ({ env }) => ({
//   'strapi-cache': {
//     enabled: true,
//     config: {
//       debug: true, // Enable debug logs
//       max: 1000, // Maximum number of items in the cache (only for memory cache)
//       ttl: 1000 * 60 * 60, // Time to live for cache items (1 hour)
//       size: 1024 * 1024 * 1024, // Maximum size of the cache (1 GB) (only for memory cache)
//       allowStale: false, // Allow stale cache items (only for memory cache)
//       cacheableRoutes: [], // Caches routes which start with these paths (if empty array, all '/api' routes are cached)
//       provider: 'redis', // Cache provider ('memory' or 'redis')
//       redisConfig: {
//         enableAutoPipelining: true,
//       }, // Redis config takes either a string or an object see https://ioredis.readthedocs.io/en/stable/README for references to what object is available, the object or string is passed directly to ioredis client (if using Redis)
//       redisClusterNodes: [
//         {
//           host: 'localhost',
//           port: 6379
//         }
//       ], // If provided any cluster node (this list is not empty), initialize ioredis redis cluster client. Each object must have keys 'host' and 'port'. See https://ioredis.readthedocs.io/en/stable/README for references
//       redisClusterOptions: {
//         scaleReads: "all"
//       }, // Options for ioredis redis cluster client. redisOptions key is taken from redisConfig parameter above if not set here. See https://ioredis.readthedocs.io/en/stable/README for references
//       cacheHeaders: true,
//       cacheAuthorizedRequests: false,
//     },
//   },
// });
