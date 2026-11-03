import os from 'node:os';
import { defineConfig, devices } from '@playwright/test';
import type { ReporterDescription } from '@playwright/test';
import { env } from './src/config/env';

const allureReporter: ReporterDescription = [
  'allure-playwright',
  {
    resultsDir: 'allure-results',
    environmentInfo: {
      Application: env.appName,
      Environment: env.name,
      'UI URL': env.uiUrl,
      'API URL': env.apiUrl,
      Node: process.version,
      OS: `${os.platform()} ${os.release()}`,
    },
  },
];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: env.isCI,
  retries: env.isCI ? 2 : 0,
  workers: env.workers ?? (env.isCI ? 2 : undefined),
  reporter: env.isCI
    ? [['blob'], ['junit', { outputFile: 'test-results/junit.xml' }], ['github'], allureReporter]
    : [['list'], ['html', { open: 'never' }], allureReporter],
  use: {
    baseURL: env.uiUrl,
    testIdAttribute: 'data-test',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
