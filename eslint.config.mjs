import nextVitals from 'eslint-config-next/core-web-vitals';
import typescriptEslint from '@typescript-eslint/eslint-plugin';

const generatedIgnores = {
  ignores: [
    '.next/**',
    'node_modules/**',
    'playwright-report/**',
    'test-results/**',
    'coverage/**',
    'dist/**',
    'build/**',
    'infrastructure/lambda/dist/**',
    'infrastructure/lambda/node_modules/**',
  ],
};

const projectConfig = {
  linterOptions: {
    reportUnusedDisableDirectives: false,
  },
  plugins: {
    '@typescript-eslint': typescriptEslint,
  },
  rules: {
    'import/no-anonymous-default-export': 'off',
    'react-hooks/immutability': 'off',
    'react-hooks/preserve-manual-memoization': 'off',
    'react-hooks/purity': 'off',
    'react-hooks/refs': 'off',
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/static-components': 'off',
  },
};

const config = [
  generatedIgnores,
  ...nextVitals,
  projectConfig,
];

export default config;
