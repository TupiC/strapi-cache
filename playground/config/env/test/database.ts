import path from 'path';

export default ({ env }) => {
  const client = env('DATABASE_CLIENT', 'sqlite');
  const filename = env('DATABASE_FILENAME', '.tmp/test.db');

  const connections = {
    sqlite: {
      connection: {
        filename: path.join(__dirname, '..', '..', '..', filename),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client as keyof typeof connections],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
