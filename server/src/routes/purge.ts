export default [
  {
    method: 'POST',
    path: '/purge-cache',
    handler: 'controller.purgeCache',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'plugin::content-manager.hasPermissions',
          config: {
            actions: ['plugin::strapi-cache.purge-cache'],
          },
        },
      ],
    },
  },
  {
    method: 'POST',
    path: '/purge-cache/:key',
    handler: 'controller.purgeCacheByKey',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'plugin::content-manager.hasPermissions',
          config: {
            actions: ['plugin::strapi-cache.purge-cache'],
          },
        },
      ],
    },
  },
  {
    method: 'GET',
    path: '/cacheable-routes',
    handler: 'controller.cacheableRoutes',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'plugin::content-manager.hasPermissions',
          config: {
            actions: ['plugin::strapi-cache.purge-cache'],
          },
        },
      ],
    },
  },
  {
    method: 'GET',
    path: '/config',
    handler: 'controller.config',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'plugin::content-manager.hasPermissions',
          config: {
            actions: ['plugin::strapi-cache.purge-cache'],
          },
        },
      ],
    },
  },
];
