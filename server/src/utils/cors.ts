type CorsConfig = {
  origin?: string | string[] | ((ctx: any) => string | string[] | Promise<string | string[]>);
  credentials?: boolean;
  expose?: string | string[];
};

export const getCorsConfig = (middlewares: any[]): CorsConfig | null => {
  const middleware = middlewares.find(
    (entry) => entry === 'strapi::cors' || entry?.name === 'strapi::cors'
  );

  if (!middleware) return null;
  return typeof middleware === 'string' ? {} : (middleware.config ?? {});
};

export const resolveCorsOrigin = async (ctx: any, config: CorsConfig): Promise<string> => {
  const requestOrigin = ctx?.request?.headers?.origin as string | undefined;
  if (!requestOrigin) return '*';

  const configuredOrigin = config.origin ?? '*';
  const resolvedOrigin =
    typeof configuredOrigin === 'function' ? await configuredOrigin(ctx) : configuredOrigin;
  const origins = Array.isArray(resolvedOrigin)
    ? resolvedOrigin
    : String(resolvedOrigin ?? '*')
        .split(',')
        .map((origin) => origin.trim());

  return origins.includes('*') || origins.includes(requestOrigin) ? requestOrigin : '';
};

export const applyCorsHeaders = (ctx: any, config: CorsConfig, origin: string): void => {
  for (const header of [
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials',
    'Access-Control-Expose-Headers',
  ]) {
    if (typeof ctx.remove === 'function') ctx.remove(header);
  }

  if (!origin) return;

  ctx.set('Access-Control-Allow-Origin', origin);
  if (config.credentials ?? true) {
    ctx.set('Access-Control-Allow-Credentials', 'true');
  }

  if (config.expose) {
    ctx.set(
      'Access-Control-Expose-Headers',
      Array.isArray(config.expose) ? config.expose.join(',') : config.expose
    );
  }

  if (typeof ctx.vary === 'function') ctx.vary('Origin');
};
