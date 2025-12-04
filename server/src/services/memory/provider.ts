import type { Core } from '@strapi/strapi';
import { LRUCache } from 'lru-cache';
import { withTimeout } from '../../utils/withTimeout';
import { CacheProvider, CacheService } from '../../types/cache.types';
import { loggy } from '../../utils/log';

export class InMemoryCacheProvider implements CacheProvider {
  private initialized = false;
  private provider!: LRUCache<string, any>;
  private cacheGetTimeoutInMs: number;

  constructor(private strapi: Core.Strapi) {}

  init(): void {
    if (this.initialized) {
      loggy.error('Provider already initialized');
      return;
    }

    this.initialized = true;

    const max = Number(this.strapi.plugin('strapi-cache').config('max'));
    const ttl = Number(this.strapi.plugin('strapi-cache').config('ttl'));
    const size = Number(this.strapi.plugin('strapi-cache').config('size'));
    const allowStale = Boolean(this.strapi.plugin('strapi-cache').config('allowStale'));

    this.provider = new LRUCache({
      max,
      ttl,
      size,
      allowStale,
    });

    this.cacheGetTimeoutInMs = Number(
      this.strapi.plugin('strapi-cache').config('cacheGetTimeoutInMs')
    );

    loggy.info('Provider initialized');
  }

  get ready(): boolean {
    if (!this.initialized) {
      loggy.info('Provider not initialized');
      return false;
    }

    return true;
  }

  async get(key: string): Promise<any | null> {
    if (!this.ready) return null;

    return withTimeout(
      () =>
        new Promise((resolve) => {
          resolve(this.provider.get(key));
        }),
      this.cacheGetTimeoutInMs
    ).catch((error) => {
      loggy.error(`Error during get: ${error?.message || error}`);
      return null;
    });
  }

  async set(key: string, val: any): Promise<any | null> {
    if (!this.ready) return null;

    try {
      return this.provider.set(key, val);
    } catch (error) {
      loggy.error(`Error during set: ${error}`);
      return null;
    }
  }

  async del(key: string): Promise<any | null> {
    if (!this.ready) return null;

    try {
      loggy.info(`PURGING KEY: ${key}`);
      return this.provider.delete(key);
    } catch (error) {
      loggy.error(`Error during delete: ${error}`);
      return null;
    }
  }

  async keys(): Promise<string[] | null> {
    if (!this.ready) return null;

    try {
      return Array.from(this.provider.keys());
    } catch (error) {
      loggy.error(`Error fetching keys: ${error}`);
      return null;
    }
  }

  async reset(): Promise<any | null> {
    if (!this.ready) return null;

    try {
      const allKeys = await this.keys();
      if (!allKeys) return null;

      loggy.info(`PURGING ALL KEYS: ${allKeys.length}`);
      await Promise.all(allKeys.map((key) => this.del(key)));
      return true;
    } catch (error) {
      loggy.error(`Error during reset: ${error}`);
      return null;
    }
  }

  async clearByRegexp(regExps: RegExp[]): Promise<void> {
    const keys = await this.keys();

    if (!keys) {
      return;
    }

    const matches = keys.filter((key) => regExps.some((re) => re.test(key)));
    await Promise.all(matches.map((key) => this.del(key)));
  }
}
