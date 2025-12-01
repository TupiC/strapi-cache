import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';
import PurgeCacheButton from './components/PurgeCacheButton';
import PurgeEntityButton from './components/PurgeEntityButton';

export default {
  register(app: any) {
    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });

    app.getPlugin('content-manager').injectComponent('listView', 'actions', {
      name: PurgeCacheButton,
      Component: PurgeCacheButton,
    });

    app.getPlugin('content-manager').injectComponent('editView', 'right-links', {
      name: PurgeEntityButton,
      Component: PurgeEntityButton,
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: 'strapi-cache.settings.link',
          defaultMessage: 'Strapi Cache',
        },
      },
      [
        {
          intlLabel: {
            id: 'strapi-cache.settings.link',
            defaultMessage: 'Strapi Cache',
          },
          id: 'settings',
          to: `${PLUGIN_ID}/settings`,
          Component: () => import('./components/SettingsPage'),
          permissions: [],
        },
      ]
    );
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);

          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
