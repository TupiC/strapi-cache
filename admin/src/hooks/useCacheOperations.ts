import { useFetchClient } from '@strapi/strapi/admin';
import { CacheConfig } from './useCacheConfig';

export type CacheOperationResult = {
  success: boolean;
  message?: string;
  error?: Error;
};

export const useCacheOperations = () => {
  const { post } = useFetchClient();

  const isCacheableRoute = (
    keyToUse?: string,
    contentTypeName?: string,
    config?: CacheConfig
  ): boolean => {
    if (!keyToUse || !config) {
      return false;
    }

    const { cacheableRoutes } = config;
    return (
      cacheableRoutes.length === 0 ||
      cacheableRoutes.some((route) => {
        return route.includes(keyToUse) || (contentTypeName && route.includes(contentTypeName));
      })
    );
  };

  const clearCache = async (keyToUse?: string): Promise<CacheOperationResult> => {
    if (!keyToUse) {
      return {
        success: false,
        message: 'No content type found',
      };
    }

    try {
      await post(
        `/strapi-cache/purge-cache/key`,
        { key: keyToUse },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        message: `Cache purged successfully for key: "${keyToUse}"`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error purging cache for key: "${keyToUse}"`,
        error,
      };
    }
  };

  return {
    isCacheableRoute,
    clearCache,
  };
};
