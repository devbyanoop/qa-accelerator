import { test as base, request } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { env } from '@config/env';
import { Tags } from '@utils/tags';

interface FrameworkFixtures {
  /** Unauthenticated API context pointed at the configured API_URL. */
  api: APIRequestContext;
  /** Automatic: labels each test in the Allure report. */
  reportMetadata: void;
}

export const test = base.extend<FrameworkFixtures>({
  // eslint-disable-next-line no-empty-pattern
  api: async ({}, use) => {
    const context = await request.newContext({
      baseURL: env.apiUrl,
      extraHTTPHeaders: { Accept: 'application/json' },
    });
    await use(context);
    await context.dispose();
  },

  // Layer comes from the @api tag, feature from the describe title, severity from the @smoke tag.
  reportMetadata: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, testInfo) => {
      const [, feature] = testInfo.titlePath;
      await allure.epic(env.appName);
      await allure.parentSuite(testInfo.tags.includes(Tags.api) ? 'API' : 'UI');
      if (feature && testInfo.titlePath.length > 2) {
        await allure.feature(feature);
      }
      await allure.severity(testInfo.tags.includes(Tags.smoke) ? 'critical' : 'normal');
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
