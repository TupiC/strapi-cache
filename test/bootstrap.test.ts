import { describe, it, expect, vi, beforeEach } from 'vitest';
import bootstrap from '../server/src/bootstrap';
import { invalidateCache, invalidateGraphqlCache } from '../server/src/utils/invalidateCache';

vi.mock('../server/src/utils/invalidateCache', () => ({
  invalidateCache: vi.fn().mockResolvedValue(undefined),
  invalidateGraphqlCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../server/src/utils/log', () => ({
  loggy: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('bootstrap', () => {
  const cacheStore = {
    init: vi.fn(),
    reset: vi.fn().mockResolvedValue(undefined),
  };
  const subscribe = vi.fn();
  const registerMany = vi.fn();

  const createStrapi = (config: Record<string, unknown> = {}) =>
    ({
      plugin: vi.fn().mockReturnValue({
        services: {
          service: {
            getCacheInstance: () => cacheStore,
          },
        },
        config: vi.fn((key: string) => config[key] ?? false),
      }),
      db: {
        lifecycles: {
          subscribe,
        },
      },
      admin: {
        services: {
          permission: {
            actionProvider: {
              registerMany,
            },
          },
        },
      },
    }) as any;

  beforeEach(() => {
    vi.clearAllMocks();
    cacheStore.reset.mockResolvedValue(undefined);
  });

  it('does not block lifecycle callbacks on REST cache invalidation', async () => {
    const strapi = createStrapi({ autoPurgeCache: true });
    const event = { model: { uid: 'api::article.article' } };

    bootstrap({ strapi });

    const subscriber = subscribe.mock.calls[0][0];
    const result = subscriber.afterUpdate(event);

    expect(result).toBeUndefined();
    expect(invalidateCache).not.toHaveBeenCalled();

    await Promise.resolve();

    expect(invalidateCache).toHaveBeenCalledWith(event, cacheStore, strapi);
  });

  it('does not block lifecycle callbacks on GraphQL cache invalidation', async () => {
    const strapi = createStrapi({ autoPurgeGraphQL: true });
    const event = { model: { uid: 'api::article.article' } };

    bootstrap({ strapi });

    const subscriber = subscribe.mock.calls[0][0];
    const result = subscriber.afterUpdate(event);

    expect(result).toBeUndefined();
    expect(invalidateGraphqlCache).not.toHaveBeenCalled();

    await Promise.resolve();

    expect(invalidateGraphqlCache).toHaveBeenCalledWith(event, cacheStore, strapi);
  });
});
