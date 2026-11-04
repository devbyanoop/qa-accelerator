// Checks a sealed zip, an evidence-pack folder or the audit log. Needs no regulated mode: anyone holding the
// evidence, an auditor for example, can run it.
//
//   node tools/regulated-verify.mjs reports/archive/FORMAL-2.4.1-20261104T101530Z.zip
//   node tools/regulated-verify.mjs reports/regulated
//   node tools/regulated-verify.mjs reports/archive/audit-log.jsonl
import { statSync } from 'node:fs';
import { verifyAuditLog } from './lib/archive.mjs';
import { verifyPack } from './lib/verify.mjs';

const target = process.argv[2];
if (!target) {
  console.error('Usage: node tools/regulated-verify.mjs <sealed zip | pack folder | audit-log.jsonl>');
  process.exit(2);
}

try {
  statSync(target);
} catch {
  console.error(`${target} does not exist.`);
  process.exit(2);
}

if (target.endsWith('.jsonl')) {
  const result = verifyAuditLog(target);
  console.log(
    result.ok
      ? `audit log OK: ${result.lines} entries, chain intact.`
      : `audit log FAILED: ${result.problem}.`,
  );
  process.exit(result.ok ? 0 : 1);
}

const result = await verifyPack(target);
if (result.ok) {
  console.log(
    `OK: ${result.checked} files match their checksums${target.endsWith('.zip') ? ', and the zip matches its .sha256 file' : ''}.`,
  );
} else {
  console.error('FAILED:');
  for (const problem of result.problems) console.error(`  - ${problem}`);
}
process.exit(result.ok ? 0 : 1);
