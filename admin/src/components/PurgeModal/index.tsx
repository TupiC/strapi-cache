import { useIntl } from 'react-intl';
import { Archive } from '@strapi/icons';
import { Button, Modal } from '@strapi/design-system';
import { Typography } from '@strapi/design-system';
import { useEffect } from 'react';
import {
  useCacheConfig,
  useCachePermissions,
  useCacheOperations,
  useCacheNotifications,
} from '../../hooks';

export type PurgeProps = {
  buttonText: string;
  buttonWidth?: string;
  keyToUse?: string;
  contentTypeName?: string;
  isSettingsPage?: boolean;
  isPurgeAll?: boolean;
};

function PurgeModal({
  buttonText,
  keyToUse,
  buttonWidth,
  contentTypeName,
  isSettingsPage,
  isPurgeAll,
}: PurgeProps) {
  const { canPurgeCache } = useCachePermissions();
  const { config, error: configError } = useCacheConfig(canPurgeCache);
  const { isCacheableRoute, clearCache, clearAllCache } = useCacheOperations();
  const { showConfigFetchError, showPurgeSuccess, showPurgeError, showNoContentTypeWarning } =
    useCacheNotifications(config);
  const formatMessage = useIntl().formatMessage;

  useEffect(() => {
    if (configError) {
      showConfigFetchError(configError);
    }
  }, [configError, showConfigFetchError]);

  const handleClearCache = async () => {
    if (isPurgeAll) {
      const result = await clearAllCache();
      if (result.success) {
        showPurgeSuccess('all keys');
      } else {
        showPurgeError('all keys');
      }
      return;
    }

    if (!keyToUse) {
      showNoContentTypeWarning();
      return;
    }

    const result = await clearCache(keyToUse);

    if (result.success) {
      showPurgeSuccess(keyToUse);
    } else {
      showPurgeError(keyToUse);
    }
  };

  if (
    !canPurgeCache ||
    (!isPurgeAll && !isSettingsPage && !isCacheableRoute(keyToUse, contentTypeName, config))
  ) {
    return null;
  }

  return (
    <Modal.Root>
      <Modal.Trigger>
        <Button
          width={buttonWidth}
          disabled={!isPurgeAll && !keyToUse}
          startIcon={<Archive />}
          variant="danger"
        >
          {buttonText}
        </Button>
      </Modal.Trigger>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>{buttonText}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Typography variant="omega">
            {isPurgeAll
              ? formatMessage({
                  id: 'strapi-cache.cache.purge.confirmation-all',
                  defaultMessage:
                    'This purges all items in the cache. Are you sure you want to purge the cache?',
                })
              : formatMessage(
                  {
                    id: 'strapi-cache.cache.purge.confirmation',
                    defaultMessage: 'Are you sure you want to purge the cache?',
                  },
                  { key: `"${keyToUse}"` }
                )}
          </Typography>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">
              {formatMessage({
                id: 'strapi-cache.cache.cancel',
                defaultMessage: 'No, cancel',
              })}
            </Button>
          </Modal.Close>
          <Modal.Close>
            <Button onClick={handleClearCache}>
              {formatMessage({
                id: 'strapi-cache.cache.confirm',
                defaultMessage: 'Yes, confirm',
              })}
            </Button>
          </Modal.Close>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}

export default PurgeModal;
