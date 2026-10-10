export const loggy = {
  info: (msg: string) => {
    const shouldDebug = strapi.plugin("strapi-cache").config("debug") ?? false;
    if (!shouldDebug) {
      return;
    }
    strapi.log.info(`[STRAPI CACHE] ${msg}`);
  },
  error: (msg: string) => {
    const shouldDebug = strapi.plugin("strapi-cache").config("debug") ?? false;
    if (!shouldDebug) {
      return;
    }
    strapi.log.error(`[STRAPI CACHE] ${msg}`);
  },
  warn: (msg: string) => {
    const shouldDebug = strapi.plugin("strapi-cache").config("debug") ?? false;
    if (!shouldDebug) {
      return;
    }
    strapi.log.warn(`[STRAPI CACHE] ${msg}`);
  },
};
