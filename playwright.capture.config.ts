import { defineConfig } from '@playwright/test';
import type { ReporterDescription } from '@playwright/test';
import base from './playwright.config';

/**
 * The same suite, but a screenshot, a video and a trace are recorded for every test, not only failing ones. Use
 * it for formal validation runs or demos: `npm run test:capture`. Every page also shows a live date-and-time bar,
 * so the recordings carry their own timestamp. Runs are slower and the results are larger.
 */
// Workers are started after this file is loaded, so they inherit the flag.
process.env.EVIDENCE_STAMP = 'true';

// Playwright's own HTML report goes to the raw folder, so a capture run never overwrites the standard report.
const reporter = (base.reporter as ReporterDescription[]).map((entry): ReporterDescription =>
  entry[0] === 'html' ? ['html', { open: 'never', outputFolder: 'reports/_raw/playwright-report' }] : entry,
);

export default defineConfig(base, {
  reporter,
  use: { trace: 'on', screenshot: 'on', video: 'on' },
});
