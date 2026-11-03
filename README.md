# QA Accelerator

A layered Playwright + TypeScript end-to-end test automation framework: environment profiles, typed API
clients, dependency-injected fixtures, tagged suites and CI-ready reporting. It is demonstrated against the
open-source **Toolshop** reference application.

> **Status:** 41 tests across API and UI: login, catalog, cart, checkout with every payment method, role-based
> access control, and admin brand/user/order management. CI workflow included; container and pipeline
> examples for other CI systems are being added.

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

## Continuous integration

`.github/workflows/playwright.yml` runs on every push to `main`, every pull request, nightly, and on demand.

1. **quality** job: lint, typecheck and format check.
2. **e2e** job: checks out the reference application at a pinned commit, starts it with Docker Compose, seeds
   its database, waits until it is healthy, runs the suite on Chromium, then uploads the Playwright report,
   the Allure report and traces/videos/JUnit as artifacts (kept 14 days).
3. **publish-report** job (optional): publishes the Allure report to GitHub Pages.

Repository setup:

- **Secrets** (Settings, Secrets and variables, Actions): `CUSTOMER_EMAIL`, `CUSTOMER_PASSWORD`,
  `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- **Optional report site:** enable Pages with source "GitHub Actions" and set the repository variable
  `PUBLISH_REPORT=true`. Allure trend history is kept between runs with the Actions cache.

## Adapting to your application

1. Add a `.env.<profile>` file for each of your environments.
2. Replace `src/pages`, `src/api` domain clients and `src/data` with your application's.
3. Keep `src/config`, `src/fixtures/base.fixture.ts` and `src/utils` as they are.

See [ARCHITECTURE.md](ARCHITECTURE.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
