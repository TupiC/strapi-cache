import type { Core } from '@strapi/strapi';
import { Redis, Cluster, ClusterNode, ClusterOptions } from 'ioredis';
import { withTimeout } from '../../utils/withTimeout';
import { CacheProvider } from '../../types/cache.types';
import { loggy } from '../../utils/log';

export class RedisCacheProvider implements CacheProvider {
  private initialized = false;
  private client!: Redis | Cluster;
  private cacheGetTimeoutInMs: number;
  private keyPrefix: string;

  constructor(private strapi: Core.Strapi) {}

  init(): void {
    if (this.initialized) {
      loggy.error('Redis provider already initialized');
      return;
    }
    try {
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
      this.initialized = true;

      loggy.info('Redis provider initialized');
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
    await Promise.all(toDelete.map((key) => this.del(key)));
  }
}
