// Checking an evidence pack, as a folder or as a sealed zip, against its own checksums.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { hashZipEntries, readZipText, sha256OfFile } from './zip.mjs';

/** Parses a SHA256SUMS file into a Map of file name to digest. */
export function parseSums(text) {
  const sums = new Map();
  for (const line of text.split('\n')) {
    const match = line.match(/^([0-9a-f]{64}) [ *](.+)$/);
    if (match) sums.set(match[2], match[1]);
  }
  return sums;
}

function listFiles(directory, base = directory) {
  return readdirSync(directory).flatMap((name) => {
    const full = path.join(directory, name);
    if (statSync(full).isDirectory()) return listFiles(full, base);
    return [path.relative(base, full).split(path.sep).join('/')];
  });
}

function compare(sums, actual) {
  const problems = [];
  for (const [file, digest] of sums) {
    if (!actual.has(file)) problems.push(`missing: ${file}`);
    else if (actual.get(file) !== digest) problems.push(`changed: ${file}`);
  }
  for (const file of actual.keys()) {
    if (file !== 'SHA256SUMS' && !sums.has(file)) problems.push(`not in the checksum list: ${file}`);
  }
  return problems;
}

/**
 * Verifies a pack. For a zip it first checks the zip against the .sha256 file beside it (when there is one), then
 * every file inside against the pack's own SHA256SUMS. Returns { ok, problems, checked }.
 */
export async function verifyPack(target) {
  const problems = [];
  if (target.endsWith('.zip')) {
    const shaFile = `${target}.sha256`;
    if (existsSync(shaFile)) {
      const expected = readFileSync(shaFile, 'utf8').trim().split(/\s+/)[0];
      if ((await sha256OfFile(target)) !== expected) problems.push('the zip does not match its .sha256 file');
    } else {
      problems.push('there is no .sha256 file beside the zip, so the zip itself cannot be checked');
    }
    const sumsText = await readZipText(target, 'SHA256SUMS');
    if (sumsText === undefined)
      return { ok: false, problems: [...problems, 'the zip has no SHA256SUMS'], checked: 0 };
    const sums = parseSums(sumsText);
    problems.push(...compare(sums, await hashZipEntries(target)));
    return { ok: problems.length === 0, problems, checked: sums.size };
  }
  const sumsFile = path.join(target, 'SHA256SUMS');
  if (!existsSync(sumsFile)) return { ok: false, problems: ['the folder has no SHA256SUMS'], checked: 0 };
  const sums = parseSums(readFileSync(sumsFile, 'utf8'));
  const actual = new Map();
  for (const file of listFiles(target)) {
    if (file !== 'SHA256SUMS') actual.set(file, await sha256OfFile(path.join(target, file)));
  }
  problems.push(...compare(sums, actual));
  return { ok: problems.length === 0, problems, checked: sums.size };
}
