// Comparing a dry run with a formal run: same build, same code, same tests, same requirement verdicts, and a dry run
// that passed. Works on packs as folders or as sealed zips. Node built-ins only (plus the zip reader).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readZipText } from './zip.mjs';

/** A small CSV reader for the traceability matrix (every cell is quoted; quotes inside are doubled). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Reads manifest.json and the traceability matrix out of a pack (folder or zip). */
export async function loadPack(source) {
  const read = source.endsWith('.zip')
    ? (name) => readZipText(source, name)
    : async (name) =>
        existsSync(path.join(source, name)) ? readFileSync(path.join(source, name), 'utf8') : undefined;
  const manifestText = await read('manifest.json');
  const csvText = await read('traceability/traceability-matrix.csv');
  if (manifestText === undefined) throw new Error(`${source} has no manifest.json. Is it an evidence pack?`);
  if (csvText === undefined) throw new Error(`${source} has no traceability matrix.`);
  const [header, ...lines] = parseCsv(csvText);
  const rows = lines.map((cells) => Object.fromEntries(header.map((name, i) => [name, cells[i] ?? ''])));
  return { source, manifest: JSON.parse(manifestText), rows };
}

const tests = (pack) =>
  new Map(pack.rows.filter((r) => r.Test).map((r) => [`${r.Test} [${r.Browser}]`, r.Result]));
const verdicts = (pack) => new Map(pack.rows.map((r) => [r.Requirement, r.Verdict]));
const list = (items, limit = 5) =>
  items.length <= limit
    ? items.join('; ')
    : `${items.slice(0, limit).join('; ')}; and ${items.length - limit} more`;

