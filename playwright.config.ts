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

const browserDevices = {
  chromium: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari'],
};

function projectFor(name: string): {
  name: string;
  use: (typeof browserDevices)[keyof typeof browserDevices];
} {
  const device = browserDevices[name as keyof typeof browserDevices];
  if (!device) {
    throw new Error(`Unknown browser "${name}" in BROWSERS. Use: ${Object.keys(browserDevices).join(', ')}.`);
  }
  return { name, use: { ...device } };
}

export default defineConfig({
  testDir: './tests',
  globalSetup: './src/config/global-setup.ts',
  fullyParallel: true,
  forbidOnly: env.isCI,
  retries: env.isCI ? 2 : 0,
  workers: env.workers ?? (env.isCI ? 2 : undefined),
  grepInvert: env.visual ? undefined : /@visual/,
  // One set of baselines for all machines: they are produced in the Linux runner image, so no platform suffix.
  snapshotPathTemplate: '{testDir}/{testFileDir}/__screenshots__/{arg}-{projectName}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' } },
  reporter: [
    env.isCI ? ['github'] : ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    allureReporter,
  ],
  use: {
    baseURL: env.uiUrl,
    testIdAttribute: 'data-test',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: env.browsers.map(projectFor),
});
