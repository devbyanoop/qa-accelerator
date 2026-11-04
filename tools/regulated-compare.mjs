// Compares a dry run with a formal run. Each can be a sealed zip or a pack folder.
//
//   node tools/regulated-compare.mjs <dry run> <formal run> [--out <folder>]
//
// A formal run started with `npm run regulated:run -- --type formal --against <dry zip>` does this itself.
import path from 'node:path';
import { timestamp } from './lib/archive.mjs';
import { compareRuns, loadPack, writeComparison } from './lib/compare.mjs';
import { archiveDir } from './lib/paths.mjs';
import { loadConfig, requireActive } from './lib/regulated-config.mjs';

const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : '';
const [dryPath, formalPath] = args.filter((a, i) => !a.startsWith('--') && i !== outAt + 1);
if (!dryPath || !formalPath) {
  console.error('Usage: node tools/regulated-compare.mjs <dry run> <formal run> [--out <folder>]');
  process.exit(2);
}

const config = loadConfig();
requireActive(config, 'compare', 'The dry-versus-formal comparison');

const result = compareRuns(await loadPack(dryPath), await loadPack(formalPath), config.compare);
const folder = out || path.join(archiveDir, 'comparisons', `comparison-${timestamp()}`);
writeComparison(folder, result, { against: path.basename(dryPath), formal: path.basename(formalPath) });

for (const check of result.checks) {
  const mark = check.ok ? 'ok     ' : check.severity === 'warn' ? 'warning' : 'DIFFERS';
  console.log(`${mark}  ${check.label}${check.ok ? '' : `: ${check.detail}`}`);
}
console.log(`\n${result.ok ? 'The runs match.' : 'The runs DIFFER.'} Details: ${folder}`);
process.exit(result.ok ? 0 : 1);
