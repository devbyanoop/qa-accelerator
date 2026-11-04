# Where reports go

Everything a test run generates is under this folder, split by purpose. Only this note is committed.

```
reports/
  _raw/          What the run wrote: results, screenshots, videos, traces. Overwritten each run. Don't open it.
  standard/      The everyday reports. This is what a normal run gives you.
    allure/        npm run report:allure          (builds and opens it)
    playwright/    npm run report                 (opens it)
  regulated/     The validation evidence pack. Only exists when you ask for it.
    validation-report.html   <- start here: one page with everything, double-click to open
    ...                      npm run report:validation builds it; READ-ME-FIRST.txt in it explains the rest
```

## Which one do I want?

| You want to...                                              | Open                                       | Build it with                                            |
| ----------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| See how a normal run went, find why a test failed           | `standard/allure` or `standard/playwright` | `npm test`, `npm run report:allure`                      |
| Hand evidence to a quality team, auditor or client reviewer | `regulated/validation-report.html`         | `npm run test:capture`, then `npm run report:validation` |

The standard report is the default. The regulated pack is a complete, separate copy of one run: its own Allure
report, the traceability matrix, every screenshot and video with a timestamp bar, a manifest and checksums. Nothing
in `standard/` is part of it.

## Screenshots and videos

A normal run keeps a screenshot and a video only for tests that fail, so a green run has none. `npm run test:capture`
records every test. The ways to switch recording on, and what "every step" means, are in
[../docs/reporting.pdf](../docs/reporting.pdf).

## Starting clean

`npm run clean` removes everything under `reports/`. `npm run test:capture` clears `_raw` for you before it runs,
so a validation run never contains results from an earlier run. For a normal run, results from earlier runs can
still be in `_raw`, so run `npm run clean` first if you plan to build the regulated pack from it.
