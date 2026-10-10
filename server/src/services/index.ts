import type { Core } from "@strapi/strapi";
import { resolveCacheProvider } from "./resolver";
import { CacheProvider, CacheService } from "../../src/types/cache.types";
import { loggy } from "../../src/utils/log";

const service = ({ strapi }: { strapi: Core.Strapi }): CacheService => {
  let instance: null | CacheProvider = null;

  return {
    getCacheInstance() {
      if (!instance) {
        loggy.info("Initializing cache service from provider config...");
        instance = resolveCacheProvider(strapi);
      }
      return instance;
    },
  };
};

export default {
  service,
};
