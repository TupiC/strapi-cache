import path from 'path';
import { createStrapi } from '@strapi/strapi';
import type { Core } from '@strapi/types';

let instance: Core.Strapi | null = null;

export async function setupStrapi(): Promise<Core.Strapi> {
  if (instance) {
    return instance;
  }

  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.APP_KEYS = process.env.APP_KEYS || 'testKeyOne,testKeyTwo';
  process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'test-api-token-salt';
  process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'test-admin-jwt-secret';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  process.env.TRANSFER_TOKEN_SALT =
    process.env.TRANSFER_TOKEN_SALT || 'test-transfer-token-salt';
  process.env.DATABASE_FILENAME = process.env.DATABASE_FILENAME || '.tmp/test.db';

  const appDir = path.resolve(__dirname, '../../playground');

  instance = await createStrapi({
    appDir,
    distDir: path.join(appDir, 'dist'),
  }).load();

  await instance.start();

  return instance;
}

export async function cleanupStrapi(): Promise<void> {
  if (!instance) {
    return;
  }

  const dbSettings = instance.config.get('database.connection') as {
    connection?: { filename?: string };
    filename?: string;
  };

  await instance.server.httpServer.close();
  await instance.db.connection.destroy();

  if (typeof instance.destroy === 'function') {
    await instance.destroy();
  }

  instance = null;

  // Clean up SQLite test database file if it exists
  const filePath = dbSettings?.connection?.filename ?? dbSettings?.filename;
  if (filePath && typeof filePath === 'string' && !filePath.includes(':memory:')) {
    const fs = await import('fs');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
