import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { addNote, diffSnapshots, readNotes } from './change-record.mjs';
import { fingerprintFiles } from './git.mjs';

const files = [
  { path: 'tests/a.spec.ts', content: 'test a\n' },
  { path: 'src/b.ts', content: 'export const b = 1;\n' },
  { path: 'config/regulated.json', content: '{}\n' },
];

const snapshot = (overrides = {}) => ({
  git: { commit: 'a'.repeat(40), clean: true, changedFiles: [] },
  fingerprint: fingerprintFiles(files),
  config: { envFileSha256: 'e1' },
  probes: [{ name: 'app', status: 200, bodySha256: 'p1' }],
  ...overrides,
});

test('the same files give the same fingerprint, whatever the line endings', () => {
  const crlf = files.map((f) => ({ ...f, content: f.content.replace(/\n/g, '\r\n') }));
  assert.equal(fingerprintFiles(files).overall, fingerprintFiles(crlf).overall);
});

test('changing one file changes the fingerprint and names the area', () => {
  const changed = files.map((f) =>
    f.path === 'tests/a.spec.ts' ? { ...f, content: 'test a, edited\n' } : f,
  );
  const before = fingerprintFiles(files);
  const after = fingerprintFiles(changed);
  assert.notEqual(before.overall, after.overall);
  assert.notEqual(before.areas.tests, after.areas.tests);
  assert.equal(before.areas.src, after.areas.src);
});

test('nothing is reported when nothing changed', () => {
  assert.deepEqual(diffSnapshots(snapshot(), snapshot()), []);
});

test('every kind of change during a run is reported', () => {
  const changedFiles = files.map((f) => (f.path === 'src/b.ts' ? { ...f, content: 'edited\n' } : f));
  const end = snapshot({
    git: { commit: 'b'.repeat(40), clean: false, changedFiles: [' M src/b.ts'] },
    fingerprint: fingerprintFiles(changedFiles),
    config: { envFileSha256: 'e2' },
    probes: [{ name: 'app', status: 200, bodySha256: 'p2' }],
  });
  const text = diffSnapshots(snapshot(), end).join(' ');
  assert.match(text, /commit changed/);
  assert.match(text, /clean to dirty/);
  assert.match(text, /changed files/);
  assert.match(text, /code fingerprint changed during the run \(src\)/);
  assert.match(text, /environment profile file changed/);
  assert.match(text, /probe "app"/);
});

test('notes are kept in order with who wrote them and when', () => {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'notes-')), 'run-notes.jsonl');
  addNote('restarted the application', file);
  addNote('  re-seeded test data  ', file);
  const notes = readNotes(file);
  assert.equal(notes.length, 2);
  assert.equal(notes[1].text, 're-seeded test data');
  assert.ok(notes[0].by && notes[0].at);
  assert.deepEqual(readNotes(path.join(tmpdir(), 'no-such-notes.jsonl')), []);
});
