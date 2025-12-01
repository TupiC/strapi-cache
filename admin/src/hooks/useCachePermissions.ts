import { useRBAC } from '@strapi/strapi/admin';
import { pluginPermissions } from '../permission';

export const useCachePermissions = () => {
  const { allowedActions } = useRBAC(pluginPermissions);

  return {
    canPurgeCache: allowedActions.canPurgeCache,
    allowedActions,
  };
};
