// Builds a requirement-to-test traceability matrix from the Allure results of a run.
// Node built-ins only.
//
//   node tools/traceability.mjs                       writes reports/regulated/traceability/
//   node tools/traceability.mjs --strict              also exits 1 if a requirement is untested or failing
//   options: --results <dir>  --requirements <file>  --out <dir>
//
// Tests link to requirements with tags: `tag: [...requirement('REQ-...')]` (src/utils/requirements.ts). Any tag that
// starts with REQ- counts as a requirement ID.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
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
const outDir = option('out', `${regulatedDir}/traceability`);
const strict = args.includes('--strict');

const { tests, rows, unlinked, unknownIds } = analyse(resultsDir, requirementsFile);

let commit = process.env.GITHUB_SHA ?? '';
if (!commit) {
  try {
    commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    commit = 'unknown';
  }
}
const generated = new Date().toISOString();
const knownDefects = rows.flatMap((r) =>
  r.tests.filter((t) => t.knownIssue).map((t) => ({ requirement: r.id, test: t })),
);
const projects = [...new Set(tests.map((t) => t.project))].sort();
const count = (v) => rows.filter((r) => r.verdict === v).length;
const withDefects = 'Verified (known defect)';

mkdirSync(outDir, { recursive: true });

// CSV: one line per requirement and test, for spreadsheets and auditors.
const csvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;
const csv = [['Requirement', 'Title', 'Risk', 'Verdict', 'Test', 'Browser', 'Result'].map(csvCell).join(',')];
for (const row of rows) {
  if (row.tests.length === 0) {
    csv.push([row.id, row.title, row.risk, row.verdict, '', '', ''].map(csvCell).join(','));
  }
  for (const t of row.tests) {
    csv.push([row.id, row.title, row.risk, row.verdict, t.name, t.project, t.status].map(csvCell).join(','));
  }
}
writeFileSync(path.join(outDir, 'traceability-matrix.csv'), csv.join('\n') + '\n');

// Markdown
const md = [
  '# Requirements traceability matrix',
  '',
  `Generated: ${generated}  `,
  `Commit: \`${commit}\`  `,
  `Browsers: ${projects.join(', ') || 'none'}  `,
  `Requirements: ${rows.length} (verified ${count('Verified')}, verified with known defects ${count(withDefects)}, ` +
    `failed ${count('Failed')}, not tested ${count('Not tested')}, skipped ${count('Skipped')})`,
  '',
  '| Requirement | Title | Risk | Tests | Verdict |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.id} | ${r.title} | ${r.risk} | ${r.tests.length} | ${r.verdict} |`),
  '',
];
if (knownDefects.length) {
  md.push(
    '## Known defects',
    '',
    'These tests are written as expected failures: the requirement is not fully met until the defect is fixed.',
    '',
    ...knownDefects.map((d) => `- ${d.requirement}: ${d.test.name} (${d.test.project})`),
    '',
  );
}
if (unlinked.length) {
  md.push('## Tests with no requirement', '', ...unlinked.map((t) => `- ${t.name} (${t.project})`), '');
}
if (unknownIds.size) {
  md.push(
    '## Requirement IDs used in tests but missing from the requirements file',
    '',
    ...[...unknownIds].map((i) => `- ${i}`),
    '',
  );
}
writeFileSync(path.join(outDir, 'traceability-matrix.md'), md.join('\n'));

// HTML
const escapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => escapes[c]);
const tone = (v) => (v === 'Verified' ? 'ok' : v === 'Failed' ? 'bad' : 'warn');
const testItem = (t) =>
  `<li>${esc(t.name)} <span class="meta">[${esc(t.project)}] ${esc(t.status)}${t.knownIssue ? ', known defect' : ''}</span></li>`;
const rowHtml = (r) =>
  `<tr><td>${esc(r.id)}</td><td>${esc(r.title)}</td><td>${esc(r.risk)}</td>` +
  `<td class="${tone(r.verdict)}">${esc(r.verdict)}</td><td>` +
  (r.tests.length === 0
    ? '<span class="meta">none</span>'
    : `<details><summary>${r.tests.length} test(s)</summary><ul>${r.tests.map(testItem).join('')}</ul></details>`) +
  '</td></tr>';
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Requirements traceability matrix</title>
<style>
body { font: 15px/1.5 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 24px 16px; color: #1f2328; background: #fff; }
main { max-width: 1000px; margin: 0 auto; }
h1 { margin-top: 0; }
table { border-collapse: collapse; width: 100%; margin: 16px 0; }
th, td { border: 1px solid #d1d9e0; padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: #f6f8fa; }
.ok { color: #1a7f37; font-weight: 600; } .bad { color: #cf222e; font-weight: 600; } .warn { color: #9a6700; font-weight: 600; }
.meta { color: #59636e; }
@media (prefers-color-scheme: dark) {
  body { background: #0d1117; color: #e6edf3; } th { background: #151b23; } th, td { border-color: #3d444d; } .meta { color: #9198a1; }
}
</style>
</head>
<body>
<main>
<h1>Requirements traceability matrix</h1>
<p class="meta">Generated ${esc(generated)} &middot; commit <code>${esc(commit)}</code> &middot; browsers: ${esc(projects.join(', ') || 'none')}<br>
${rows.length} requirements: ${count('Verified')} verified, ${count(withDefects)} verified with known defects, ${count('Failed')} failed, ${count('Not tested')} not tested, ${count('Skipped')} skipped.</p>
<table>
<thead><tr><th>Requirement</th><th>Title</th><th>Risk</th><th>Verdict</th><th>Tests</th></tr></thead>
<tbody>
${rows.map(rowHtml).join('\n')}
</tbody>
</table>
${knownDefects.length ? `<h2>Known defects</h2><p class="meta">These tests are written as expected failures: the requirement is not fully met until the defect is fixed.</p><ul>${knownDefects.map((d) => `<li>${esc(d.requirement)}: ${esc(d.test.name)} <span class="meta">(${esc(d.test.project)})</span></li>`).join('')}</ul>` : ''}
${unlinked.length ? `<h2>Tests with no requirement</h2><ul>${unlinked.map((t) => `<li>${esc(t.name)} (${esc(t.project)})</li>`).join('')}</ul>` : ''}
${unknownIds.size ? `<h2>Requirement IDs missing from the requirements file</h2><ul>${[...unknownIds].map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
</main>
</body>
</html>
`;
writeFileSync(path.join(outDir, 'traceability-matrix.html'), html);

console.log(
  `traceability: ${rows.length} requirements, ${tests.length} test results (${projects.join(', ') || 'none'}). ` +
    `Verified ${count('Verified')}, with known defects ${count(withDefects)}, failed ${count('Failed')}, ` +
    `not tested ${count('Not tested')}, skipped ${count('Skipped')}. ` +
    `${unlinked.length} test(s) without a requirement. Written to ${outDir}/`,
);

if (strict && (count('Failed') > 0 || count('Not tested') > 0 || unknownIds.size > 0)) {
  console.error(
    'traceability: --strict failed (a requirement is failing or untested, or an unknown ID is used).',
  );
  process.exit(1);
}
