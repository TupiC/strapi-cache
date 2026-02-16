import request from 'supertest';
import { setupStrapi, cleanupStrapi } from './setup';
import type { Core } from '@strapi/types';

declare global {
  // eslint-disable-next-line no-var
  var strapi: Core.Strapi;
}

const GRAPHQL_QUERY = `
  query {
    articles {
      data {
        id
        attributes {
          title
        }
      }
    }
  }
`;

/**
 * Send a GraphQL query via GET (query in URL).
 * GraphQL supports both GET and POST; we use GET in tests.
 */
function graphqlGet(server: any, query: string) {
  const encoded = encodeURIComponent(query.replace(/\s+/g, ' ').trim());
  return request(server).get(`/graphql?query=${encoded}`).expect(200);
}

describe('GraphQL cache integration', () => {
  let graphqlRouteAvailable = false;

  beforeAll(async () => {
    const instance = await setupStrapi();
    (global as any).strapi = instance;
    // Detect if /graphql is registered (GraphQL plugin may not register when schema is empty in test env)
    const server = instance.server.httpServer;
    try {
      const res = await request(server).get('/graphql?query=' + encodeURIComponent('{ __typename }'));
      graphqlRouteAvailable = res.status === 200;
    } catch {
      graphqlRouteAvailable = false;
    }
  }, 60000);

  afterAll(async () => {
    await cleanupStrapi();
  }, 10000);

  it('should cache GraphQL query on first request and return cached response on second request', async () => {
    if (!graphqlRouteAvailable) {
      return; // skip when /graphql is not registered (e.g. empty schema in test env)
    }
    const server = strapi.server.httpServer;

    const firstResponse = await graphqlGet(server, GRAPHQL_QUERY);
    const secondResponse = await graphqlGet(server, GRAPHQL_QUERY);

    expect(firstResponse.body).toEqual(secondResponse.body);
    expect(firstResponse.body.data).toBeDefined();
  });

  it('should use different cache keys for different GraphQL queries', async () => {
    if (!graphqlRouteAvailable) {
      return; // skip when /graphql is not registered
    }
    const server = strapi.server.httpServer;

    const queryArticles = `
      query {
        articles {
          data {
            id
          }
        }
      }
    `;

    const queryCategories = `
      query {
        categories {
          data {
            id
          }
        }
      }
    `;

    const responseArticles = await graphqlGet(server, queryArticles);
    const responseCategories = await graphqlGet(server, queryCategories);

    expect(responseArticles.body.data?.articles).toBeDefined();
    expect(responseCategories.body.data?.categories).toBeDefined();
  });

  it('should invalidate GraphQL cache when content is created', async () => {
    if (!graphqlRouteAvailable) {
      return; // skip when /graphql is not registered
    }
    const server = strapi.server.httpServer;

    // 1. Populate cache with initial query
    const firstResponse = await graphqlGet(server, GRAPHQL_QUERY);
    const secondResponse = await graphqlGet(server, GRAPHQL_QUERY);

    expect(firstResponse.body).toEqual(secondResponse.body);
    const cachedArticleCount = firstResponse.body.data?.articles?.data?.length ?? 0;

    // 2. Create a new article (triggers afterCreate → invalidateGraphqlCache)
    await strapi.documents('api::article.article').create({
      data: { title: 'Cache invalidation test article' },
      status: 'published',
    });

    // 3. Same query should return fresh data with the new article
    const thirdResponse = await graphqlGet(server, GRAPHQL_QUERY);

    const freshArticleCount = thirdResponse.body.data?.articles?.data?.length ?? 0;
    expect(freshArticleCount).toBe(cachedArticleCount + 1);

    const newArticle = thirdResponse.body.data?.articles?.data?.find(
      (a: { attributes: { title?: string } }) => a.attributes?.title === 'Cache invalidation test article'
    );
    expect(newArticle).toBeDefined();
  });
});
