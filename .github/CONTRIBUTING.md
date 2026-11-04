# Contributing

## Setup

```
npm ci
npx playwright install chromium
cp .env.example .env.local   # then fill in the credentials
npm run app:start            # start and seed the application under test in Docker
```

The first `npm ci` also installs a pre-commit hook. It runs ESLint and Prettier on the files you stage, so
formatting problems are fixed before they reach the pull request.

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

## Requirement links

Link each test to the requirement it verifies, so the traceability matrix stays complete:

```ts
test('a customer can sign in', { tag: [Tags.smoke, Tags.ui, ...requirement('REQ-AUTH-001')] }, ...)
test.describe('Checkout', { tag: [...requirement('REQ-ORD-001', 'REQ-ORD-003')] }, () => { ... })
```

The valid IDs are in `docs/regulated/requirements.json`. `npm run traceability` lists tests with no requirement
and IDs that are not in the file.

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

## Flaky tests

A test that fails now and then is worse than a missing test, because people stop trusting a red build.

- **Don't paper over it.** Don't add retries, longer sleeps or `waitForTimeout`. Find out what the test is
  racing against: a value that other tests change, a page that is still loading, a cache.
- **Wait on the real condition.** Use a web-first assertion, or `expect.poll` when the thing you wait for is an
  API result.
- **Look at the evidence first.** CI keeps a trace for any test that needed a retry. Open it before changing
  the test.
- **Tests that pass only on retry are failures.** CI retries twice so one slow run doesn't block a merge, but
  a test that needs it should be fixed within the week. If it can't be, tag it `@known-issue` with a reason, or
  remove it. Don't leave it quarantined without a note.

## Known application defects

When a test finds a defect in the application under test, do not weaken the assertion and do not leave the
build red. Write the correct expectation, add `Tags.knownIssue`, and call `test.fail(true, '<what is wrong>')`
at the top of the test. It is then reported as passing while the defect exists, and fails when the application
is fixed, which is the signal to remove the tag.

## API contract and mobile checks

- **Contract:** `tests/api/contract.api.spec.ts` checks the shape of the responses the front end and the other
  tests rely on, using `shapeProblems` in `src/utils/contract.ts`. Add the fields you depend on when you add a
  client method.
- **Mobile:** specs in `tests/ui/mobile` run only in the `mobile-chrome` project (a phone-sized Chrome), with
  `BROWSERS=mobile-chrome`. The other specs are written for a desktop layout and are not run there.

## Database checks

`tests/db` reads the application's database through `src/db/toolshop-db.ts`. Keep it read-only: create data
through the API, then look at what was stored. Put new queries in `ToolshopDb` rather than in specs, and skip
the spec when `env.db` is not set, as the existing ones do.

## Recording evidence

The defaults are economical: a screenshot and a video are kept only for failing tests. `npm run test:capture`
records a screenshot, a video and a trace for every test and stamps a live date-and-time bar on each page
(`src/utils/evidence-stamp.ts`). It is meant for formal validation runs and demos, not everyday runs. The bar
ignores the pointer and lives in a closed shadow root, so it does not affect locators or clicks. Don't add checks
that depend on the bottom edge of the page being free.

Reports are split into `reports/standard` (everyday) and `reports/regulated` (validation evidence, built on
request). Don't change where tests or tools write; everything generated goes under `reports/`. The full guide,
including every way to switch recording on, is in [docs/reporting.pdf](../docs/reporting.pdf).

## Accessibility and visual checks

- **Accessibility:** `tests/ui/accessibility` fails only on violations that are not in its `knownViolations`
  baseline. When the application fixes one, remove it from the baseline.
- **Visual:** compare only static components. Baselines are generated in the Linux runner image; see "Visual
  regression" in the README before changing them.

## Releasing

For the maintainer. A release is a tag, and the release workflow does the rest.

1. Put the changes in `CHANGELOG.md` under `## [Unreleased]`, then rename that heading to the new version and date, and
   add a fresh empty `## [Unreleased]` above it.
2. Set the version in `package.json` (`npm version X.Y.Z --no-git-tag-version`), commit, and push.
3. Tag and push the tag: `git tag -a vX.Y.Z -m "X.Y.Z"` and `git push origin vX.Y.Z`.
4. The **Release** workflow checks that the tag matches `package.json`, runs the checks, builds the assets (the guides
   as a zip, a software bill of materials, checksums), records build provenance and creates the GitHub Release with the
   notes from the changelog. A tag with a dash, such as `v1.1.0-rc1`, is published as a pre-release.

Follow semantic versioning (see the top of `CHANGELOG.md`): a change to an npm script, a setting in
`config/regulated.json`, a folder under `reports/` or a workflow input is a breaking change.

## GitHub Actions

Every action in `.github/workflows` is pinned to a full commit, with the version in a comment. When you add or change
an action, write it as usual (`uses: owner/name@v4`), then run `npm run pin:actions` to pin it. CI runs
`npm run check:actions` and fails on an unpinned action. Dependabot updates pinned actions.

## Before opening a PR

```
npm run lint
npm run typecheck
npm run format:check
npm run test:tools
npm run test:smoke
```
