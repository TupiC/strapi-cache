import type { LRUCache } from "lru-cache";

export interface CacheProvider {
  init(): void;
  get(key: string): Promise<any | null>;
  set(key: string, val: any): Promise<any | null>;
  del(key: string): Promise<any | null>;
  keys(): Promise<string[] | null>;
  reset(): Promise<any | null>;
  readonly ready: boolean;
  clearByRegexp(regExps: RegExp[]): Promise<void>;
}

export interface CacheService {
  getCacheInstance(): CacheProvider;
}

export interface CacheInstance {
  initialized: boolean;
  provider: LRUCache<string, any>;
}
