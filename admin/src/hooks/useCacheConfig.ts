import { useState, useEffect } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';

export type CacheConfig = {
  cacheableRoutes: string[];
  disableAdminPopups: boolean;
};

export const useCacheConfig = (enabled: boolean = true) => {
  const [config, setConfig] = useState<CacheConfig>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { get } = useFetchClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const fetchConfig = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data } = await get('/strapi-cache/config');
        setConfig(data);
      } catch (error: any) {
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [enabled, get]);

  return {
    config,
    isLoading,
    error,
    refetch: () => {
      const fetchConfig = async () => {
        setIsLoading(true);
        setError(null);

        try {
          const { data } = await get('/strapi-cache/config');
          setConfig(data);
        } catch (error: any) {
          setError(error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchConfig();
    },
  };
};
