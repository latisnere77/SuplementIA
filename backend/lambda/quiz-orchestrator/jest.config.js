module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageThreshold: {
    // Per-file thresholds for tested modules
    './src/query-suggestions.ts': {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95,
    },
  },
};
