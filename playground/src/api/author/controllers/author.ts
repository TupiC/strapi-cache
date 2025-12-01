/**
 *  author controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::author.author', ({ strapi }) => ({
  async findByName(ctx) {
    const { name } = ctx.params;

    if (!name) {
      return ctx.badRequest('Name parameter is required');
    }

    try {
      const authors = await strapi.service('api::author.author').findByName(name);
      ctx.send(authors);
    } catch (error) {
      ctx.internalServerError('Failed to find authors by name');
    }
  },
}));
