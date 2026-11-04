// Removes generated reports, so a run starts from nothing and nothing from an earlier run can end up in a report.
//   node tools/clean-reports.mjs            everything under reports/
//   node tools/clean-reports.mjs raw        only reports/_raw (done before a validation run)
//   node tools/clean-reports.mjs standard | regulated
import { rmSync } from 'node:fs';

const folders = { raw: 'reports/_raw', standard: 'reports/standard', regulated: 'reports/regulated' };
const which = process.argv[2] ?? 'all';
const targets = which === 'all' ? Object.values(folders) : [folders[which]];
if (targets.some((t) => t === undefined)) {
  console.error(`Unknown target "${which}". Use: all, raw, standard, regulated.`);
  process.exit(1);
}
for (const target of targets) rmSync(target, { recursive: true, force: true });
console.log(`cleaned: ${targets.join(', ')}`);
