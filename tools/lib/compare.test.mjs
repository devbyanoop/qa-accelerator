import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { compareRuns, loadPack, parseCsv } from './compare.mjs';

const rules = {
  dryMustPass: true,
  requireSameBuild: true,
  requireSameScripts: true,
  requireSameTests: true,
  requireSameVerdicts: true,
};

const cell = (value) => `"${String(value).replaceAll('"', '""')}"`;
function writePack({
  type = 'dry',
  build = '2.4.1',
  commit = 'a'.repeat(40),
  fingerprint = 'f1',
  tests,
  verdicts,
  images = ['img@1'],
  frameworkVersion = '1.0.0',
} = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'pack-'));
  mkdirSync(path.join(dir, 'traceability'));
  const manifest = {
    commit,
    frameworkVersion,
    run: { type, buildId: build },
    environment: { node: 'v20', playwright: '1.64' },
    applicationImages: images,
    changeRecord: {
      start: { fingerprint: { overall: fingerprint, areas: { tests: fingerprint, src: 's' } } },
    },
  };
  writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  const lines = [
    ['Requirement', 'Title', 'Risk', 'Verdict', 'Test', 'Browser', 'Result'].map(cell).join(','),
  ];
  for (const [name, result] of Object.entries(tests ?? { 'a test': 'passed', 'b test': 'passed' })) {
    lines.push(
      ['REQ-1', 'Title, with comma', 'high', verdicts?.['REQ-1'] ?? 'Verified', name, 'chromium', result]
        .map(cell)
        .join(','),
    );
  }
  writeFileSync(path.join(dir, 'traceability', 'traceability-matrix.csv'), lines.join('\n') + '\n');
  return dir;
}
const compare = async (dryOptions, formalOptions) =>
  compareRuns(
    await loadPack(writePack({ type: 'dry', ...dryOptions })),
    await loadPack(writePack({ type: 'formal', ...formalOptions })),
    rules,
  );

test('the CSV reader handles quotes and commas inside cells', () => {
  assert.deepEqual(parseCsv('"a","b, c","say ""hi"""\n"1","2","3"\n'), [
    ['a', 'b, c', 'say "hi"'],
    ['1', '2', '3'],
  ]);
});

test('a formal run identical to its dry run matches', async () => {
  const result = await compare({}, {});
  assert.equal(result.ok, true, JSON.stringify(result.checks.filter((c) => !c.ok)));
});

test('a different build is refused', async () => {
  const result = await compare({}, { build: '2.4.2' });
  assert.equal(result.ok, false);
  assert.equal(result.checks.find((c) => c.id === 'build').ok, false);
});

test('changed scripts are refused, and the area is named', async () => {
  const result = await compare({}, { fingerprint: 'f2', commit: 'b'.repeat(40) });
  const code = result.checks.find((c) => c.id === 'code');
  assert.equal(code.ok, false);
  assert.match(code.detail, /tests/);
});

test('a test that was not run, or an extra one, is refused', async () => {
  const missing = await compare({}, { tests: { 'a test': 'passed' } });
  assert.equal(missing.checks.find((c) => c.id === 'tests').ok, false);
  const extra = await compare({}, { tests: { 'a test': 'passed', 'b test': 'passed', 'c test': 'passed' } });
  assert.equal(extra.checks.find((c) => c.id === 'tests').ok, false);
});

test('a requirement whose verdict changed is refused', async () => {
  const result = await compare({}, { verdicts: { 'REQ-1': 'Failed' } });
  assert.equal(result.checks.find((c) => c.id === 'verdicts').ok, false);
});

test('a dry run that did not pass cannot be the basis of a formal run', async () => {
  const result = await compare(
    { tests: { 'a test': 'failed', 'b test': 'passed' } },
    { tests: { 'a test': 'failed', 'b test': 'passed' } },
  );
  assert.equal(result.checks.find((c) => c.id === 'dryPassed').ok, false);
  assert.equal(result.ok, false);
});

test('different application images or tool versions are only a warning', async () => {
  const result = await compare({}, { images: ['img@2'] });
  const images = result.checks.find((c) => c.id === 'images');
  assert.equal(images.ok, false);
  assert.equal(images.severity, 'warn');
  assert.equal(result.ok, true);
});

test('two packs of the wrong run types are refused', async () => {
  const result = compareRuns(
    await loadPack(writePack({ type: 'formal' })),
    await loadPack(writePack({ type: 'formal' })),
    rules,
  );
  assert.equal(result.checks.find((c) => c.id === 'types').ok, false);
});

test('a different commit with identical scripts is only a warning', async () => {
  const result = await compare({}, { commit: 'b'.repeat(40) });
  assert.equal(result.checks.find((c) => c.id === 'code').ok, true);
  const commit = result.checks.find((c) => c.id === 'commit');
  assert.equal(commit.ok, false);
  assert.equal(commit.severity, 'warn');
  assert.match(commit.detail, /scripts are identical/);
  assert.equal(result.ok, true);
});

test('a different framework version is a warning, not a failure', async () => {
  const result = await compare({}, { frameworkVersion: '1.1.0' });
  const framework = result.checks.find((c) => c.id === 'framework');
  assert.equal(framework.ok, false);
  assert.equal(framework.severity, 'warn');
  assert.match(framework.detail, /1\.0\.0 and 1\.1\.0/);
  assert.equal(result.ok, true);
});
