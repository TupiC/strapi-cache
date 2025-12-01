/**
 * Custom author routes.
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/authors/findByName/:name',
      handler: 'author.findByName',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