/** The checks. `rules` come from config/regulated.json ("compare"). */
export function compareRuns(dry, formal, rules) {
  const checks = [];
  const add = (id, label, ok, detail = '', severity = 'fail') =>
    checks.push({ id, label, ok, detail, severity });
  const dryRun = dry.manifest.run ?? {};
  const formalRun = formal.manifest.run ?? {};

  add(
    'types',
    'The first pack is a dry run and the second a formal run',
    dryRun.type === 'dry' && formalRun.type === 'formal',
    `run types: ${dryRun.type ?? 'none'} and ${formalRun.type ?? 'none'}`,
  );

  if (rules.dryMustPass) {
    const bad = [...tests(dry)]
      .filter(([, result]) => result === 'failed' || result === 'broken')
      .map(([name]) => name);
    const failedRequirements = [...verdicts(dry)].filter(([, v]) => v === 'Failed').map(([id]) => id);
    add(
      'dryPassed',
      'The dry run passed',
      bad.length === 0 && failedRequirements.length === 0,
      bad.length || failedRequirements.length
        ? `failed: ${list([...bad, ...failedRequirements])}`
        : 'no failed tests or requirements',
    );
  }

  if (rules.requireSameBuild) {
    add(
      'build',
      'Both ran against the same application build',
      Boolean(dryRun.buildId) && dryRun.buildId === formalRun.buildId,
      `${dryRun.buildId ?? 'none'} and ${formalRun.buildId ?? 'none'}`,
    );
  }

  if (rules.requireSameScripts) {
    const a = dry.manifest.changeRecord?.start?.fingerprint;
    const b = formal.manifest.changeRecord?.start?.fingerprint;
    const sameScripts = Boolean(a && b) && a.overall === b.overall;
    const areas = a && b ? Object.keys(b.areas).filter((k) => a.areas[k] !== b.areas[k]) : [];
    add(
      'code',
      'Both ran the same scripts (same code fingerprint)',
      sameScripts,
      !a || !b
        ? 'a code fingerprint is missing from a pack'
        : sameScripts
          ? `fingerprint ${a.overall.slice(0, 12)}, ${b.fileCount} files`
          : `the scripts changed between the runs${areas.length ? ` (${areas.join(', ')})` : ''}`,
    );
    const sameCommit = dry.manifest.commit === formal.manifest.commit;
    add(
      'commit',
      'Both ran from the same commit',
      sameCommit,
      sameCommit
        ? String(formal.manifest.commit).slice(0, 8)
        : `commits ${String(dry.manifest.commit).slice(0, 8)} and ${String(formal.manifest.commit).slice(0, 8)}${sameScripts ? '; the scripts are identical, so only files outside the scripts changed' : ''}`,
      'warn',
    );
  }

  const sameList = (a = [], b = []) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  add(
    'images',
    'The application images are the same',
    sameList(dry.manifest.applicationImages, formal.manifest.applicationImages),
    'compares the image digests recorded in the manifests',
    'warn',
  );
  const de = dry.manifest.environment ?? {};
  const fe = formal.manifest.environment ?? {};
  add(
    'tools',
    'Node.js and Playwright versions are the same',
    de.node === fe.node && de.playwright === fe.playwright,
    `${de.node} / ${de.playwright} and ${fe.node} / ${fe.playwright}`,
    'warn',
  );

  add(
    'framework',
    'The framework version is the same',
    dry.manifest.frameworkVersion === formal.manifest.frameworkVersion,
    `${dry.manifest.frameworkVersion ?? 'not recorded'} and ${formal.manifest.frameworkVersion ?? 'not recorded'}`,
    'warn',
  );

  if (rules.requireSameTests) {
    const a = tests(dry);
    const b = tests(formal);
    const onlyDry = [...a.keys()].filter((k) => !b.has(k));
    const onlyFormal = [...b.keys()].filter((k) => !a.has(k));
    add(
      'tests',
      'The same tests were run',
      onlyDry.length === 0 && onlyFormal.length === 0,
      onlyDry.length || onlyFormal.length
        ? `only in the dry run: ${onlyDry.length ? list(onlyDry) : 'none'}; only in the formal run: ${onlyFormal.length ? list(onlyFormal) : 'none'}`
        : `${a.size} tests in each`,
    );
  }

  if (rules.requireSameVerdicts) {
    const a = verdicts(dry);
    const b = verdicts(formal);
    const different = [...new Set([...a.keys(), ...b.keys()])]
      .filter((id) => a.get(id) !== b.get(id))
      .map((id) => `${id} (${a.get(id) ?? 'none'} then ${b.get(id) ?? 'none'})`);
    add(
      'verdicts',
      'Every requirement has the same verdict',
      different.length === 0,
      different.length ? list(different) : `${a.size} requirements`,
    );
  }

  return { ok: checks.every((c) => c.ok || c.severity === 'warn'), checks, dry: dryRun, formal: formalRun };
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Writes comparison.json and comparison.html into `directory`. */
export function writeComparison(directory, result, meta = {}) {
  mkdirSync(directory, { recursive: true });
  const record = { comparedAt: new Date().toISOString(), ...meta, ok: result.ok, checks: result.checks };
  writeFileSync(path.join(directory, 'comparison.json'), JSON.stringify(record, null, 2) + '\n');
  const rows = result.checks
    .map((c) => {
      const tone = c.ok ? 'ok' : c.severity === 'warn' ? 'warn' : 'bad';
      const word = c.ok ? 'matches' : c.severity === 'warn' ? 'differs (warning)' : 'DIFFERS';
      return `<tr><td>${esc(c.label)}</td><td class="${tone}">${word}</td><td>${esc(c.detail)}</td></tr>`;
    })
    .join('\n');
  writeFileSync(
    path.join(directory, 'comparison.html'),
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Dry run and formal run comparison</title>
<style>body{font:15px/1.5 -apple-system,"Segoe UI",Arial,sans-serif;margin:24px auto;max-width:960px;padding:0 16px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #d1d9e0;padding:6px 10px;text-align:left;vertical-align:top}
th{background:#f6f8fa}.ok{color:#1a7f37;font-weight:600}.warn{color:#9a6700;font-weight:600}.bad{color:#cf222e;font-weight:600}</style></head>
<body><h1>Dry run and formal run comparison</h1>
<p>Result: <b class="${result.ok ? 'ok' : 'bad'}">${result.ok ? 'the runs match' : 'the runs differ'}</b>. Dry run: ${esc(meta.against ?? '')}. Compared ${esc(record.comparedAt)}.</p>
<table><thead><tr><th>Check</th><th>Result</th><th>Detail</th></tr></thead><tbody>
${rows}
</tbody></table></body></html>
`,
  );
  return record;
}
