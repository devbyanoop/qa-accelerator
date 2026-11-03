# Contributing

## Setup

```
npm ci
npx playwright install chromium
cp .env.example .env.local   # then fill in values
```

## Conventions

- **Commits:** conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).
- **Specs:** one feature per file under `tests/<area>/`, named `<feature>.spec.ts`. Tag every test
  (`Tags.smoke`, `Tags.regression`, `Tags.api`, `Tags.ui`).
- **Page objects:** one class per page or component in `src/pages/`. Locators are private; expose actions and
  state queries. Prefer `getByRole` and `getByTestId` over CSS or XPath.
- **API clients:** extend `BaseApiClient` and expose business-level methods, not raw HTTP.
- **No hard waits:** never use `waitForTimeout`; rely on web-first assertions.

## Before opening a PR

```
npm run lint
npm run typecheck
npm run test:smoke
```
