import request from 'supertest';
import { setupStrapi, cleanupStrapi } from './setup';
import type { Core } from '@strapi/types';

declare global {
  // eslint-disable-next-line no-var
  var strapi: Core.Strapi;
}

describe('REST cache integration', () => {
  beforeAll(async () => {
    const instance = await setupStrapi();
    (global as any).strapi = instance;
  }, 60000);

  afterAll(async () => {
    await cleanupStrapi();
  }, 10000);

  it('should cache GET /api/cache-test on first request and return cached response on second request', async () => {
    const server = strapi.server.httpServer;

    const firstResponse = await request(server).get('/api/cache-test').expect(200);

    const secondResponse = await request(server).get('/api/cache-test').expect(200);

    expect(firstResponse.body).toEqual(secondResponse.body);
    expect(firstResponse.body.data).toBe('cached');
  });

  it('should use different cache keys for different query parameters', async () => {
    const server = strapi.server.httpServer;

    const responseA = await request(server).get('/api/cache-test').expect(200);

    const responseB = await request(server).get('/api/cache-test?foo=bar').expect(200);

    expect(responseA.body).toBeDefined();
    expect(responseB.body).toBeDefined();
  });
});
