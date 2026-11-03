/** Central test tags. Select with: npx playwright test --grep @smoke */
export const Tags = {
  smoke: '@smoke',
  regression: '@regression',
  api: '@api',
  ui: '@ui',
  /** Documents a defect in the application under test; the test is expected to fail until it is fixed. */
  knownIssue: '@known-issue',
} as const;
