import { TextInput, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import PurgeModal from '../PurgeModal';
import { useState } from 'react';

const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const [keyToUse, setKeyToUse] = useState<string>('');

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="alpha" as="h1">
        {formatMessage({
          id: 'strapi-cache.name',
          defaultMessage: 'Strapi Cache Settings',
        })}
      </Typography>

      <div style={{ marginTop: '16px', marginBottom: '16px' }}>
        <Typography variant="omega">
          {formatMessage({
            id: 'strapi-cache.settings.description',
            defaultMessage:
              'Enter a cache key below and click "Purge Cache" to clear specific cached content.',
          })}
        </Typography>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '400px',
          marginBottom: '16px',
        }}
      >
        <div style={{ flex: 1 }}>
          <TextInput
            placeholder={formatMessage({
              id: 'strapi-cache.settings.key-placeholder',
              defaultMessage: 'Enter cache key to purge',
            })}
            size="M"
            type="text"
            value={keyToUse}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyToUse(e.target.value)}
          />
        </div>
        <PurgeModal buttonText="Purge Cache" keyToUse={keyToUse} isSettingsPage />
      </div>
      <PurgeModal buttonText="Purge All" isPurgeAll isSettingsPage />
    </div>
  );
};

export default SettingsPage;
