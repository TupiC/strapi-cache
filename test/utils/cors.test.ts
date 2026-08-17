import { describe, expect, it, vi } from 'vitest';
import { applyCorsHeaders, getCorsConfig, resolveCorsOrigin } from '../../server/src/utils/cors';

describe('getCorsConfig', () => {
  it('recognizes the standard string middleware entry', () => {
    expect(getCorsConfig(['strapi::security', 'strapi::cors'])).toEqual({});
  });

  it('returns object-form middleware configuration', () => {
    const config = { origin: ['https://example.test'], credentials: false };
    expect(getCorsConfig([{ name: 'strapi::cors', config }])).toBe(config);
  });

  it('returns null when CORS is not configured', () => {
    expect(getCorsConfig(['strapi::security'])).toBeNull();
  });
});

describe('resolveCorsOrigin', () => {
  const context = (origin?: string) => ({ request: { headers: { origin } } });

  it('reflects the request origin for the default wildcard', async () => {
    await expect(resolveCorsOrigin(context('https://example.test'), {})).resolves.toBe(
      'https://example.test'
    );
  });

  it('supports comma-separated and array origin configuration', async () => {
    await expect(
      resolveCorsOrigin(context('https://b.test'), { origin: 'https://a.test, https://b.test' })
    ).resolves.toBe('https://b.test');
    await expect(
      resolveCorsOrigin(context('https://b.test'), { origin: ['https://a.test'] })
    ).resolves.toBe('');
  });

  it('supports asynchronous origin functions', async () => {
    const origin = vi.fn().mockResolvedValue(['https://example.test']);
    const ctx = context('https://example.test');

    await expect(resolveCorsOrigin(ctx, { origin })).resolves.toBe('https://example.test');
    expect(origin).toHaveBeenCalledWith(ctx);
  });

  it('uses a wildcard when the request has no origin', async () => {
    await expect(resolveCorsOrigin(context(), { origin: [] })).resolves.toBe('*');
  });
});

describe('applyCorsHeaders', () => {
  it('replaces cached CORS headers with per-request values and defaults credentials to true', () => {
    const headers = new Map<string, string>([
      ['Access-Control-Allow-Origin', 'https://stale.test'],
      ['Access-Control-Allow-Credentials', 'false'],
    ]);
    const ctx = {
      set: vi.fn((key: string, value: string) => headers.set(key, value)),
      remove: vi.fn((key: string) => headers.delete(key)),
      vary: vi.fn(),
    };

    applyCorsHeaders(ctx, { expose: ['X-Request-Id', 'X-Total'] }, 'https://example.test');

    expect(headers.get('Access-Control-Allow-Origin')).toBe('https://example.test');
    expect(headers.get('Access-Control-Allow-Credentials')).toBe('true');
    expect(headers.get('Access-Control-Expose-Headers')).toBe('X-Request-Id,X-Total');
    expect(ctx.vary).toHaveBeenCalledWith('Origin');
  });

  it('removes stale CORS headers for a disallowed origin', () => {
    const headers = new Map<string, string>([['Access-Control-Allow-Origin', '*']]);
    const ctx = {
      set: vi.fn(),
      remove: vi.fn((key: string) => headers.delete(key)),
    };

    applyCorsHeaders(ctx, {}, '');

    expect(headers.has('Access-Control-Allow-Origin')).toBe(false);
    expect(ctx.set).not.toHaveBeenCalled();
  });
});
