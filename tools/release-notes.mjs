// Prints the changelog section of one version, for the text of a GitHub Release.
//
//   node tools/release-notes.mjs 1.0.0          reads CHANGELOG.md
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The text under "## [version]" up to the next version heading, or null when the version is not there. */
export function extractSection(changelog, version) {
  const lines = changelog.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((line) =>
    new RegExp(`^## \\[${version.replace(/[.+*?^${}()|[\]\\]/g, '\\$&')}\\]`).test(line),
  );
  if (start < 0) return null;
  const end = lines.findIndex((line, i) => i > start && /^## \[/.test(line));
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .join('\n')
    .trim();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const version = process.argv[2];
  if (!version) {
    console.error('Usage: node tools/release-notes.mjs <version>, for example 1.0.0');
    process.exit(2);
  }
  const section = extractSection(readFileSync('CHANGELOG.md', 'utf8'), version);
  if (!section) {
    console.error(`CHANGELOG.md has no section "## [${version}]". Add one before tagging a release.`);
    process.exit(1);
  }
  console.log(section);
}
