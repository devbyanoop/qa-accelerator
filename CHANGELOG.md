# Changelog

All notable changes to QA Accelerator are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com), and the project follows [Semantic Versioning](https://semver.org).

## Versioning

What counts as part of the public surface, and so decides the version number:

- **Major** (2.0.0): a change that breaks existing users. For example renaming an npm script, a setting in
  `config/regulated.json`, a folder under `reports/`, or a GitHub workflow input.
- **Minor** (1.1.0): something new that does not break anything, such as a new test layer, command or option.
- **Patch** (1.0.1): a fix.

Every release names the framework version in the evidence manifest of a regulated run, so a pack always says which
release produced it.

## [Unreleased]

## [1.0.0] - 2026-11-04

The first stable release.

### Added

- A layered Playwright and TypeScript framework: page objects, API clients, fixtures, self-cleaning test data and
  environment profiles. 86 tests against the open-source Toolshop application, across UI, API, database, accessibility,
  visual and phone-sized checks.
- Reports: an Allure 3 report and Playwright's report, built into `reports/standard`, with a live copy of the Allure
  report on GitHub Pages.
- Continuous integration with GitHub Actions: lint, type check and format gates, a browser matrix, an advisory visual
  check, Dependabot, and issue and pull request templates.
- An opt-in regulated mode, off by default (`config/regulated.json`):
  - requirement tags and a requirement-to-test traceability matrix;
  - capture mode, which records a screenshot, video and trace of every test with a live timestamp bar;
  - an evidence pack with one self-contained report, a manifest and a SHA-256 checksum for every file;
  - dry and formal runs with run labels, a change record, a sealed zip with a checksum, a hash-chained audit log, a
    comparison of the formal run with its dry run, and a manual CI workflow with a protected environment.
- Guides in `docs/` (published as PDF): adapting the framework to another application, reporting and recordings, and
  the regulated-use material with validation templates.
- Tools in `tools/` with their own tests, including a pinning tool for GitHub Actions and a release workflow that
  attaches a software bill of materials and build provenance.

### Security

- All GitHub Actions are pinned to a full commit. CodeQL scans the code and the workflows on every push and weekly.
