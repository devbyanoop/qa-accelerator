# Contributing

## Setup

```
npm ci
npx playwright install chromium
cp .env.example .env.local   # then fill in the credentials
npm run app:start            # start and seed the application under test in Docker
```

## Conventions

- **Commits:** conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ci:`).
- **Specs:** one feature per file under `tests/api` or `tests/ui/<area>`, named `<feature>.spec.ts`. Tag every
  test with its priority and layer (`Tags.smoke` or `Tags.regression`, plus `Tags.api` or `Tags.ui`).
- **Page objects:** one class per page or component in `src/pages/`. Expose actions and state queries; keep
  locators private unless a spec needs to assert on them. Prefer `getByRole` and `getByTestId` over CSS or
  XPath. Wrap multi-step actions in `test.step` so they read as business actions in the report.
- **API clients:** extend `BaseApiClient` and expose business-level methods, not raw HTTP.
- **No hard waits:** never use `waitForTimeout`; rely on web-first assertions. When the thing you wait for is
  an API result, use `expect.poll`.

## Test data

- **Never depend on data that other tests change.** Tests run in parallel against one application, so a
  catalog total, a stock level or a list's contents can change under you. Take expectations from the same
  response the test is checking, or retry with `expect.poll`.
- **Create data through the API** with the builders in `src/data/builders.ts`. Every builder returns unique
  values.
- **Clean up in a fixture, not in the test.** The `newBrand`, `newProduct` and `newUser` fixtures remove
  anything the test created, even when it fails. Brands are removed by slug, products by name and users by
  email, so a test must not change that identifier of the record it creates.
- **Orders use the shared product.** An ordered product cannot be deleted in the application, and seeded
  stock runs out, so tests that place orders use the `orderableProduct` fixture: one product with a very
  large stock that `src/config/global-setup.ts` finds or creates once per run.
- **Read values from the application where you can** instead of hard-coding catalog data.

## Known application defects

When a test finds a defect in the application under test, do not weaken the assertion and do not leave the
build red. Write the correct expectation, add `Tags.knownIssue`, and call `test.fail(true, '<what is wrong>')`
at the top of the test. It is then reported as passing while the defect exists, and fails when the application
is fixed, which is the signal to remove the tag.

## Accessibility and visual checks

- **Accessibility:** `tests/ui/accessibility` fails only on violations that are not in its `knownViolations`
  baseline. When the application fixes one, remove it from the baseline.
- **Visual:** compare only static components. Baselines are generated in the Linux runner image; see "Visual
  regression" in the README before changing them.

## Before opening a PR

```
npm run lint
npm run typecheck
npm run format:check
npm run test:smoke
```
