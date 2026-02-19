import type { Core } from '@strapi/strapi';
import { Redis, Cluster, ClusterNode, ClusterOptions } from 'ioredis';
import { Redis as Valkey, Cluster as ValkeyCluster } from 'iovalkey';
import { withTimeout } from '../../utils/withTimeout';
import { CacheProvider } from '../../types/cache.types';
import { loggy } from '../../utils/log';

/** Minimal client interface for Redis/Valkey - both ioredis and iovalkey implement this. */
interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, val: string, ...args: unknown[]): Promise<unknown>;
  del(key: string): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
  pipeline(): { del(key: string): unknown; exec(): Promise<unknown> };
  flushdb(): Promise<string>;
}

export class RedisCacheProvider implements CacheProvider {
  private initialized = false;
  private client!: CacheClient;
  private cacheGetTimeoutInMs: number;
  private keyPrefix: string;

  constructor(private strapi: Core.Strapi) {}

  init(): void {
    if (this.initialized) {
      loggy.error('Redis provider already initialized');
      return;
    }
    try {
      const provider = this.strapi.plugin('strapi-cache').config('provider') || 'redis';
      const redisConfig =
        this.strapi.plugin('strapi-cache').config('redisConfig') || 'redis://localhost:6379';
      const redisClusterNodes: ClusterNode[] = this.strapi
        .plugin('strapi-cache')
        .config('redisClusterNodes');
      this.cacheGetTimeoutInMs = Number(
        this.strapi.plugin('strapi-cache').config('cacheGetTimeoutInMs')
      );
      this.keyPrefix =
        (this.strapi.plugin('strapi-cache').config('redisConfig')?.['keyPrefix'] as
          | string
          | undefined) ?? '';

      if (provider === 'valkey') {
        if (redisClusterNodes.length) {
          const redisClusterOptions =
            (this.strapi.plugin('strapi-cache').config('redisClusterOptions') as Record<
              string,
              unknown
            >) ?? {};
          const clusterOptions = { ...redisClusterOptions };
          if (!clusterOptions['redisOptions']) {
            clusterOptions['redisOptions'] = redisConfig;
          }
          this.client = new ValkeyCluster(
            redisClusterNodes,
            clusterOptions as never
          ) as unknown as CacheClient;
        } else {
          this.client = new Valkey(redisConfig) as unknown as CacheClient;
        }
        loggy.info('Valkey provider initialized');
      } else {
        if (redisClusterNodes.length) {
          const redisClusterOptions: ClusterOptions = this.strapi
            .plugin('strapi-cache')
            .config('redisClusterOptions');
          if (!redisClusterOptions['redisOptions']) {
            redisClusterOptions.redisOptions = redisConfig;
          }
          this.client = new Redis.Cluster(redisClusterNodes, redisClusterOptions);
        } else {
          this.client = new Redis(redisConfig);
        }
        loggy.info('Redis provider initialized');
      }
      this.initialized = true;
    } catch (error) {
      loggy.error(error);
    }
  }

  get ready(): boolean {
    if (!this.initialized) {
      loggy.info('Redis provider not initialized');
      return false;
    }

    return true;
  }

  async get(key: string): Promise<any | null> {
    if (!this.ready) return null;

    return withTimeout(() => this.client.get(key), this.cacheGetTimeoutInMs)
      .then((data) => (data ? JSON.parse(data) : null))
      .catch((error) => {
        loggy.error(`Redis get error: ${error?.message || error}`);
        return null;
      });
  }

  async set(key: string, val: any): Promise<any | null> {
    if (!this.ready) return null;

    try {
      // plugin ttl is ms, ioredis ttl is s, so we convert here
      const ttlInMs = Number(this.strapi.plugin('strapi-cache').config('ttl'));
      const ttlInS = Number((ttlInMs / 1000).toFixed());
      const serialized = JSON.stringify(val);
      if (ttlInS > 0) {
        await this.client.set(key, serialized, 'EX', ttlInS);
      } else {
        await this.client.set(key, serialized);
      }
      return val;
    } catch (error) {
      loggy.error(`Redis set error: ${error}`);
      return null;
    }
  }

  async del(key: string): Promise<any | null> {
    if (!this.ready) return null;

    try {
      const relativeKey = key.slice(this.keyPrefix.length);
      loggy.info(`Redis PURGING KEY: ${relativeKey}`);
      await this.client.del(relativeKey);
      return true;
    } catch (error) {
      loggy.error(`Redis del error: ${error}`);
      return null;
    }
  }

  /**
   * Deletes all given keys in Redis pipeline.
   * @param keys to delete from cache
   */
  async delAll(keys: string[]): Promise<void> {
    const pipeline = this.client.pipeline();
    keys.forEach((key) => {
      const relativeKey = key.slice(this.keyPrefix.length);
      pipeline.del(relativeKey);
    });
    await pipeline.exec();
  }

  async keys(): Promise<string[] | null> {
    if (!this.ready) return null;

    try {
      const keys = await this.client.keys(`${this.keyPrefix}*`);
      return keys;
    } catch (error) {
      loggy.error(`Redis keys error: ${error}`);
      return null;
    }
  }

  async reset(): Promise<any | null> {
    if (!this.ready) return null;

    try {
      if (this.keyPrefix) {
        loggy.info(`Redis FLUSHING NAMESPACE: ${this.keyPrefix}`);
        const keys = await this.keys();
        if (!keys) return null;

        const toDelete = keys.filter((key) => key.startsWith(this.keyPrefix));
        await Promise.all(toDelete.map((key) => this.del(key)));
        return true;
      }

      loggy.info(`Redis FLUSHING ALL KEYS`);
      await this.client.flushdb();
      return true;
    } catch (error) {
      loggy.error(`Redis reset error: ${error}`);
      return null;
    }
  }

  async clearByRegexp(regExps: RegExp[]): Promise<void> {
    const keys = await this.keys();

    if (!keys) {
      return;
    }

    const toDelete = keys.filter((key) => regExps.some((re) => re.test(key)));
    await this.delAll(toDelete);
  }
}
