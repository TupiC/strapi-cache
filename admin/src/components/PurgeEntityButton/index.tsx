import { unstable_useContentManagerContext as useContentManagerContext } from '@strapi/strapi/admin';
import PurgeModal from '../PurgeModal';
import { useIntl } from 'react-intl';

function PurgeEntityButton() {
  const { formatMessage } = useIntl();
  const { isSingleType, contentType } = useContentManagerContext();
  const pluralName =
    contentType?.kind === 'singleType'
      ? contentType?.info?.singularName
      : contentType?.info?.pluralName;
  const apiPath = `${pluralName}`;
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
