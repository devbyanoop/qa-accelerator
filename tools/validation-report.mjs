// Builds ONE self-contained HTML report with everything a reviewer needs: run details, summary, the requirement
// traceability matrix, known defects, gaps, every test result and any failures. No server, no other files.
// Node built-ins only (plus Playwright's Chromium for the optional PDF).
//
//   node tools/validation-report.mjs --manifest reports/regulated/manifest.json --out reports/regulated/validation-report.html [--pdf]
//
// `npm run evidence` calls this, so the report is part of the evidence pack and covered by its checksums.
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { rawAllureResults, regulatedDir } from './lib/paths.mjs';
import { analyse } from './lib/results.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : fallback;
};
const resultsDir = option('results', rawAllureResults);
const requirementsFile = option('requirements', 'docs/regulated/requirements.json');
const manifestFile = option('manifest', `${regulatedDir}/manifest.json`);
const outFile = option('out', `${regulatedDir}/validation-report.html`);
const makePdf = args.includes('--pdf');

const { tests, rows, unlinked, unknownIds } = analyse(resultsDir, requirementsFile);
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : null;

const escapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (c) => escapes[c]);
const seconds = (ms) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
const count = (list, predicate) => list.filter(predicate).length;
const verdictCount = (v) => count(rows, (r) => r.verdict === v);
const defects = 'Verified (known defect)';
const tone = (v) =>
  v === 'Verified' || v === 'passed'
    ? 'ok'
    : v === 'Failed' || v === 'failed' || v === 'broken'
      ? 'bad'
      : 'warn';

const projects = [...new Set(tests.map((t) => t.project))].sort();
const passed = count(tests, (t) => t.status === 'passed');
const failed = count(tests, (t) => t.status === 'failed' || t.status === 'broken');
const skipped = count(tests, (t) => t.status === 'skipped');
const knownIssueTests = tests.filter((t) => t.knownIssue);
const totalMs = tests.reduce((sum, t) => sum + t.durationMs, 0);
const knownDefects = rows.flatMap((r) =>
  r.tests.filter((t) => t.knownIssue).map((t) => ({ id: r.id, test: t })),
);
const notTested = rows.filter((r) => r.verdict === 'Not tested');
const failures = tests.filter((t) => t.status === 'failed' || t.status === 'broken');

const overall =
  failed > 0 || verdictCount('Failed') > 0
    ? ['bad', 'Failed']
    : notTested.length > 0 || knownDefects.length > 0
      ? ['warn', 'Passed with open items']
      : ['ok', 'Passed'];

const detail = (label, value) => `<tr><th>${esc(label)}</th><td>${value}</td></tr>`;
const env = manifest?.environment ?? {};
const runDetails = manifest
  ? [
      detail('Project', esc(manifest.project)),
      detail('Commit', `<code>${esc(manifest.commit)}</code>`),
      detail('Branch', esc(manifest.branch)),
      detail('Trigger', esc(manifest.trigger)),
      detail('Executed by', esc(manifest.executedBy)),
      detail(
        'CI run',
        manifest.ciRun ? `<a href="${esc(manifest.ciRun)}">${esc(manifest.ciRun)}</a>` : 'local run',
      ),
      detail('Generated', esc(manifest.generatedAt)),
      detail('Environment profile', esc(env.testEnv)),
      detail('Browsers', esc(projects.join(', ') || env.browsers)),
      detail('Node.js', esc(env.node)),
      detail('Playwright', esc(env.playwright)),
      detail('Operating system', esc(env.os)),
      detail('Lock file SHA-256', `<code>${esc(env.packageLockSha256)}</code>`),
      detail(
        'Application images',
        (manifest.applicationImages ?? []).map((image) => `<code>${esc(image)}</code>`).join('<br>') ||
          'none',
      ),
    ].join('\n')
  : '<tr><td>No manifest found. Run <code>npm run evidence</code>.</td></tr>';

const testItem = (t) =>
  `<li>${esc(t.name)} <span class="meta">[${esc(t.project)}] ${esc(t.status)}${t.knownIssue ? ', known defect' : ''}</span></li>`;
const matrixRow = (r) =>
  `<tr><td>${esc(r.id)}</td><td>${esc(r.title)}</td><td>${esc(r.risk)}</td><td class="${tone(r.verdict)}">${esc(r.verdict)}</td><td>` +
  (r.tests.length === 0
    ? '<span class="meta">none</span>'
    : `<details><summary>${r.tests.length} test(s)</summary><ul>${r.tests.map(testItem).join('')}</ul></details>`) +
  '</td></tr>';

