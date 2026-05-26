import { unstable_useContentManagerContext as useContentManagerContext } from '@strapi/strapi/admin';
import PurgeModal from '../PurgeModal';
import { useIntl } from 'react-intl';
import { useCacheConfig } from '../../hooks';
import { getContentTypeApiPath, shouldDisableAdminButtons } from '../../utils/adminButtons';

function PurgeCacheButton() {
  const { contentType } = useContentManagerContext();
  const { formatMessage } = useIntl();
  const { config } = useCacheConfig();
  const keyToUse = contentType?.info.pluralName;
  const contentTypeApiPath = getContentTypeApiPath(contentType);

  if (shouldDisableAdminButtons(config?.disableAdminButtons, contentTypeApiPath)) {
    return null;
  }

  return (
    <PurgeModal
      buttonText={formatMessage({
        id: 'strapi-cache.cache.purge',
        defaultMessage: 'Purge Cache',
      })}
      keyToUse={keyToUse}
    ></PurgeModal>
  );
}

export default PurgeCacheButton;
