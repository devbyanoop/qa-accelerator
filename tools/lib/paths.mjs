// Where reports live. Everything generated sits under reports/, split by purpose:
//   reports/_raw        what the test run wrote (results, screenshots, videos, traces). Overwritten each run.
//   reports/standard    everyday reports: the Allure report and Playwright's HTML report
//   reports/regulated   the validation evidence pack: one report, matrix, manifest, checksums, recordings
//   reports/archive     sealed zips of dry and formal runs, their checksums and the audit log (regulated mode only)
export const rawDir = 'reports/_raw';
export const rawAllureResults = `${rawDir}/allure-results`;
export const rawJunit = `${rawDir}/junit.xml`;
export const regulatedDir = 'reports/regulated';
export const archiveDir = 'reports/archive';

// Written by a regulated run, in reports/_raw, and picked up by the evidence pack.
export const changeStartFile = `${rawDir}/change-record-start.json`;
export const changeEndFile = `${rawDir}/change-record-end.json`;
export const runNotesFile = `${rawDir}/run-notes.jsonl`;
export const runInfoFile = `${rawDir}/run-info.json`;
