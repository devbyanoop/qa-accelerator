# Architecture

The framework separates **generic infrastructure** from **application-specific code**, so adopting it for a
different product means replacing one layer, not rewriting everything.

```
tests/                 Specs: business scenarios only, no locators, no HTTP details
  |
src/fixtures/          Dependency injection: wires page objects, API clients and auth into tests
  |
  +-- src/pages/       Page objects (application-specific)
  +-- src/api/         API clients (base class is generic; domain clients are application-specific)
  +-- src/data/        Test data builders and sample values (application-specific)
  |
src/config/            Environment profiles and credential resolution (generic)
src/utils/             Tags and shared helpers (generic)
```

## Generic layer (reusable as-is)

- `src/config/env.ts`: selects a profile with `TEST_ENV`, reads `.env.<profile>`, lets real environment
  variables override. Credentials resolve lazily, per role.
- `src/api/base-api-client.ts`: typed request helper with explicit status expectations and readable failures.
- `src/fixtures/base.fixture.ts`: base `test` object that all specs import.
- `src/utils/tags.ts`: central tag names for selecting suites.

## Application layer (replace per product)

- Page objects, domain API clients, test data, and the specs themselves.

## Design patterns used

| Pattern                         | Where                                  | Why                                                                        |
| ------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| Page Object Model               | `src/pages/`                           | Locators live in one class per page; tests call business actions.          |
| Component Object                | `src/pages/components/header.ts`       | Shared UI (the header) is composed into pages, not copied.                 |
| Fixture-based dependency inject | `src/fixtures/`                        | Tests request what they need; setup and cleanup are automatic.             |
| Service Object (API client)     | `src/api/`                             | HTTP is wrapped in typed, business-level methods.                          |
| Template Method                 | `BaseApiClient.send()`                 | Shared request, status check and error handling; subclasses add endpoints. |
| Layered architecture            | tests, fixtures, pages and API, config | One-way dependencies make the application layer replaceable.               |
| Environment-based configuration | `src/config/env.ts`                    | Profiles via `TEST_ENV`; nothing environment-specific in code.             |
| Cross-cutting automatic fixture | `reportMetadata` in `base.fixture.ts`  | Report labels are applied to every test without touching specs.            |
| Test Data Builder               | `src/data/builders.ts`                 | Every call returns unique, valid data, so parallel tests never collide.    |
| Self-cleaning fixture           | `newBrand`, `newProduct`, `newUser`    | Created records are removed after the test, even when it fails.            |
| Known-issue (expected failure)  | `Tags.knownIssue` with `test.fail`     | Application defects are documented without leaving the build red.          |

## Principles

- Tests state intent; page objects and clients own mechanics.
- Test state is created through the API, then verified in the UI where the UI is what is under test.
- Every test is independent and can run in parallel.
- No environment values or credentials in code.
