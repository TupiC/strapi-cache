import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';

export default {
  register(app: any) {
    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });

    //   { id: String, intlLabel: { id: String, defaultMessage: String } }, // Section to create
    //   [
    //     // links
    //     {
    //       intlLabel: { id: String, defaultMessage: String },
    //       id: String,
    //       to: String,
    //       Component: myComponent,
    //       // permissions: Object[],
    //     },
    //   ]
    // );
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
