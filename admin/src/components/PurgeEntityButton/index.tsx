import { unstable_useContentManagerContext as useContentManagerContext } from '@strapi/strapi/admin';
import PurgeModal from '../PurgeModal';
import { useIntl } from 'react-intl';
import { useCacheConfig } from '../../hooks';

function PurgeEntityButton() {
  const { formatMessage } = useIntl();
  const { id, isSingleType, contentType } = useContentManagerContext();
  const { config } = useCacheConfig();
  const apiPath = isSingleType ? contentType?.info.singularName : id;

  if (!apiPath) {
    return null;
  }

  if (config?.disableAdminButtons) {
    return null;
  }

  const keyToUse = encodeURIComponent(apiPath);
  const contentTypeName = isSingleType
    ? contentType?.info.singularName
    : contentType?.info.pluralName;

  return (
    <PurgeModal
      buttonWidth="100%"
      buttonText={formatMessage({
        id: 'strapi-cache.cache.purge.entity',
        defaultMessage: 'Purge Entity Cache',
      })}
      keyToUse={keyToUse}
      contentTypeName={contentTypeName}
    ></PurgeModal>
  );
}

export default PurgeEntityButton;
