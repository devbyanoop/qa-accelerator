// The change record of a regulated run: what the code, the configuration and the application looked like when the
// run started and ended, what changed in between, and the notes people wrote while it ran. Node built-ins only.
import { Buffer } from 'node:buffer';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { codeFingerprint, configFingerprint, gitState } from './git.mjs';
import { runNotesFile } from './paths.mjs';

/** Fetches each configured URL and records its status and a hash of the answer, so a change is visible later. */
export async function runProbes(probes = []) {
  const results = [];
  for (const probe of probes) {
    try {
      const response = await fetch(probe.url, { signal: AbortSignal.timeout(10_000) });
      const body = Buffer.from(await response.arrayBuffer()).subarray(0, 1_000_000);
      results.push({
        name: probe.name,
        url: probe.url,
        status: response.status,
        bodySha256: createHash('sha256').update(body).digest('hex'),
      });
    } catch (error) {
      results.push({ name: probe.name, url: probe.url, error: String(error.message ?? error) });
    }
  }
  return results;
}

/** Everything that can be checked about "what is about to run" right now. */
export async function takeSnapshot({ probes = [], env = process.env } = {}) {
  return {
    takenAt: new Date().toISOString(),
    git: gitState(),
    fingerprint: codeFingerprint(),
    config: configFingerprint(env),
    probes: await runProbes(probes),
  };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** What differs between two snapshots, as readable sentences. Empty means nothing changed. */
export function diffSnapshots(start, end) {
  const differences = [];
  if (start.git.commit !== end.git.commit) {
    differences.push(
      `The commit changed during the run (${start.git.commit.slice(0, 8)} to ${end.git.commit.slice(0, 8)}).`,
    );
  }
  if (start.git.clean !== end.git.clean) {
    differences.push(
      `The working tree went from ${start.git.clean ? 'clean' : 'dirty'} to ${end.git.clean ? 'clean' : 'dirty'}.`,
    );
  }
  if (!same(start.git.changedFiles, end.git.changedFiles)) {
    differences.push('The list of changed files differs between the start and the end of the run.');
  }
  if (start.fingerprint.overall !== end.fingerprint.overall) {
    const areas = Object.keys(end.fingerprint.areas).filter(
      (a) => start.fingerprint.areas[a] !== end.fingerprint.areas[a],
    );
    differences.push(`The code fingerprint changed during the run (${areas.join(', ') || 'unknown area'}).`);
  }
  if (start.config.envFileSha256 !== end.config.envFileSha256) {
    differences.push('The environment profile file changed during the run.');
  }
  for (const before of start.probes) {
    const after = end.probes.find((p) => p.name === before.name);
    if (
      !after ||
      before.status !== after.status ||
      before.bodySha256 !== after.bodySha256 ||
      before.error !== after.error
    ) {
      differences.push(`The application probe "${before.name}" answered differently at the end of the run.`);
    }
  }
  return differences;
}

/** Adds a timestamped note, with the person who wrote it, to the notes of the current run. */
export function addNote(text, file = runNotesFile) {
  mkdirSync(path.dirname(file), { recursive: true });
  const note = {
    at: new Date().toISOString(),
    by: os.userInfo().username,
    host: os.hostname(),
    text: String(text).trim(),
  };
  appendFileSync(file, JSON.stringify(note) + '\n');
  return note;
}

export function readNotes(file = runNotesFile) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
