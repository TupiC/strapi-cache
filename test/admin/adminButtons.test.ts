import { describe, expect, it } from 'vitest';
import { getContentTypeApiPath, shouldDisableAdminButtons } from '../../admin/src/utils/adminButtons';

describe('adminButtons', () => {
  describe('getContentTypeApiPath', () => {
    it('returns the collection REST path for collection types', () => {
      expect(
        getContentTypeApiPath({
          apiID: 'product',
          kind: 'collectionType',
          info: {
            pluralName: 'products',
            singularName: 'product',
          },
        })
      ).toBe('/api/products');
    });

    it('returns the single type REST path for single types', () => {
      expect(
        getContentTypeApiPath(
          {
            apiID: 'homepage',
            kind: 'singleType',
            info: {
              pluralName: 'homepages',
              singularName: 'homepage',
            },
          },
          true
        )
      ).toBe('/api/homepage');
    });
  });

  describe('shouldDisableAdminButtons', () => {
    it('keeps the existing global boolean behavior', () => {
      expect(shouldDisableAdminButtons(true, '/api/products')).toBe(true);
      expect(shouldDisableAdminButtons(false, '/api/products')).toBe(false);
    });

    it('disables buttons only for configured collection paths', () => {
      const disableAdminButtons = ['/api/products', '/api/tags'];

      expect(shouldDisableAdminButtons(disableAdminButtons, '/api/products')).toBe(true);
      expect(shouldDisableAdminButtons(disableAdminButtons, '/api/tags')).toBe(true);
      expect(shouldDisableAdminButtons(disableAdminButtons, '/api/articles')).toBe(false);
    });

    it('normalizes configured paths before matching', () => {
      expect(shouldDisableAdminButtons(['api/products/'], '/api/products')).toBe(true);
    });

    it('does not disable buttons when the current content type path is unavailable', () => {
      expect(shouldDisableAdminButtons(['/api/products'])).toBe(false);
    });
  });
});
