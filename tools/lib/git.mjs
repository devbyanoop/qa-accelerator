// What git and the working folder say about the code that is about to run (or just ran). Node built-ins only.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

function git(command) {
  try {
    return execSync(`git ${command}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

/** Commit, branch, whether the working tree is clean, what differs from the commit and from the remote. */
export function gitState() {
  const porcelain = git('status --porcelain') ?? '';
  const changed = porcelain
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const upstream = git('rev-parse --abbrev-ref --symbolic-full-name @{u}');
  const counts = upstream ? git('rev-list --left-right --count HEAD...@{u}') : null;
  const [ahead, behind] = counts ? counts.split(/\s+/).map(Number) : [null, null];
  return {
    commit: git('rev-parse HEAD') ?? 'unknown',
    branch: git('rev-parse --abbrev-ref HEAD') ?? 'unknown',
    tag: git('describe --tags --exact-match') ?? null,
    clean: changed.length === 0,
    changedFiles: changed,
    upstream: upstream ?? null,
    aheadOfUpstream: ahead,
    behindUpstream: behind,
  };
}

const text = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const sha = (content) => createHash('sha256').update(content).digest('hex');

/** The areas that make up "the scripts that were validated". A file belongs to the first area whose prefix matches. */
export const fingerprintAreas = [
  ['tests', ['tests/']],
  ['src', ['src/']],
  ['config', ['config/']],
  ['tools', ['tools/']],
  ['infra', ['infra/']],
  ['requirements', ['docs/regulated/requirements.json']],
  [
    'root',
    [
      'playwright.config.ts',
      'playwright.capture.config.ts',
      'package.json',
      'package-lock.json',
      'tsconfig.json',
    ],
  ],
];

/** A stable fingerprint of file contents. `files` is a list of { path, content }. Line endings do not matter. */
export function fingerprintFiles(files) {
  const byArea = new Map(fingerprintAreas.map(([name]) => [name, []]));
  for (const file of files) {
    const area = fingerprintAreas.find(([, prefixes]) =>
      prefixes.some((p) => file.path === p || file.path.startsWith(p)),
    );
    if (area) byArea.get(area[0]).push(`${file.path}:${sha(file.content.replace(/\r\n/g, '\n'))}`);
  }
  const areas = {};
  let fileCount = 0;
  for (const [name, lines] of byArea) {
    lines.sort();
    fileCount += lines.length;
    areas[name] = sha(lines.join('\n'));
  }
  return {
    overall: sha(
      Object.entries(areas)
        .map(([n, h]) => `${n}=${h}`)
        .join('\n'),
    ),
    areas,
    fileCount,
  };
}

/** Fingerprint of the working folder as it is now: tracked files plus new files that are not ignored. */
export function codeFingerprint() {
  const tracked = (git('ls-files') ?? '').split('\n');
  const untracked = (git('ls-files --others --exclude-standard') ?? '').split('\n');
  const paths = [...new Set([...tracked, ...untracked])].filter((p) => p && existsSync(p));
  const files = [];
  for (const p of paths) {
    try {
      files.push({ path: p.replace(/\\/g, '/'), content: text(p) });
    } catch {
      // a binary or unreadable file is not part of the scripts
    }
  }
  return fingerprintFiles(files);
}

/** A hash of the environment profile file (never its contents) and the non-secret settings that shape a run. */
export function configFingerprint(env = process.env) {
  const profile = env.TEST_ENV ?? 'local';
  const file = `.env.${profile}`;
  const keys = ['TEST_ENV', 'UI_URL', 'API_URL', 'APP_NAME', 'BROWSERS', 'WORKERS'];
  return {
    profile,
    envFileSha256: existsSync(file) ? sha(text(file)) : null,
    settings: Object.fromEntries(keys.map((k) => [k, env[k] ?? null])),
  };
}
