// Pins the GitHub Actions used in .github/workflows to the full commit they point to today, so a moved or hijacked
// tag cannot change what runs in CI. Dependabot keeps pinned actions up to date (it reads the version in the comment).
//
//   node tools/pin-actions.mjs            pin every action that is not pinned yet (needs the internet)
//   node tools/pin-actions.mjs --check    only report unpinned actions; exits 1 if there are any (used in CI)
//
// Set GITHUB_TOKEN to avoid the low rate limit of anonymous GitHub API calls.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const usesLine = /^(\s*(?:-\s+)?uses:\s*)([^\s#]+)([ \t]*#.*)?$/gm;
const fullSha = /^[0-9a-f]{40}$/;

/** What an action reference needs: not a local path, not a docker image, and no 40-character commit yet. */
function parse(spec) {
  if (spec.startsWith('./') || spec.startsWith('docker://')) return null;
  const at = spec.lastIndexOf('@');
  if (at < 0) return null;
  const name = spec.slice(0, at);
  const ref = spec.slice(at + 1);
  return { name, ref, repo: name.split('/').slice(0, 2).join('/'), pinned: fullSha.test(ref) };
}

/** The actions in a workflow file that are not pinned to a commit. */
export function unpinned(text) {
  const found = [];
  for (const match of text.matchAll(usesLine)) {
    const parsed = parse(match[2]);
    if (parsed && !parsed.pinned) found.push(`${parsed.name}@${parsed.ref}`);
  }
  return found;
}

/** Rewrites every unpinned action to `name@<commit> # <ref>`. `resolve(repo, ref)` returns the commit. */
export async function pinText(text, resolve) {
  const pinned = [];
  let result = '';
  let last = 0;
  for (const match of text.matchAll(usesLine)) {
    const parsed = parse(match[2]);
    if (!parsed || parsed.pinned) continue;
    const sha = await resolve(parsed.repo, parsed.ref);
    result += text.slice(last, match.index) + `${match[1]}${parsed.name}@${sha} # ${parsed.ref}`;
    last = match.index + match[0].length;
    pinned.push({ action: parsed.name, ref: parsed.ref, sha });
  }
  return { text: result + text.slice(last), pinned };
}

async function resolveFromGitHub(repo, ref) {
  const headers = { 'User-Agent': 'qa-accelerator-pin-actions', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(ref)}`, {
    headers,
  });
  if (!response.ok) throw new Error(`Could not resolve ${repo}@${ref}: GitHub answered ${response.status}.`);
  const { sha } = await response.json();
  if (!fullSha.test(sha ?? '')) throw new Error(`GitHub returned no commit for ${repo}@${ref}.`);
  return sha;
}

async function main() {
  const directory = '.github/workflows';
  const files = readdirSync(directory)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => path.join(directory, f));

  if (process.argv.includes('--check')) {
    const problems = files.flatMap((file) =>
      unpinned(readFileSync(file, 'utf8')).map((a) => `${file}: ${a}`),
    );
    if (problems.length) {
      console.error('These actions are not pinned to a commit (run: npm run pin:actions):');
      for (const problem of problems) console.error(`  ${problem}`);
      process.exit(1);
    }
    console.log(`all actions in ${files.length} workflow files are pinned to a commit.`);
    return;
  }

  const cache = new Map();
  const resolve = async (repo, ref) => {
    const key = `${repo}@${ref}`;
    if (!cache.has(key)) cache.set(key, await resolveFromGitHub(repo, ref));
    return cache.get(key);
  };
  let total = 0;
  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const nl = raw.includes('\r\n') ? '\r\n' : '\n';
    const { text, pinned } = await pinText(raw.replace(/\r\n/g, '\n'), resolve);
    if (pinned.length) writeFileSync(file, text.replace(/\n/g, nl));
    for (const p of pinned) console.log(`${file}: ${p.action}@${p.ref} -> ${p.sha.slice(0, 12)}`);
    total += pinned.length;
  }
  console.log(total ? `pinned ${total} action reference(s).` : 'nothing to pin.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
