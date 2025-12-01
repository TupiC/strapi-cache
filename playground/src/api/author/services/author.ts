/**
 * author service.
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::author.author', ({ strapi }) => ({
  async findByName(name: string) {
    return await strapi.entityService.findMany('api::author.author', {
      filters: {
        name: {
          $eq: name,
        },
      },
    });
  },
}));
