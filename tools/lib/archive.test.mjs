import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { appendAudit, archiveName, sealArchive, verifyAuditLog } from './archive.mjs';
import { verifyPack } from './verify.mjs';
import { sha256OfFile } from './zip.mjs';

const temp = (prefix) => mkdtempSync(path.join(tmpdir(), prefix));

async function makePack() {
  const dir = temp('pack-');
  mkdirSync(path.join(dir, 'sub'));
  writeFileSync(path.join(dir, 'report.html'), '<h1>report</h1>');
  writeFileSync(path.join(dir, 'sub', 'data.json'), '{"a":1}');
  const lines = [];
  for (const file of ['report.html', 'sub/data.json'])
    lines.push(`${await sha256OfFile(path.join(dir, file))}  ${file}`);
  writeFileSync(path.join(dir, 'SHA256SUMS'), lines.join('\n') + '\n');
  return dir;
}

test('archive names carry the run type, the build and a UTC time', () => {
  const name = archiveName('formal', '2.4.1 rc/1', new Date('2026-11-04T10:15:30.123Z'));
  assert.equal(name, 'FORMAL-2.4.1_rc_1-20261104T101530Z');
});

test('a sealed zip verifies, and its checksum file matches', async () => {
  const pack = await makePack();
  const out = temp('archive-');
  const sealed = await sealArchive({ packDir: pack, type: 'dry', build: '1.0', directory: out });
  assert.equal(readFileSync(sealed.shaPath, 'utf8').split(/\s+/)[0], sealed.sha256);
  const result = await verifyPack(sealed.zipPath);
  assert.equal(result.ok, true, result.problems.join('; '));
  assert.equal(result.checked, 2);
});

test('a sealed archive is never overwritten', async () => {
  const pack = await makePack();
  const out = temp('archive-');
  const date = new Date('2026-11-04T10:15:30Z');
  await sealArchive({ packDir: pack, type: 'dry', build: '1.0', directory: out, date });
  await assert.rejects(
    sealArchive({ packDir: pack, type: 'dry', build: '1.0', directory: out, date }),
    /never overwritten/,
  );
});

test('a zip that no longer matches its checksum file is caught', async () => {
  const pack = await makePack();
  const out = temp('archive-');
  const sealed = await sealArchive({ packDir: pack, type: 'dry', build: '1.0', directory: out });
  writeFileSync(sealed.shaPath, `${'0'.repeat(64)}  x.zip\n`);
  const result = await verifyPack(sealed.zipPath);
  assert.equal(result.ok, false);
  assert.match(result.problems.join(' '), /does not match its \.sha256/);
});

test('a pack folder with a changed or extra file is caught', async () => {
  const pack = await makePack();
  assert.equal((await verifyPack(pack)).ok, true);
  writeFileSync(path.join(pack, 'report.html'), '<h1>edited</h1>');
  writeFileSync(path.join(pack, 'extra.txt'), 'x');
  const result = await verifyPack(pack);
  assert.equal(result.ok, false);
  assert.match(result.problems.join(' '), /changed: report\.html/);
  assert.match(result.problems.join(' '), /not in the checksum list: extra\.txt/);
});

test('the audit log is a hash chain: an edit or a removed line breaks it', () => {
  const file = path.join(temp('audit-'), 'audit-log.jsonl');
  appendAudit('run-started', { build: '1' }, file);
  appendAudit('run-sealed', { build: '1' }, file);
  appendAudit('run-started', { build: '2' }, file);
  assert.equal(verifyAuditLog(file).ok, true);

  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const edited = path.join(path.dirname(file), 'edited.jsonl');
  writeFileSync(
    edited,
    [lines[0].replace('"build":"1"', '"build":"9"'), lines[1], lines[2]].join('\n') + '\n',
  );
  assert.equal(verifyAuditLog(edited).ok, false);

  const removed = path.join(path.dirname(file), 'removed.jsonl');
  writeFileSync(removed, [lines[0], lines[2]].join('\n') + '\n');
  assert.equal(verifyAuditLog(removed).ok, false);

  appendFileSync(file, '');
});