const sortedTests = [...tests].sort(
  (a, b) => a.name.localeCompare(b.name) || a.project.localeCompare(b.project),
);
// Links to a test's screenshot, video and trace. When a test has several files of one kind they are numbered and
// show their size: a test can open a second page (the accessibility scanner opens a blank helper page), and
// Playwright records one video per page, so the second video is tiny and shows nothing of the application.
const sizeOf = (source) => {
  const file = path.join(resultsDir, source);
  if (!existsSync(file)) return '';
  const kb = statSync(file).size / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
};
const mediaLinks = (t) => {
  const media = t.attachments.filter((a) => /^(screenshot|video|trace)/i.test(a.name));
  const seen = {};
  return media
    .map((a) => {
      const total = media.filter((m) => m.name === a.name).length;
      const index = (seen[a.name] = (seen[a.name] ?? 0) + 1);
      const label = total > 1 ? `${a.name} ${index} (${sizeOf(a.source)})` : a.name;
      return `<a href="allure-results/${esc(a.source)}">${esc(label)}</a>`;
    })
    .join(' ');
};
const resultRow = (t) =>
  `<tr><td>${esc(t.name)}</td><td>${esc(t.project)}</td><td class="${tone(t.status)}">${esc(t.status)}${t.knownIssue ? ' <span class="meta">(known defect)</span>' : ''}</td>` +
  `<td>${esc(t.startedAt.replace('T', ' ').replace('Z', ''))}</td><td>${seconds(t.durationMs)}</td><td>${esc(t.requirements.join(', '))}</td><td class="meta">${esc(t.tags.join(', '))}</td><td>${mediaLinks(t) || '<span class="meta">none</span>'}</td></tr>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test validation report</title>
<style>
body { font: 15px/1.55 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 24px 16px 64px; color: #1f2328; background: #fff; }
main { max-width: 1040px; margin: 0 auto; }
h1 { margin: 0 0 4px; } h2 { margin-top: 36px; border-bottom: 1px solid #d1d9e0; padding-bottom: 6px; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; }
th, td { border: 1px solid #d1d9e0; padding: 6px 10px; text-align: left; vertical-align: top; }
thead th, .kv th { background: #f6f8fa; } .kv th { width: 220px; white-space: nowrap; }
code { font: 0.9em ui-monospace, Consolas, monospace; word-break: break-all; }
.ok { color: #1a7f37; font-weight: 600; } .bad { color: #cf222e; font-weight: 600; } .warn { color: #9a6700; font-weight: 600; }
.meta { color: #59636e; font-weight: 400; }
.cards { display: flex; flex-wrap: wrap; gap: 12px; margin: 16px 0; }
.card { border: 1px solid #d1d9e0; border-radius: 8px; padding: 10px 16px; min-width: 130px; }
.card b { display: block; font-size: 1.6em; line-height: 1.2; }
.banner { border: 1px solid currentColor; border-radius: 8px; padding: 10px 16px; margin: 16px 0; font-size: 1.1em; }
nav a { margin-right: 14px; } pre { white-space: pre-wrap; background: #f6f8fa; padding: 10px; border-radius: 6px; border: 1px solid #d1d9e0; }
input[type=search] { width: 100%; padding: 8px 10px; font: inherit; border: 1px solid #d1d9e0; border-radius: 6px; margin: 8px 0; }
@media (prefers-color-scheme: dark) {
  body { background: #0d1117; color: #e6edf3; } th, td, .card, .banner, input[type=search], pre { border-color: #3d444d; }
  thead th, .kv th, pre { background: #151b23; } .meta { color: #9198a1; } input[type=search] { background: #0d1117; color: inherit; } a { color: #4493f8; }
}
@media print {
  body { background: #fff; color: #1f2328; padding: 0; } nav, input[type=search] { display: none; } details > ul { display: block; }
  tr, pre { break-inside: avoid; } h2 { break-after: avoid; }
}
</style>
</head>
<body>
<main>
<h1>Test validation report</h1>
<p class="meta">${esc(manifest?.project ?? 'project')} &middot; generated ${esc(manifest?.generatedAt ?? new Date().toISOString())}</p>
<div class="banner ${overall[0]}">Overall result: ${esc(overall[1])}</div>
<nav><a href="#summary">Summary</a><a href="#run">Run details</a><a href="#matrix">Traceability</a><a href="#defects">Known defects</a><a href="#gaps">Gaps</a><a href="#results">All results</a><a href="#failures">Failures</a><a href="#integrity">Integrity</a></nav>

<h2 id="summary">1. Summary</h2>
<div class="cards">
<div class="card"><b>${tests.length}</b>test results</div>
<div class="card"><b class="ok">${passed}</b>passed</div>
<div class="card"><b class="${failed ? 'bad' : ''}">${failed}</b>failed</div>
<div class="card"><b>${skipped}</b>skipped</div>
<div class="card"><b>${knownIssueTests.length}</b>known-defect tests</div>
<div class="card"><b>${seconds(totalMs)}</b>total test time</div>
</div>
<div class="cards">
<div class="card"><b>${rows.length}</b>requirements</div>
<div class="card"><b class="ok">${verdictCount('Verified')}</b>verified</div>
<div class="card"><b class="${verdictCount(defects) ? 'warn' : ''}">${verdictCount(defects)}</b>verified with known defects</div>
<div class="card"><b class="${verdictCount('Failed') ? 'bad' : ''}">${verdictCount('Failed')}</b>failed</div>
<div class="card"><b class="${notTested.length ? 'warn' : ''}">${notTested.length}</b>not tested</div>
</div>
<p class="meta">A "known-defect" test is written as an expected failure: it passes while a documented defect in the system exists, so the matching requirement is not fully met.</p>

<h2 id="run">2. Run details</h2>
<table class="kv"><tbody>
${runDetails}
</tbody></table>

<h2 id="matrix">3. Requirements traceability</h2>
<table>
<thead><tr><th>Requirement</th><th>Title</th><th>Risk</th><th>Verdict</th><th>Tests</th></tr></thead>
<tbody>
${rows.map(matrixRow).join('\n')}
</tbody>
</table>

<h2 id="defects">4. Known defects</h2>
${
  knownDefects.length
    ? `<p>The requirement is not fully met until each defect is fixed. Raise a deviation for each one.</p><table><thead><tr><th>Requirement</th><th>Test (written as an expected failure)</th><th>Browser</th></tr></thead><tbody>${knownDefects
        .map(
          (d) => `<tr><td>${esc(d.id)}</td><td>${esc(d.test.name)}</td><td>${esc(d.test.project)}</td></tr>`,
        )
        .join('')}</tbody></table>`
    : '<p>None.</p>'
}

<h2 id="gaps">5. Gaps</h2>
<p><b>Requirements with no tests:</b></p>
${notTested.length ? `<ul>${notTested.map((r) => `<li>${esc(r.id)}: ${esc(r.title)} (${esc(r.risk)} risk)</li>`).join('')}</ul>` : '<p>None.</p>'}
<p><b>Tests with no requirement:</b></p>
${unlinked.length ? `<ul>${unlinked.map((t) => `<li>${esc(t.name)} (${esc(t.project)})</li>`).join('')}</ul>` : '<p>None.</p>'}
<p><b>Requirement IDs used in tests but missing from the requirements file:</b></p>
${unknownIds.size ? `<ul>${[...unknownIds].map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '<p>None.</p>'}

