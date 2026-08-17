import { describe, it, expect } from 'vitest';
import { Readable } from 'stream';
import { gzipSync, brotliCompressSync, deflateSync } from 'zlib';
import {
  streamToBuffer,
  decompressBuffer,
  decodeBufferToText,
  normalizeStreamForCache,
  restoreCachedBody,
  toWireReadyBody,
} from '../../server/src/utils/body';

describe('toWireReadyBody', () => {
  it('serializes JSON bodies once', async () => {
    const body = { data: { articles: [] } };

    await expect(toWireReadyBody(body)).resolves.toEqual({
      body: JSON.stringify(body),
      bodyType: 'json',
    });
  });

  it('preserves stream bytes', async () => {
    const body = Buffer.from([0x00, 0xff, 0x01]);

    await expect(toWireReadyBody(Readable.from(body))).resolves.toEqual({
      body,
      bodyType: 'buffer',
    });
  });

  it('uses the response content type for pre-serialized JSON strings and buffers', async () => {
    const body = '{"data":[]}';

    await expect(toWireReadyBody(body, 'application/json; charset=utf-8')).resolves.toEqual({
      body,
      bodyType: 'json',
    });
    await expect(toWireReadyBody(Buffer.from(body), 'application/problem+json')).resolves.toEqual({
      body: Buffer.from(body),
      bodyType: 'json',
    });
  });
});

describe('restoreCachedBody', () => {
  it('restores Buffer values from legacy serialized cache entries', () => {
    const body = [0, 255, 1];

    expect(restoreCachedBody({ type: 'Buffer', data: body })).toEqual(Buffer.from(body));
  });
});

describe('normalizeStreamForCache', () => {
  it('decompresses a gzip JSON stream and marks its identity bytes as JSON', async () => {
    const body = Buffer.from('{"data":[]}');

    await expect(
      normalizeStreamForCache(gzipSync(body), 'GZIP', 'application/problem+json; charset=utf-8')
    ).resolves.toEqual({ body, bodyType: 'json' });
  });

  it('preserves an identity binary stream', async () => {
    const body = Buffer.from([0x00, 0xff, 0x01]);

    await expect(
      normalizeStreamForCache(body, 'identity', 'application/octet-stream')
    ).resolves.toEqual({ body, bodyType: 'buffer' });
  });

  it('refuses an unsupported content encoding', async () => {
    await expect(
      normalizeStreamForCache(Buffer.from('encoded'), 'zstd', 'application/json')
    ).resolves.toBeNull();
  });
});

describe('streamToBuffer', () => {
  it('should convert a readable stream to buffer', async () => {
    const testData = 'Hello, World!';
    const stream = new Readable({
      read() {
        this.push(testData);
        this.push(null);
      },
    });

    const result = await streamToBuffer(stream);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe(testData);
  });

  it('should handle empty stream', async () => {
    const stream = new Readable({
      read() {
        this.push(null);
      },
    });

    const result = await streamToBuffer(stream);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBe(0);
  });

  it('should handle large stream data', async () => {
    const largeData = 'x'.repeat(1000);
    const stream = new Readable({
      read() {
        this.push(largeData);
        this.push(null);
      },
    });

    const result = await streamToBuffer(stream);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe(largeData);
  });

  it('should handle binary data', async () => {
    const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff]);
    const stream = Readable.from(binaryData);

    const result = await streamToBuffer(stream);

    expect(result).toBeInstanceOf(Buffer);
    expect(result).toEqual(binaryData);
  });

  it('should handle stream with multiple chunks', async () => {
    const chunks = ['chunk1', 'chunk2', 'chunk3'];
    const stream = new Readable({
      read() {
        if (chunks.length > 0) {
          this.push(chunks.shift());
        } else {
          this.push(null);
        }
      },
    });

    const result = await streamToBuffer(stream);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe('chunk1chunk2chunk3');
  });

  it('should reject on stream error', async () => {
    const error = new Error('Stream error');
    const stream = new Readable({
      read() {
        // Emit error immediately
        this.emit('error', error);
      },
    });

    await expect(streamToBuffer(stream)).rejects.toThrow('Stream error');
  });
});

describe('decompressBuffer', () => {
  it('should decompress gzip encoded buffer', async () => {
    const originalData = 'Hello, World! This is test data for gzip compression.';
    const compressedData = gzipSync(Buffer.from(originalData));

    const result = await decompressBuffer(compressedData, 'gzip');

    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe(originalData);
  });

  it('should decompress brotli encoded buffer', async () => {
    const originalData = 'Hello, World! This is test data for brotli compression.';
    const compressedData = brotliCompressSync(Buffer.from(originalData));

    const result = await decompressBuffer(compressedData, 'br');

    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe(originalData);
  });

  it('should decompress deflate encoded buffer', async () => {
    const originalData = 'Hello, World! This is test data for deflate compression.';
    const compressedData = deflateSync(Buffer.from(originalData));

    const result = await decompressBuffer(compressedData, 'deflate');

    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe(originalData);
  });

  it('should return buffer unchanged for unknown encoding', async () => {
    const originalData = Buffer.from('Hello, World!');
    const result = await decompressBuffer(originalData, 'unknown');

    expect(result).toBe(originalData);
  });

  it('should return buffer unchanged when no encoding provided', async () => {
    const originalData = Buffer.from('Hello, World!');
    const result = await decompressBuffer(originalData);

    expect(result).toBe(originalData);
  });

  it('should reject on empty gzip buffer', async () => {
    const emptyBuffer = Buffer.alloc(0);

    await expect(decompressBuffer(emptyBuffer, 'gzip')).rejects.toThrow();
  });

  it('should reject on decompression error', async () => {
    // Create an invalid gzip buffer
    const invalidGzipData = Buffer.from('invalid gzip data');

    await expect(decompressBuffer(invalidGzipData, 'gzip')).rejects.toThrow();
  });
});

describe('decodeBufferToText', () => {
  it('should decode UTF-8 buffer to string', () => {
    const testString = 'Hello, World! 🌍 你好 こんにちは';
    const buffer = Buffer.from(testString, 'utf-8');

    const result = decodeBufferToText(buffer);

    expect(result).toBe(testString);
  });

  it('should handle ASCII text', () => {
    const testString = 'Simple ASCII text';
    const buffer = Buffer.from(testString);

    const result = decodeBufferToText(buffer);

    expect(result).toBe(testString);
  });

  it('should handle empty buffer', () => {
    const buffer = Buffer.alloc(0);

    const result = decodeBufferToText(buffer);

    expect(result).toBe('');
  });

  it('should handle JSON-like data', () => {
    const jsonString = '{"key": "value", "number": 123, "array": [1, 2, 3]}';
    const buffer = Buffer.from(jsonString);

    const result = decodeBufferToText(buffer);

    expect(result).toBe(jsonString);
  });

  it('should handle HTML content', () => {
    const htmlContent = '<html><body><h1>Hello World</h1></body></html>';
    const buffer = Buffer.from(htmlContent);

    const result = decodeBufferToText(buffer);

    expect(result).toBe(htmlContent);
  });

  it('should handle special characters and emojis', () => {
    const specialString = 'Special chars: àáâãäå, éèêë, ñ, ü. Emojis: 😀🎉🚀';
    const buffer = Buffer.from(specialString, 'utf-8');

    const result = decodeBufferToText(buffer);

    expect(result).toBe(specialString);
  });
});
