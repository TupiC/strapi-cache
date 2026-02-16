export default {
  get(ctx) {
    ctx.body = { data: 'cached', timestamp: Date.now() };
  },
};
