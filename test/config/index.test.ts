import { describe, it, expect, vi } from 'vitest';
import config from '../../server/src/config/index';

describe('config', () => {
  describe('default', () => {
    it('should return default configuration with env function', () => {
      const mockEnv = vi.fn((key: string) => {
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      });

      const result = config.default({ env: mockEnv });

      expect(result).toEqual({
        debug: false,
        max: 1000,
        ttl: 1000 * 60 * 60,
        size: 1024 * 1024 * 10,
        allowStale: false,
        cacheableRoutes: [],
        provider: 'memory',
        excludeRoutes: [],
        redisConfig: 'redis://localhost:6379',
        redisClusterNodes: [],
        redisClusterOptions: {},
        cacheHeaders: true,
        cacheHeadersDenyList: [],
        cacheHeadersAllowList: [],
        cacheAuthorizedRequests: false,
        cacheGetTimeoutInMs: 1000,
        autoPurgeCache: true,
        autoPurgeCacheOnStart: true,
        disableAdminPopups: false,
      });
    });

    it('should handle undefined REDIS_URL', () => {
      const mockEnv = vi.fn(() => undefined);

      const result = config.default({ env: mockEnv });

      expect(result.redisConfig).toBeUndefined();
    });
  });

  describe('validator', () => {
    const validConfig = {
      debug: false,
      max: 1000,
      ttl: 1000 * 60 * 60,
      size: 1024 * 1024 * 10,
      allowStale: false,
      cacheableRoutes: [],
      provider: 'memory',
      excludeRoutes: [],
      redisConfig: undefined,
      redisClusterNodes: [],
      redisClusterOptions: {},
      cacheHeaders: true,
      cacheHeadersDenyList: [],
      cacheHeadersAllowList: [],
      cacheAuthorizedRequests: false,
      cacheGetTimeoutInMs: 1000,
      autoPurgeCache: true,
      autoPurgeCacheOnStart: true,
      disableAdminPopups: false,
    };

    it('should not throw for valid configuration', () => {
      expect(() => config.validator(validConfig)).not.toThrow();
    });

    describe('debug validation', () => {
      it('should throw for non-boolean debug', () => {
        const invalidConfig = { ...validConfig, debug: 'true' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: debug must be a boolean'
        );
      });
    });

    describe('max validation', () => {
      it('should throw for non-number max', () => {
        const invalidConfig = { ...validConfig, max: '1000' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: max must be a number'
        );
      });
    });

    describe('ttl validation', () => {
      it('should throw for non-number ttl', () => {
        const invalidConfig = { ...validConfig, ttl: '3600000' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: ttl must be a number'
        );
      });
    });

    describe('size validation', () => {
      it('should throw for non-number size', () => {
        const invalidConfig = { ...validConfig, size: '10485760' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: size must be a number'
        );
      });
    });

    describe('allowStale validation', () => {
      it('should throw for non-boolean allowStale', () => {
        const invalidConfig = { ...validConfig, allowStale: 'false' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: allowStale must be a boolean'
        );
      });
    });

    describe('cacheableRoutes validation', () => {
      it('should throw for non-array cacheableRoutes', () => {
        const invalidConfig = { ...validConfig, cacheableRoutes: 'invalid' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: cacheableRoutes must be an string array'
        );
      });

      it('should throw for array with non-string elements', () => {
        const invalidConfig = { ...validConfig, cacheableRoutes: ['/api', 123] };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: cacheableRoutes must be an string array'
        );
      });
    });

    describe('excludeRoutes validation', () => {
      it('should throw for non-array excludeRoutes', () => {
        const invalidConfig = { ...validConfig, excludeRoutes: 'invalid' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: excludeRoutes must be a string array'
        );
      });

      it('should throw for array with non-string elements', () => {
        const invalidConfig = { ...validConfig, excludeRoutes: ['/admin', true] };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: excludeRoutes must be a string array'
        );
      });
    });

    describe('provider validation', () => {
      it('should throw for non-string provider', () => {
        const invalidConfig = { ...validConfig, provider: 123 };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: provider must be a string'
        );
      });

      it('should throw for invalid provider value', () => {
        const invalidConfig = { ...validConfig, provider: 'invalid' };

        expect(() => config.validator(invalidConfig)).toThrow(
          "Invalid config: provider must be 'memory' or 'redis'"
        );
      });
    });

    describe('redis provider validation', () => {
      const redisConfig = {
        ...validConfig,
        provider: 'redis' as const,
        redisConfig: 'redis://localhost:6379',
      };

      it('should accept valid redis configuration', () => {
        expect(() => config.validator(redisConfig)).not.toThrow();
      });

      it('should throw when redisConfig is not set', () => {
        const invalidConfig = { ...redisConfig, redisConfig: undefined };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: redisConfig must be set when using redis provider'
        );
      });

      it('should throw for invalid redisConfig type', () => {
        const invalidConfig = { ...redisConfig, redisConfig: 123 };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: redisConfig must be a string or object when using redis provider'
        );
      });

      it('should accept object redisConfig', () => {
        const validRedisConfig = {
          ...redisConfig,
          redisConfig: { host: 'localhost', port: 6379 },
        };

        expect(() => config.validator(validRedisConfig)).not.toThrow();
      });

      it('should throw for invalid redisClusterNodes', () => {
        const invalidConfig = { ...redisConfig, redisClusterNodes: 'invalid' };

        expect(() => config.validator(invalidConfig)).toThrow(
          "Invalid config: redisClusterNodes must be as a list of objects with keys 'host' and 'port'"
        );
      });

      it('should throw for redisClusterNodes with invalid objects', () => {
        const invalidConfig = {
          ...redisConfig,
          redisClusterNodes: [{ host: 'localhost' }, { port: 6379 }],
        };

        expect(() => config.validator(invalidConfig)).toThrow(
          "Invalid config: redisClusterNodes must be as a list of objects with keys 'host' and 'port'"
        );
      });

      it('should accept valid redisClusterNodes', () => {
        const validRedisConfig = {
          ...redisConfig,
          redisClusterNodes: [
            { host: 'localhost', port: 6379 },
            { host: 'localhost', port: 6380 },
          ],
        };

        expect(() => config.validator(validRedisConfig)).not.toThrow();
      });

      it('should throw for invalid redisClusterOptions', () => {
        const invalidConfig = { ...redisConfig, redisClusterOptions: 'invalid' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: redisClusterOptions must be an object'
        );
      });
    });

    describe('cacheHeaders validation', () => {
      it('should throw for non-boolean cacheHeaders', () => {
        const invalidConfig = { ...validConfig, cacheHeaders: 'true' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: cacheHeaders must be a boolean'
        );
      });
    });

    describe('cacheHeadersDenyList validation', () => {
      it('should throw for non-array cacheHeadersDenyList', () => {
        const invalidConfig = { ...validConfig, cacheHeadersDenyList: 'invalid' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: cacheHeadersDenyList must be an string array'
        );
      });

      it('should throw for array with non-string elements', () => {
        const invalidConfig = { ...validConfig, cacheHeadersDenyList: ['authorization', 123] };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: cacheHeadersDenyList must be an string array'
        );
      });
    });

    describe('cacheHeadersAllowList validation', () => {
      it('should throw for non-array cacheHeadersAllowList', () => {
        const invalidConfig = { ...validConfig, cacheHeadersAllowList: 'invalid' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: cacheHeadersAllowList must be an string array'
        );
      });

      it('should throw for array with non-string elements', () => {
        const invalidConfig = { ...validConfig, cacheHeadersAllowList: ['content-type', true] };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: cacheHeadersAllowList must be an string array'
        );
      });
    });

    describe('cacheAuthorizedRequests validation', () => {
      it('should throw for non-boolean cacheAuthorizedRequests', () => {
        const invalidConfig = { ...validConfig, cacheAuthorizedRequests: 'false' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: cacheAuthorizedRequests must be a boolean'
        );
      });
    });

    describe('cacheGetTimeoutInMs validation', () => {
      it('should throw for non-number cacheGetTimeoutInMs', () => {
        const invalidConfig = { ...validConfig, cacheGetTimeoutInMs: '1000' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: cacheGetTimeoutInMs must be a number'
        );
      });
    });

    describe('autoPurgeCache validation', () => {
      it('should throw for non-boolean autoPurgeCache', () => {
        const invalidConfig = { ...validConfig, autoPurgeCache: 'true' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: autoPurgeCache must be a boolean'
        );
      });
    });

    describe('autoPurgeCacheOnStart validation', () => {
      it('should throw for non-boolean autoPurgeCacheOnStart', () => {
        const invalidConfig = { ...validConfig, autoPurgeCacheOnStart: 'true' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: autoPurgeCacheOnStart must be a boolean'
        );
      });
    });

    describe('disableAdminPopups validation', () => {
      it('should throw for non-boolean disableAdminPopups', () => {
        const invalidConfig = { ...validConfig, disableAdminPopups: 'false' };

        expect(() => config.validator(invalidConfig)).toThrow(
          'Invalid config: disableAdminPopups must be a boolean'
        );
      });
    });
  });
});
