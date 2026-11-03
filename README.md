# QA Accelerator

A layered Playwright + TypeScript end-to-end test automation framework: environment profiles, typed API
clients, dependency-injected fixtures, self-cleaning test data, tagged suites, accessibility and visual checks,
and CI-ready reporting. It is demonstrated against the open-source **Toolshop** reference application.

![Allure report overview](docs/images/allure-overview.png)

| Test suite by area                          | One test, step by step                                    |
| ------------------------------------------- | --------------------------------------------------------- |
| ![Allure tree](docs/images/allure-tree.png) | ![Allure test detail](docs/images/allure-test-detail.png) |

## What is covered

80 tests run by default (83 with the visual checks), each tagged so you can run just the part you need.

| Area            | What is checked                                                                               | Layer    |
| --------------- | --------------------------------------------------------------------------------------------- | -------- |
| Authentication  | login, wrong password, protected pages redirect anonymous visitors                            | UI + API |
| Catalog         | search, sorting, pagination                                                                   | UI + API |
| Cart & checkout | add to cart, all five payment methods, address and payment validation, sign-in mid-checkout   | UI + API |
| Orders          | every order is verified through the invoices API, not just on screen                          | UI + API |
| Access control  | admin-only endpoints return 401 (anonymous), 403 (customer), 200 (admin)                      | API      |
| Payment rules   | every validation rule of the payment check, valid and invalid                                 | API      |
| Admin           | dashboard, brands, products, users, orders: create, edit, delete, validation, role access     | UI + API |
| Accessibility   | WCAG 2.1 A/AA scans (axe-core) of the main pages, with the full result attached to the report | UI       |
| Visual          | screenshot comparison of static components (login, registration, navigation)                  | UI       |

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
- **Nothing else is required:** the application runs from images pinned by digest in
  `infra/toolshop/docker-compose.yml`, so you do not need its source code.

## Choose what to run

```
npm run test:smoke                     # the fastest, most important checks
npm run test:regression                # everything else
npx playwright test --grep @api        # API tests only
npx playwright test --grep @a11y       # accessibility only
```

| Tag            | Meaning                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `@smoke`       | critical paths, run on every change                                                             |
| `@regression`  | the wider suite                                                                                 |
| `@api` / `@ui` | the layer a test works at                                                                       |
| `@a11y`        | accessibility scans                                                                             |
| `@visual`      | screenshot comparison; runs only with `VISUAL=true`                                             |
| `@known-issue` | documents a defect in the application; written as an expected failure, see "Known issues" below |

Select another environment with `TEST_ENV=qa npm test` (loads `.env.qa`). Limit parallelism with `WORKERS=2`.

### Other browsers

Everyday runs use Chromium. To run on Firefox and WebKit as well:

```
npx playwright install firefox webkit
BROWSERS=chromium,firefox,webkit npm test        # on Windows PowerShell: $env:BROWSERS='chromium,firefox,webkit'
```

The nightly CI run does this automatically.

## Visual regression

Screenshot baselines depend on the operating system's fonts, so they are produced inside the Linux runner image
and the visual tests run only when asked (`VISUAL=true`). Run them in the container, where they match CI:

```
docker build -t qa-accelerator-runner .
docker run --rm --init --ipc=host --network host --env-file .env.local -e VISUAL=true \
  qa-accelerator-runner tests/ui/visual
```

After an intended UI change, refresh the baselines and review the changed images in the diff:

```
docker run --name qa-visual --init --ipc=host --network host --env-file .env.local -e VISUAL=true \
  qa-accelerator-runner tests/ui/visual --update-snapshots
docker cp qa-visual:/app/tests/ui/visual/__screenshots__ tests/ui/visual/
docker rm qa-visual
```

Only static components are compared, so the result never depends on data that other tests change.

## Run in a container

The `Dockerfile` builds a runner image with the dependencies and matching Playwright browsers, so no Node or
browser install is needed on the machine that runs the tests (Linux host shown; the application must already
be running):

```
docker build -t qa-accelerator-runner .
docker run --rm --init --ipc=host --network host --env-file .env.local qa-accelerator-runner --grep @smoke
```

`--network host` lets the browser in the container reach the application on the host's `localhost`.

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
   the runner), seeds its database, waits until it is healthy and runs the suite. Pushes and pull requests use
   Chromium; the nightly run, and a manual run with the "all browsers" option, also use Firefox and WebKit.
   It then runs the visual checks as an advisory step (a mismatch is reported but never fails the build) and
   uploads the Playwright report, the Allure report and traces/videos/JUnit as artifacts (kept 14 days).
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

## Known issues in the application

Testing the reference application turned up real defects. Each is written as a test tagged `@known-issue` that
is expected to fail: it is reported as passing while the defect exists, and fails loudly the day the defect is
fixed, as a reminder to delete the tag.

| Where              | Defect                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Admin brands       | brand search results are cached for an hour and not cleared on delete, so a deleted brand keeps showing |
| Payment check      | an unsupported payment method is accepted as "Payment was successful"                                   |
| Admin edit product | the form does not pre-fill stock, brand, category or image, so saving any edit means re-entering them   |
| Admin add user     | leaving "failed login attempts" and "enabled" blank makes the server answer 500                         |
| Orders             | an order (invoice) is created for a cart that has no items                                              |
| Accessibility      | a button on the login page has no accessible name (axe `button-name`, critical)                         |

The accessibility tests also keep a baseline of the violations the application already has, and fail only on
new ones.

## Updating dependencies

Dependabot proposes weekly updates for npm packages, GitHub Actions and the Dockerfile. Playwright itself is
excluded on purpose: upgrade it by hand so three things move together: `@playwright/test` in `package.json`, the
image tag in the `Dockerfile` (`mcr.microsoft.com/playwright:v<version>-noble`) and the visual baselines
(regenerate them as described above). The application images in `infra/toolshop/docker-compose.yml` are pinned
by digest; the file explains how to update a pin.

## Adapting to your application

1. Add a `.env.<profile>` file for each of your environments.
2. Replace `src/pages`, `src/api` domain clients and `src/data` with your application's.
3. Keep `src/config`, `src/fixtures/base.fixture.ts` and `src/utils` as they are.

See [ARCHITECTURE.md](ARCHITECTURE.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
