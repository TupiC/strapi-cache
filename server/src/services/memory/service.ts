import type { Core } from "@strapi/strapi";
import type { CacheService } from "../../types/cache.types";
import { loggy } from "../../../src/utils/log";
import { InMemoryCacheProvider } from "./provider";

const service = ({ strapi }: { strapi: Core.Strapi }): CacheService => {
  let instance: InMemoryCacheProvider | null = null;

  return {
    getCacheInstance() {
      if (!instance) {
        instance = new InMemoryCacheProvider(strapi);
        loggy.info("Creating provider");
        instance.init();
      }
      return instance;
    },
  };
};

export default service;
