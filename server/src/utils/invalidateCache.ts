import { Core } from '@strapi/strapi';
import { CacheProvider } from 'src/types/cache.types';
import { loggy } from './log';
import { ContentTypeSchema } from '@strapi/types/dist/struct';

export async function invalidateCache(event: any, cacheStore: CacheProvider, strapi: Core.Strapi) {
  const { model } = event;
  const uid = model.uid;

  try {
    const contentType = strapi.contentType(uid);

    if (!contentType || !contentType.kind) {
      loggy.info(`Content type ${uid} not found`);
      return;
    }

    await clearCacheForContentType(contentType, cacheStore);

    const relatedContentTypes = await getRelatedContentTypes(event, strapi);
    console.log('relatedContentTypes', relatedContentTypes);

    for (const relatedContentType of relatedContentTypes) {
      const relatedContentTypeSchema = strapi.contentType(relatedContentType);
      if (relatedContentTypeSchema) {
        await clearCacheForContentType(relatedContentTypeSchema, cacheStore);
      }
    }
  } catch (error) {
    loggy.error('Cache invalidation error:');
    loggy.error(error);
  }
}

async function clearCacheForContentType(contentType: ContentTypeSchema, cacheStore: CacheProvider) {
  const contentTypeName =
    contentType.kind === 'singleType' ? contentType.info.singularName : contentType.info.pluralName;
  const apiPath = `/api/${contentTypeName}`;
  const regex = new RegExp(`^.*:${apiPath}(/.*)?(\\?.*)?$`);

  await cacheStore.clearByRegexp([regex]);
  loggy.info(`Invalidated cache for ${apiPath}`);
}

export async function invalidateGraphqlCache(cacheStore: CacheProvider) {
  try {
    const graphqlRegex = new RegExp(`^POST:\/graphql(:.*)?$`);

    await cacheStore.clearByRegexp([graphqlRegex]);
    loggy.info(`Invalidated cache for ${graphqlRegex}`);
  } catch (error) {
    loggy.error('Cache invalidation error:');
    loggy.error(error);
  }
}

async function getRelatedContentTypes(event: any, strapi: Core.Strapi): Promise<any[]> {
  const { model } = event;
  const uid = model.uid;

  try {
    const contentType = strapi.contentType(uid);
    const contentTypes = strapi.contentTypes;
    const components = strapi.components;

    const relatedComponents: string[] = [];
    const relatedModels: { [key: string]: any } = {};

    // direct relations from current model
    if (contentType.attributes) {
      for (const attr of Object.values(contentType.attributes)) {
        const attribute = attr as { type?: string; target?: string };
        if (attribute.type === 'relation' && attribute.target) {
          //@ts-ignore
          const targetModel = strapi.contentType(attribute.target);
          if (targetModel) {
            relatedModels[attribute.target] = targetModel;
          }
        }
      }
    }

    // components with relations pointing to current model
    for (const compKey in components) {
      if (!Object.prototype.hasOwnProperty.call(components, compKey)) continue;

      const comp = components[compKey];
      const attributes = comp.attributes || {};

      for (const attr of Object.values(attributes)) {
        const attribute = attr as { type?: string; target?: string };
        if (attribute.type === 'relation' && attribute.target === uid) {
          if (!relatedComponents.includes(compKey)) {
            relatedComponents.push(compKey);
          }
        }
      }
    }

    // nested components (components containing related components)
    for (const compKey in components) {
      if (!Object.prototype.hasOwnProperty.call(components, compKey)) continue;

      const comp = components[compKey];
      const attributes = comp.attributes || {};

      for (const attr of Object.values(attributes)) {
        const attribute = attr as { type?: string; component?: string };
        if (attribute.type === 'component' && attribute.component) {
          if (
            relatedComponents.includes(attribute.component) &&
            !relatedComponents.includes(compKey)
          ) {
            relatedComponents.push(compKey);
          }
        }
      }
    }

    // models using related components
    for (const modelKey in contentTypes) {
      if (!Object.prototype.hasOwnProperty.call(contentTypes, modelKey)) continue;

      const model = contentTypes[modelKey];
      const attributes = model.attributes || {};

      for (const attr of Object.values(attributes)) {
        const attribute = attr as { type?: string; component?: string };
        if (attribute.type === 'component' && attribute.component) {
          if (relatedComponents.includes(attribute.component) && !relatedModels[modelKey]) {
            relatedModels[modelKey] = model;
          }
        }
      }
    }

    // dynamic zones
    for (const modelKey in contentTypes) {
      if (!Object.prototype.hasOwnProperty.call(contentTypes, modelKey)) continue;
      const model = contentTypes[modelKey];
      const attributes = model.attributes || {};
      for (const attr of Object.values(attributes)) {
        const attribute = attr as { type?: string; components?: string[] };
        if (attribute.type === 'dynamiczone' && attribute.components) {
          for (const component of attribute.components) {
            if (relatedComponents.includes(component) && !relatedModels[modelKey]) {
              relatedModels[modelKey] = model;
            }
          }
        }
      }
    }

    const relatedModelUids = Object.keys(relatedModels);
    return Array.from(new Set(relatedModelUids));
  } catch (error) {
    loggy.error('Error getting related content types:');
    loggy.error(error);
    return [];
  }
}
