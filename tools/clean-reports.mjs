// Removes generated reports, so a run starts from nothing and nothing from an earlier run can end up in a report.
//   node tools/clean-reports.mjs            _raw, standard and regulated (NOT archive: sealed archives are records)
//   node tools/clean-reports.mjs raw        only reports/_raw (done before a validation run)
//   node tools/clean-reports.mjs standard | regulated
//   node tools/clean-reports.mjs archive    only on purpose: removes the sealed archives and the audit log
import { rmSync } from 'node:fs';

const folders = {
  raw: 'reports/_raw',
  standard: 'reports/standard',
  regulated: 'reports/regulated',
  archive: 'reports/archive',
};
const which = process.argv[2] ?? 'all';
// "all" leaves the archive alone: a sealed archive is an audit record, so it is only removed when named.
const targets = which === 'all' ? [folders.raw, folders.standard, folders.regulated] : [folders[which]];
if (targets.some((t) => t === undefined)) {
  console.error(`Unknown target "${which}". Use: all, raw, standard, regulated, archive.`);
  process.exit(1);
}
for (const target of targets) rmSync(target, { recursive: true, force: true });
console.log(`cleaned: ${targets.join(', ')}`);
