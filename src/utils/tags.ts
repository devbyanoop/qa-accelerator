/** Central test tags. Select with: npx playwright test --grep @smoke */
export const Tags = {
  smoke: '@smoke',
  regression: '@regression',
  api: '@api',
  ui: '@ui',
  a11y: '@a11y',
  /** Runs on a phone-sized viewport (BROWSERS=mobile-chrome). */
  mobile: '@mobile',
  /** Checks what was stored in the database; needs the DB_ variables (see .env.example). */
  db: '@db',
  /** Screenshot comparison; runs only with VISUAL=true. */
  visual: '@visual',
  /** Documents a defect in the application under test; the test is expected to fail until it is fixed. */
  knownIssue: '@known-issue',
} as const;