<h2 id="results">6. All test results</h2>
<input type="search" id="filter" placeholder="Filter by test name, browser, result or requirement">
<table id="results-table">
<thead><tr><th>Test</th><th>Browser</th><th>Result</th><th>Started (UTC)</th><th>Time</th><th>Requirements</th><th>Tags</th><th>Evidence files</th></tr></thead>
<tbody>
${sortedTests.map(resultRow).join('\n')}
</tbody>
</table>

<h2 id="failures">7. Failures</h2>
${
  failures.length
    ? failures
        .map(
          (t) =>
            `<p><b>${esc(t.name)}</b> <span class="meta">[${esc(t.project)}]</span></p><pre>${esc(t.message || 'No message recorded.')}</pre>`,
        )
        .join('')
    : '<p>No test failed.</p>'
}

<h2 id="integrity">8. Integrity of the evidence</h2>
<p>This report is part of the evidence pack. The file <code>SHA256SUMS</code> in the pack lists a checksum for every
file in it, including this one. To check that nothing was changed, run <code>sha256sum -c SHA256SUMS</code> in the
pack folder: every line should say OK. The report itself cannot contain its own checksum, so record the SHA-256
of <code>manifest.json</code> from <code>SHA256SUMS</code> in your summary report.</p>
<p class="meta">Step-by-step detail for each test is in the Allure report of the same run, in the <code>allure</code> folder next to this file (open it with <code>npm run report:validation:open</code>). Screenshots, videos and traces are linked in the results table. A test that opens a second browser page (the accessibility scanner does) has a second, tiny video of a blank page. Normal runs keep them only for tests that fail or are retried; run <code>npm run test:capture</code> to record them for every test.</p>
</main>
<script>
document.getElementById('filter').addEventListener('input', (event) => {
  const term = event.target.value.toLowerCase();
  for (const row of document.querySelectorAll('#results-table tbody tr')) {
    row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
  }
});
</script>
</body>
</html>
`;

writeFileSync(outFile, html);
console.log(`validation report: ${outFile} (${tests.length} results, ${rows.length} requirements)`);

if (makePdf) {
  // Chromium prints the same page. Needs `npx playwright install chromium`; only used for local, on-demand runs.
  const require = createRequire(import.meta.url);
  const { chromium } = require('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.emulateMedia({ media: 'print' });
  await page.setContent(html, { waitUntil: 'load' });
  const pdfFile = outFile.replace(/\.html$/, '.pdf');
  await page.pdf({
    path: pdfFile,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="width:100%;font-size:8px;color:#666;text-align:center;font-family:Arial">Test validation report &nbsp;|&nbsp; <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
  await browser.close();
  console.log(`validation report: ${path.basename(pdfFile)} written`);
}
