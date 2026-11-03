# QA Accelerator

A layered Playwright + TypeScript end-to-end test automation framework: environment profiles, typed API
clients, dependency-injected fixtures, tagged suites and CI-ready reporting. It is demonstrated against the
open-source **Toolshop** reference application.

> **Status:** foundation, page objects, typed API clients and a first suite (16 tests across API and UI) are in
> place. Checkout and admin flows, and CI pipelines, are being added.

## Quick start

```
npm ci
npx playwright install chromium
cp .env.example .env.local     # set UI_URL, API_URL and credentials
npm run test:smoke
```

## Select an environment

```
TEST_ENV=qa npm test           # loads .env.qa
```

## Run subsets

```
npm run test:smoke
npm run test:regression
```

## Reporting

Every run writes an [Allure 3](https://allurereport.org) results folder (Node only, no Java needed) alongside
Playwright's built-in HTML report.

```
npm test                      # run the suite; writes allure-results/ and playwright-report/
npm run report:allure         # build and open the Allure report
npm run report                # open Playwright's HTML report (traces, video, screenshots)
```

Each test is labelled automatically: epic (`APP_NAME`), layer (API or UI), feature (the `describe` title) and
severity (`@smoke` is critical). Page-object actions appear as named steps, and the report header carries the
environment details (application, environment, URLs, Node, OS).

## Adapting to your application

1. Add a `.env.<profile>` file for each of your environments.
2. Replace `src/pages`, `src/api` domain clients and `src/data` with your application's.
3. Keep `src/config`, `src/fixtures/base.fixture.ts` and `src/utils` as they are.

See [ARCHITECTURE.md](ARCHITECTURE.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
