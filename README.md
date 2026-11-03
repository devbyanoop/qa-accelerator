# QA Accelerator

A layered Playwright + TypeScript end-to-end test automation framework: environment profiles, typed API
clients, dependency-injected fixtures, tagged suites and CI-ready reporting. It is demonstrated against the
open-source **Toolshop** reference application.

> **Status:** 41 tests across API and UI: login, catalog, cart, checkout with every payment method, role-based
> access control, and admin brand/user/order management. CI workflow included; container and pipeline
> examples for other CI systems are being added.

## Run it locally

**You need:** Node.js 20+ and Docker (Docker Desktop on Windows/macOS, Docker Engine on Linux). Ports `4200`
and `8091` must be free.

```
git clone <this repository> && cd qa-accelerator
npm ci
npx playwright install chromium        # on Linux use: npx playwright install --with-deps chromium
cp .env.example .env.local             # then fill in the four credentials (see below)
npm run app:start                      # starts and seeds the Toolshop app in Docker (first run downloads images)
npm test
npm run app:stop                       # removes the app containers and data when you are finished
```

- **Credentials:** the reference application publishes demo accounts (one customer, one admin) in its
  [README](https://github.com/testsmith-io/practice-software-testing#readme). Put them in `.env.local` as
  `CUSTOMER_EMAIL`, `CUSTOMER_PASSWORD`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- **Same machine:** the application's UI calls its API at `localhost:8091`, so run the tests on the machine
  that runs Docker (or forward both ports to your machine).
- **Linux:** one image of the application is arm64-only. Enable emulation once with
  `docker run --privileged --rm tonistiigi/binfmt --install arm64`. Docker Desktop already includes it.
- **Nothing else is required:** the application runs from published images defined in
  `infra/toolshop/docker-compose.yml`, so you do not need its source code.

## Run in a container

The `Dockerfile` builds a runner image with the dependencies and matching Playwright browsers, so no Node or
browser install is needed on the machine that runs the tests (Linux host shown; the application must already
be running):

```
docker build -t qa-accelerator-runner .
docker run --rm --init --ipc=host --network host \
  -e CUSTOMER_EMAIL -e CUSTOMER_PASSWORD -e ADMIN_EMAIL -e ADMIN_PASSWORD \
  qa-accelerator-runner --grep @smoke
```

`--network host` lets the browser in the container reach the application on the host's `localhost`.

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
2. **e2e** job: starts its own copy of the reference application with `npm run app:start` (Docker Compose on
   the runner), seeds its database, waits until it is healthy, runs the suite on Chromium, then uploads the
   Playwright report, the Allure report and traces/videos/JUnit as artifacts (kept 14 days).
3. **publish-report** job (optional): publishes the Allure report to GitHub Pages.

Each run brings up its own application, so CI never depends on any developer's machine or Docker host.

Repository setup:

- **Secrets** (Settings, Secrets and variables, Actions): `CUSTOMER_EMAIL`, `CUSTOMER_PASSWORD`,
  `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- **Optional report site:** enable Pages with source "GitHub Actions" and set the repository variable
  `PUBLISH_REPORT=true`. Allure trend history is kept between runs with the Actions cache.

### Other CI systems

Nothing in the suite is GitHub-specific. Any CI system with Docker can run it: start the application with
`npm run app:start`, then run the tests with `npx playwright test`, or use the runner image built from the
`Dockerfile`. JUnit results are written to `test-results/junit.xml`.

## Adapting to your application

1. Add a `.env.<profile>` file for each of your environments.
2. Replace `src/pages`, `src/api` domain clients and `src/data` with your application's.
3. Keep `src/config`, `src/fixtures/base.fixture.ts` and `src/utils` as they are.

See [ARCHITECTURE.md](ARCHITECTURE.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
