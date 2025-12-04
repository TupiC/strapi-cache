import { describe, it, expect } from 'vitest';
import {
  generateCacheKey,
  generateGraphqlCacheKey,
  escapeRegExp,
} from '../../server/src/utils/key';
import { Context } from 'koa';

describe('generateCacheKey', () => {
  it('should generate cache key from context method and url', () => {
    const mockContext = {
      request: {
        url: '/api/articles',
        method: 'GET',
      },
    } as Context;

    const result = generateCacheKey(mockContext);
    expect(result).toBe('GET:/api/articles');
  });

  it('should handle different HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    methods.forEach((method) => {
      const mockContext = {
        request: {
          url: '/api/test',
          method,
        },
      } as Context;

      const result = generateCacheKey(mockContext);
      expect(result).toBe(`${method}:/api/test`);
    });
  });

  it('should handle URLs with query parameters', () => {
    const mockContext = {
      request: {
        url: '/api/articles?populate=*&sort=title',
        method: 'GET',
      },
    } as Context;

    const result = generateCacheKey(mockContext);
    expect(result).toBe('GET:/api/articles?populate=*&sort=title');
  });

  it('should handle URLs with special characters', () => {
    const mockContext = {
      request: {
        url: '/api/articles/123?title=test&category=news&tags[]=tech&tags[]=web',
        method: 'GET',
      },
    } as Context;

    const result = generateCacheKey(mockContext);
    expect(result).toBe('GET:/api/articles/123?title=test&category=news&tags[]=tech&tags[]=web');
  });
});

describe('generateGraphqlCacheKey', () => {
  it('should generate GraphQL cache key with hashed payload', () => {
    const payload = '{ user(id: 1) { name email } }';
    const result = generateGraphqlCacheKey(payload);

    expect(result).toMatch(/^POST:\/graphql:[A-Za-z0-9_-]+$/);
    expect(result.startsWith('POST:/graphql:')).toBe(true);
  });

  it('should generate consistent hash for same payload', () => {
    const payload = '{ articles { title content } }';
    const result1 = generateGraphqlCacheKey(payload);
    const result2 = generateGraphqlCacheKey(payload);

    expect(result1).toBe(result2);
  });

  it('should generate different hashes for different payloads', () => {
    const payload1 = '{ user(id: 1) { name } }';
    const payload2 = '{ user(id: 2) { name } }';

    const result1 = generateGraphqlCacheKey(payload1);
    const result2 = generateGraphqlCacheKey(payload2);

    expect(result1).not.toBe(result2);
  });

  it('should handle empty payload', () => {
    const payload = '';
    const result = generateGraphqlCacheKey(payload);

    expect(result).toMatch(/^POST:\/graphql:[A-Za-z0-9_-]+$/);
  });

  it('should handle large payloads', () => {
    const payload = 'x'.repeat(10000);
    const result = generateGraphqlCacheKey(payload);

    expect(result).toMatch(/^POST:\/graphql:[A-Za-z0-9_-]+$/);
  });

  it('should handle special characters in payload', () => {
    const payload = '{ query: "test with spaces & symbols !@#$%^&*()" }';
    const result = generateGraphqlCacheKey(payload);

    expect(result).toMatch(/^POST:\/graphql:[A-Za-z0-9_-]+$/);
  });
});

describe('escapeRegExp', () => {
  it('should escape all special regex characters', () => {
    const input = '.*+?^${}()|[]\\';
    const result = escapeRegExp(input);
    expect(result).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  it('should not modify normal characters', () => {
    const input = 'hello world 123';
    const result = escapeRegExp(input);
    expect(result).toBe('hello world 123');
  });

  it('should handle empty string', () => {
    const input = '';
    const result = escapeRegExp(input);
    expect(result).toBe('');
  });

  it('should handle strings with mixed special and normal characters', () => {
    const input = 'test.*pattern^here';
    const result = escapeRegExp(input);
    expect(result).toBe('test\\.\\*pattern\\^here');
  });

  it('should escape square brackets properly', () => {
    const input = '[abc]';
    const result = escapeRegExp(input);
    expect(result).toBe('\\[abc\\]');
  });

  it('should escape parentheses properly', () => {
    const input = '(test)';
    const result = escapeRegExp(input);
    expect(result).toBe('\\(test\\)');
  });

  it('should escape curly braces properly', () => {
    const input = '{1,3}';
    const result = escapeRegExp(input);
    expect(result).toBe('\\{1,3\\}');
  });

  it('should escape pipe character properly', () => {
    const input = 'a|b';
    const result = escapeRegExp(input);
    expect(result).toBe('a\\|b');
  });

  it('should escape plus character properly', () => {
    const input = 'a+';
    const result = escapeRegExp(input);
    expect(result).toBe('a\\+');
  });

  it('should escape asterisk character properly', () => {
    const input = 'a*';
    const result = escapeRegExp(input);
    expect(result).toBe('a\\*');
  });

  it('should escape question mark properly', () => {
    const input = 'a?';
    const result = escapeRegExp(input);
    expect(result).toBe('a\\?');
  });

  it('should escape caret properly', () => {
    const input = '^start';
    const result = escapeRegExp(input);
    expect(result).toBe('\\^start');
  });

  it('should escape dollar sign properly', () => {
    const input = 'end$';
    const result = escapeRegExp(input);
    expect(result).toBe('end\\$');
  });

  it('should escape backslash properly', () => {
    const input = 'test\\path';
    const result = escapeRegExp(input);
    expect(result).toBe('test\\\\path');
  });
});
