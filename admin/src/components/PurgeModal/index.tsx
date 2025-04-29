import { useIntl } from 'react-intl';
import { Archive } from '@strapi/icons';
import { Button, Modal } from '@strapi/design-system';
import { useNotification, useRBAC } from '@strapi/strapi/admin';
import { pluginPermissions } from '../../permission';
import { Typography } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import { useEffect, useState } from 'react';
import PurgeButton from './PurgeButton';

export type PurgeProps = {
  buttonText: string;
  buttonWidth?: string;
  keyToUse?: string;
  contentTypeName?: string;
};

function PurgeModal({ buttonText, keyToUse, buttonWidth, contentTypeName }: PurgeProps) {
  const { allowedActions } = useRBAC(pluginPermissions);
  const formatMessage = useIntl().formatMessage;
  const { post, get } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [cacheableRoutes, setCacheableRoutes] = useState<string[]>();

  useEffect(() => {
    if (!allowedActions.canPurgeCache) {
      return;
    }
    const fetchCacheableRoutes = async () => {
      try {
        const { data } = await get('/strapi-cache/cacheable-routes');
        return data;
      } catch (error) {
        console.error('Error fetching cacheable routes:', error);
        return undefined;
      }
    };
    fetchCacheableRoutes().then((data) => {
      setCacheableRoutes(data);
    });
  }, [allowedActions.canPurgeCache]);

  const isCacheableRoute = () => {
    if (!keyToUse || !cacheableRoutes) {
      return false;
    }

    return (
      cacheableRoutes.length === 0 ||
      cacheableRoutes.some((route) => {
        return route.includes(keyToUse) || (contentTypeName && route.includes(contentTypeName));
      })
    );
  };

  const clearCache = () => {
    if (!keyToUse) {
      toggleNotification({
        type: 'warning',
        message: formatMessage({
          id: 'strapi-cache.cache.purge.no-content-type',
          defaultMessage: 'No content type found',
        }),
      });
      return;
    }

    post(`/strapi-cache/purge-cache/${keyToUse}`, undefined, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(() => {
        toggleNotification({
          type: 'success',
          message: formatMessage(
            {
              id: 'strapi-cache.cache.purge.success',
              defaultMessage: 'Cache purged successfully',
            },
            {
              key: `"${keyToUse}"`,
            }
          ),
        });
      })
      .catch(() => {
        toggleNotification({
          type: 'danger',
          message: formatMessage(
            {
              id: 'strapi-cache.cache.purge.error',
              defaultMessage: 'Error purging cache',
            },
            {
              key: `"${keyToUse}"`,
            }
          ),
        });
      });
  };

  if (!allowedActions.canPurgeCache || !isCacheableRoute()) {
    return null;
  }

  return (
    <Modal.Root>
      <Modal.Trigger>
        <Button width={buttonWidth} startIcon={<Archive />} variant="danger">
          {buttonText}
        </Button>
      </Modal.Trigger>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>{buttonText}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Typography variant="omega">
            {formatMessage(
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
            <PurgeButton onClick={clearCache}></PurgeButton>
          </Modal.Close>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}

export default PurgeModal;
