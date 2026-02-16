/** @type {import('jest').Config} */
module.exports = {
  roots: ['<rootDir>'],
  testEnvironment: 'node',
  testRegex: 'test/integration/.*\\.test\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '\\.tmp', '\\.cache', '/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/playground/.yalc'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: false,
        tsconfig: {
          esModuleInterop: true,
          types: ['jest', 'node'],
        },
      },
    ],
  },
  testTimeout: 60000,
  setupFiles: ['<rootDir>/test/integration/jest.env.js'],
  setupFilesAfterEnv: [],
};
