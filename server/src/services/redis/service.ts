import type { Core } from "@strapi/strapi";
import type { CacheService } from "../../types/cache.types";
import { loggy } from "../../../src/utils/log";
import { RedisCacheProvider } from "./provider";

const service = ({ strapi }: { strapi: Core.Strapi }): CacheService => {
  let instance: RedisCacheProvider | null = null;

  return {
    getCacheInstance() {
      if (!instance) {
        instance = new RedisCacheProvider(strapi);
        loggy.info("Creating Redis provider");
        instance.init();
      }
      return instance;
    },
  };
};

export default service;
