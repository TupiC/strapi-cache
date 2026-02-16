export default {
  routes: [
    {
      method: 'GET',
      path: '/cache-test',
      handler: 'cache-test.get',
      config: {
        auth: false,
      },
    },
  ],
};
