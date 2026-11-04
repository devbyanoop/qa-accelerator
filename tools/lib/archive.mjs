// Sealing a regulated run: the zip of the pack, its checksum file and the tamper-evident audit log.
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { archiveDir } from './paths.mjs';
import { sha256OfFile, zipDirectory } from './zip.mjs';

export function timestamp(date = new Date()) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');
}

const safe = (text) =>
  String(text)
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '_');

export function archiveName(type, build, date = new Date()) {
  return `${type.toUpperCase()}-${safe(build)}-${timestamp(date)}`;
}

/**
 * Zips the pack into <directory>/<name>.zip and writes <name>.zip.sha256 beside it. Never overwrites: a sealed
 * archive is a record. `suffix` marks archives that must not be mistaken for good ones, for example "-FAILED".
 */
export async function sealArchive({
  packDir,
  type,
  build,
  suffix = '',
  directory = archiveDir,
  date = new Date(),
}) {
  mkdirSync(directory, { recursive: true });
  const zipPath = path.join(directory, `${archiveName(type, build, date)}${suffix}.zip`);
  if (existsSync(zipPath))
    throw new Error(`${zipPath} already exists. A sealed archive is never overwritten.`);
  await zipDirectory(packDir, zipPath);
  const sha256 = await sha256OfFile(zipPath);
  const shaPath = `${zipPath}.sha256`;
  writeFileSync(shaPath, `${sha256}  ${path.basename(zipPath)}\n`);
  return { zipPath, shaPath, sha256 };
}

const entryHash = (entry) => createHash('sha256').update(JSON.stringify(entry)).digest('hex');

/** Appends one line to the audit log. Each line carries the hash of the one before, so an edit breaks the chain. */
export function appendAudit(event, details = {}, file = path.join(archiveDir, 'audit-log.jsonl')) {
  mkdirSync(path.dirname(file), { recursive: true });
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
  const prev = lines.length ? JSON.parse(lines[lines.length - 1]).hash : null;
  const entry = {
    at: new Date().toISOString(),
    by: os.userInfo().username,
    host: os.hostname(),
    event,
    ...details,
    prev,
  };
  appendFileSync(file, JSON.stringify({ ...entry, hash: entryHash(entry) }) + '\n');
}

/** Checks that no line of the audit log was edited, removed or reordered. */
export function verifyAuditLog(file) {
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  let prev = null;
  for (const [index, line] of lines.entries()) {
    const { hash, ...entry } = JSON.parse(line);
    if (entry.prev !== prev)
      return {
        ok: false,
        lines: lines.length,
        problem: `line ${index + 1} does not follow the line before it`,
      };
    if (entryHash(entry) !== hash)
      return { ok: false, lines: lines.length, problem: `line ${index + 1} was changed` };
    prev = hash;
  }
  return { ok: true, lines: lines.length };
}
