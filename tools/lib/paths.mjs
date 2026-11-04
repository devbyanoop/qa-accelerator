// Where reports live. Everything generated sits under reports/, split by purpose:
//   reports/_raw        what the test run wrote (results, screenshots, videos, traces). Overwritten each run.
//   reports/standard    everyday reports: the Allure report and Playwright's HTML report
//   reports/regulated   the validation evidence pack: one report, matrix, manifest, checksums, recordings
export const rawDir = 'reports/_raw';
export const rawAllureResults = `${rawDir}/allure-results`;
export const rawJunit = `${rawDir}/junit.xml`;
export const regulatedDir = 'reports/regulated';
