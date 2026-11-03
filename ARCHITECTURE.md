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
  +-- src/data/        Typed test data and builders (application-specific)
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

## Principles

- Tests state intent; page objects and clients own mechanics.
- Test state is created through the API, then verified in the UI where the UI is what is under test.
- Every test is independent and can run in parallel.
- No environment values or credentials in code.
