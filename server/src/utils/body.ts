import { Stream } from 'stream';
import { createGunzip, createBrotliDecompress, createInflate } from 'zlib';

export type WireReadyBodyType = 'json' | 'string' | 'buffer' | 'empty';
export type WireReadyBodyValue = string | Buffer | null | undefined;

export interface WireReadyBody {
  body: WireReadyBodyValue;
  bodyType: WireReadyBodyType;
}

const supportedContentEncodings = new Set(['br', 'deflate', 'gzip', 'identity']);
const isJsonContentType = (contentType?: string): boolean =>
  Boolean(contentType?.toLowerCase().includes('json'));

export const streamToBuffer = (stream: Stream): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

export const toWireReadyBody = async (
  body: unknown,
  contentType?: string
): Promise<WireReadyBody> => {
  if (body instanceof Stream) {
    return { body: await streamToBuffer(body), bodyType: 'buffer' };
  }

  if (Buffer.isBuffer(body)) {
    return { body, bodyType: isJsonContentType(contentType) ? 'json' : 'buffer' };
  }

  if (typeof body === 'string') {
    return { body, bodyType: isJsonContentType(contentType) ? 'json' : 'string' };
  }

  if (body == null) {
    return { body: body === null ? null : undefined, bodyType: 'empty' };
  }

  return { body: JSON.stringify(body), bodyType: 'json' };
};

export const normalizeStreamForCache = async (
  body: Buffer,
  contentEncoding?: string,
  contentType?: string
): Promise<WireReadyBody | null> => {
  const encoding = contentEncoding?.trim().toLowerCase();
  if (encoding && !supportedContentEncodings.has(encoding)) {
    return null;
  }

  const normalizedBody =
    encoding && encoding !== 'identity' ? await decompressBuffer(body, encoding) : body;
  const bodyType = isJsonContentType(contentType) ? 'json' : 'buffer';

  return { body: normalizedBody, bodyType };
};

export const restoreCachedBody = (body: unknown): unknown => {
  if (
    body &&
    typeof body === 'object' &&
    (body as { type?: unknown }).type === 'Buffer' &&
    Array.isArray((body as { data?: unknown }).data)
  ) {
    return Buffer.from((body as { data: number[] }).data);
  }

  return body;
};

export const decompressBuffer = async (buffer: Buffer, encoding?: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    let decompressStream;
    switch (encoding) {
      case 'gzip':
        decompressStream = createGunzip();
        break;
      case 'br':
        decompressStream = createBrotliDecompress();
        break;
      case 'deflate':
        decompressStream = createInflate();
        break;
      default:
        return resolve(buffer);
    }

    const chunks: Buffer[] = [];
    decompressStream.on('data', (chunk) => chunks.push(chunk));
    decompressStream.on('end', () => resolve(Buffer.concat(chunks)));
    decompressStream.on('error', reject);

    decompressStream.end(buffer);
  });
};

export const decodeBufferToText = (buffer: Buffer): string => {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(buffer);
};
