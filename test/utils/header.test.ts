import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Context } from 'koa';
import { getHeadersToStore, getCacheHeaderConfig } from '../../server/src/utils/header';

// Mock strapi global
const mockStrapi = {
  plugin: vi.fn().mockReturnThis(),
  config: vi.fn(),
};

// Set up global strapi mock
vi.stubGlobal('strapi', mockStrapi);

describe('getHeadersToStore', () => {
  let mockContext: Context;

  beforeEach(() => {
    mockContext = {
      response: {
        headers: {
          'content-type': 'application/json',
          'content-length': '1234',
          'cache-control': 'max-age=3600',
          'x-custom-header': 'custom-value',
          authorization: 'Bearer token',
          'set-cookie': 'session=abc123',
        },
      },
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when cacheHeaders is false', () => {
    const result = getHeadersToStore(mockContext, false);

    expect(result).toBeNull();
  });

  it('should return all headers when cacheHeaders is true and no lists provided', () => {
    const result = getHeadersToStore(mockContext, true);

    expect(result).toEqual(mockContext.response.headers);
  });

  it('should filter headers using allow list (case insensitive)', () => {
    const allowList = ['content-type', 'cache-control'];

    const result = getHeadersToStore(mockContext, true, allowList);

    expect(result).toEqual({
      'content-type': 'application/json',
      'cache-control': 'max-age=3600',
    });
  });

  it('should filter headers using deny list (case insensitive)', () => {
    const denyList = ['authorization', 'set-cookie'];

    const result = getHeadersToStore(mockContext, true, [], denyList);

    expect(result).toEqual({
      'content-type': 'application/json',
      'content-length': '1234',
      'cache-control': 'max-age=3600',
      'x-custom-header': 'custom-value',
    });
  });

  it('should combine allow and deny lists (allow takes precedence)', () => {
    const allowList = ['content-type', 'cache-control', 'authorization'];
    const denyList = ['cache-control'];

    const result = getHeadersToStore(mockContext, true, allowList, denyList);

    expect(result).toEqual({
      'content-type': 'application/json',
      authorization: 'Bearer token',
    });
  });

  it('should handle empty allow list', () => {
    const allowList: string[] = [];

    const result = getHeadersToStore(mockContext, true, allowList);

    expect(result).toEqual(mockContext.response.headers);
  });

  it('should handle empty deny list', () => {
    const denyList: string[] = [];

    const result = getHeadersToStore(mockContext, true, [], denyList);

    expect(result).toEqual(mockContext.response.headers);
  });

  it('should handle both empty lists', () => {
    const result = getHeadersToStore(mockContext, true, [], []);

    expect(result).toEqual(mockContext.response.headers);
  });

  it('should handle case insensitive header matching in allow list', () => {
    const allowList = ['content-type', 'cache-control'];

    const result = getHeadersToStore(mockContext, true, allowList);

    expect(result).toEqual({
      'content-type': 'application/json',
      'cache-control': 'max-age=3600',
    });
  });

  it('should handle case insensitive header matching in deny list', () => {
    const denyList = ['content-type', 'cache-control'];

    const result = getHeadersToStore(mockContext, true, [], denyList);

    expect(result).toEqual({
      'content-length': '1234',
      'x-custom-header': 'custom-value',
      authorization: 'Bearer token',
      'set-cookie': 'session=abc123',
    });
  });

  it('should handle context with no response headers', () => {
    const contextWithoutHeaders = {
      response: {
        headers: {},
      },
    } as Context;

    const result = getHeadersToStore(contextWithoutHeaders, true);

    expect(result).toEqual({});
  });

  it('should handle undefined allow list', () => {
    const result = getHeadersToStore(mockContext, true, undefined, []);

    expect(result).toEqual(mockContext.response.headers);
  });

  it('should handle undefined deny list', () => {
    const result = getHeadersToStore(mockContext, true, [], undefined);

    expect(result).toEqual(mockContext.response.headers);
  });
});

describe('getCacheHeaderConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementation for each test
    mockStrapi.plugin.mockReturnValue({
      config: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return correct config structure', () => {
    const mockConfig = mockStrapi.plugin().config;

    mockConfig.mockImplementation((key: string) => {
      switch (key) {
        case 'cacheHeaders':
          return true;
        case 'cacheHeadersDenyList':
          return ['authorization', 'set-cookie'];
        case 'cacheHeadersAllowList':
          return ['content-type', 'cache-control'];
        case 'cacheAuthorizedRequests':
          return false;
        default:
          return undefined;
      }
    });

    const result = getCacheHeaderConfig();

    expect(result).toEqual({
      cacheHeaders: true,
      cacheHeadersDenyList: ['authorization', 'set-cookie'],
      cacheHeadersAllowList: ['content-type', 'cache-control'],
      cacheAuthorizedRequests: false,
    });
  });

  it('should handle false cacheHeaders', () => {
    const mockConfig = mockStrapi.plugin().config;
    mockConfig.mockReturnValue(false);

    const result = getCacheHeaderConfig();

    expect(result.cacheHeaders).toBe(false);
  });

  it('should handle empty arrays for lists', () => {
    const mockConfig = mockStrapi.plugin().config;

    mockConfig.mockImplementation((key: string) => {
      switch (key) {
        case 'cacheHeaders':
          return true;
        case 'cacheHeadersDenyList':
          return [];
        case 'cacheHeadersAllowList':
          return [];
        case 'cacheAuthorizedRequests':
          return true;
        default:
          return undefined;
      }
    });

    const result = getCacheHeaderConfig();

    expect(result).toEqual({
      cacheHeaders: true,
      cacheHeadersDenyList: [],
      cacheHeadersAllowList: [],
      cacheAuthorizedRequests: true,
    });
  });

  it('should call strapi.plugin with correct plugin name', () => {
    getCacheHeaderConfig();

    expect(mockStrapi.plugin).toHaveBeenCalledWith('strapi-cache');
  });

  it('should call config method for all required keys', () => {
    const mockConfig = mockStrapi.plugin().config;

    getCacheHeaderConfig();

    expect(mockConfig).toHaveBeenCalledWith('cacheHeaders');
    expect(mockConfig).toHaveBeenCalledWith('cacheHeadersDenyList');
    expect(mockConfig).toHaveBeenCalledWith('cacheHeadersAllowList');
    expect(mockConfig).toHaveBeenCalledWith('cacheAuthorizedRequests');
  });
});
