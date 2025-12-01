import { useIntl } from 'react-intl';
import { useNotification } from '@strapi/strapi/admin';
import { CacheConfig } from './useCacheConfig';

export const useCacheNotifications = (config?: CacheConfig) => {
  const formatMessage = useIntl().formatMessage;
  const { toggleNotification } = useNotification();

  const showConfigFetchError = (error: Error) => {
    // only show error notification if its not a permissions error and popups are not disabled
    const isPermissionError =
      (error as any)?.response?.status === 403 || (error as any)?.response?.status === 401;

    if (!isPermissionError && !config?.disableAdminPopups) {
      toggleNotification({
        type: 'warning',
        message: formatMessage({
          id: 'strapi-cache.cache.routes.fetch-error',
          defaultMessage: 'Unable to fetch cache config. Cache purge may not work correctly.',
        }),
      });
    }
  };

  const showPurgeSuccess = (key: string) => {
    if (!config?.disableAdminPopups) {
      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: 'strapi-cache.cache.purge.success',
            defaultMessage: 'Cache purged successfully',
          },
          {
            key: `"${key}"`,
          }
        ),
      });
    }
  };

  const showPurgeError = (key: string) => {
    if (!config?.disableAdminPopups) {
      toggleNotification({
        type: 'danger',
        message: formatMessage(
          {
            id: 'strapi-cache.cache.purge.error',
            defaultMessage: 'Error purging cache',
          },
          {
            key: `"${key}"`,
          }
        ),
      });
    }
  };

  const showNoContentTypeWarning = () => {
    if (!config?.disableAdminPopups) {
      toggleNotification({
        type: 'warning',
        message: formatMessage({
          id: 'strapi-cache.cache.purge.no-content-type',
          defaultMessage: 'No content type found',
        }),
      });
    }
  };

  return {
    showConfigFetchError,
    showPurgeSuccess,
    showPurgeError,
    showNoContentTypeWarning,
  };
};
