import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';

export default {
  register(app: any) {
    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `strapi-cache.name`,
          defaultMessage: `Strapi Cache`,
        },
      },
      [
        {
          intlLabel: {
            id: `strapi-cache.settings`,
            defaultMessage: 'Cache Settings',
          },
          id: 'settings',
          to: `${PLUGIN_ID}`,
          Component: () => {
            return import('./pages/SettingsPage');
          },
        },
      ]
    );

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
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
