import { test as base, request } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { env } from '@config/env';

interface FrameworkFixtures {
  /** Unauthenticated API context pointed at the configured API_URL. */
  api: APIRequestContext;
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
});

export { expect } from '@playwright/test';
