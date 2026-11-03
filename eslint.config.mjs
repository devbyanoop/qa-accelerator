import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      'playwright-report',
      'test-results',
      'blob-report',
      'allure-report',
      'allure-results',
      '.allure',
      '.auth',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['tests/**/*.ts'], ...playwright.configs['flat/recommended'] },
);
