// One command for a dry or a formal run: checks the rules, runs the whole suite in capture mode, builds the evidence
// pack, compares a formal run with its dry run, and seals the result as a zip with a checksum.
//
//   npm run regulated:run -- --type dry --build 2.4.1
//   npm run regulated:run -- --type formal --build 2.4.1 --against reports/archive/DRY-2.4.1-<time>.zip
//
//   options: --execution <id>   an Xray Test Execution key or similar, recorded in the evidence
//            anything else is passed to Playwright, for example  --grep @smoke
//
// Needs regulated mode to be on (config/regulated.json, or REGULATED_MODE=on for one run). See docs/regulated.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { appendAudit, sealArchive } from './lib/archive.mjs';
import { takeSnapshot } from './lib/change-record.mjs';
import { gitState } from './lib/git.mjs';
import { changeEndFile, changeStartFile, rawDir, regulatedDir, runInfoFile } from './lib/paths.mjs';
import { checkRunRequest, isActive, loadConfig, requireActive } from './lib/regulated-config.mjs';
import { loadPack } from './lib/compare.mjs';
import { verifyPack } from './lib/verify.mjs';

const argv = process.argv.slice(2);
const request = { type: '', build: '', execution: '', against: '' };
const passthrough = [];
for (let i = 0; i < argv.length; i++) {
  const flag = argv[i];
  if (['--type', '--build', '--execution', '--against'].includes(flag))
    request[flag.slice(2)] = argv[++i] ?? '';
  else passthrough.push(flag);
}

const config = loadConfig();
requireActive(config, 'runLabels', 'The dry and formal run feature');

const ci = process.env.GITHUB_ACTIONS === 'true';
const fail = (lines) => {
  console.error('The regulated run was refused:');
  for (const line of lines) console.error(`  - ${line}`);
  process.exit(1);
};

// ---- Before anything runs: every rule that can be checked up front, so a refusal costs seconds, not a whole run.
const problems = checkRunRequest(config, request, { ci, ref: process.env.GITHUB_REF });
const before = gitState();
if (request.type === 'formal' && config.formalRun.requireCleanTree && !before.clean) {
  const shown = before.changedFiles.slice(0, 8).join(', ');
  problems.push(
    `The working tree has uncommitted changes (${shown}${before.changedFiles.length > 8 ? ', ...' : ''}). Commit or discard them first.`,
  );
}
if (request.type === 'formal' && request.against && isActive(config, 'compare')) {
  if (!existsSync(request.against)) {
    problems.push(`The dry run ${request.against} does not exist.`);
  } else {
    const check = await verifyPack(request.against);
    if (!check.ok)
      problems.push(`The dry run archive failed its integrity check: ${check.problems.join('; ')}.`);
    try {
      const dry = await loadPack(request.against);
      if (dry.manifest.run?.type !== 'dry') problems.push(`${request.against} is not a dry run.`);
      else if (config.compare.requireSameBuild && dry.manifest.run.buildId !== request.build) {
        problems.push(`The dry run was for build ${dry.manifest.run.buildId}, not ${request.build}.`);
      }
    } catch (error) {
      problems.push(String(error.message));
    }
  }
}
if (problems.length) fail(problems);
if (request.type === 'dry' && !before.clean) {
  console.warn(
    'Note: the working tree has uncommitted changes. This dry run records them, but it can not be the basis of a formal run until the code is committed and unchanged.',
  );
}

const label = `${request.type.toUpperCase()} RUN  |  build ${request.build}`;
const info = {
  type: request.type,
  buildId: request.build,
  executionId: request.execution || null,
  label,
  startedAt: new Date().toISOString(),
  against: request.against || null,
};

// ---- Start from nothing, so nothing from an earlier run can end up in this one.
rmSync(rawDir, { recursive: true, force: true });
rmSync(regulatedDir, { recursive: true, force: true });
mkdirSync(rawDir, { recursive: true });
writeFileSync(runInfoFile, JSON.stringify(info, null, 2) + '\n');
writeFileSync(
  changeStartFile,
  JSON.stringify(await takeSnapshot({ probes: config.changeRecord.probes }), null, 2) + '\n',
);
appendAudit('run-started', {
  type: info.type,
  build: info.buildId,
  execution: info.executionId,
  commit: before.commit,
  clean: before.clean,
});
console.log(
  `\n${label}: starting. Notes about anything you do outside the tests: npm run regulated:note -- "what and why"\n`,
);

// ---- The tests: everything recorded, every page stamped with the run label.
const env = { ...process.env, RUN_TYPE: info.type, BUILD_ID: info.buildId, EVIDENCE_RUN_LABEL: label };
if (info.executionId) env.EXECUTION_ID = info.executionId;
const tests = spawnSync(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', '--config=playwright.capture.config.ts', ...passthrough],
  { stdio: 'inherit', env },
);
const testsPassed = tests.status === 0;

writeFileSync(
  changeEndFile,
  JSON.stringify(await takeSnapshot({ probes: config.changeRecord.probes }), null, 2) + '\n',
);

// ---- The evidence pack, with the comparison for a formal run.
const bundleArgs = ['tools/evidence-bundle.mjs', '--pdf'];
if (info.type === 'formal' && request.against) bundleArgs.push('--against', request.against);
const bundle = spawnSync(process.execPath, bundleArgs, { stdio: 'inherit', env });
const manifest = existsSync(`${regulatedDir}/manifest.json`)
  ? JSON.parse(readFileSync(`${regulatedDir}/manifest.json`, 'utf8'))
  : null;
const comparisonFailed = Boolean(manifest?.comparison && !manifest.comparison.ok);
if (!manifest || (bundle.status !== 0 && !comparisonFailed)) {
  appendAudit('run-failed', {
    type: info.type,
    build: info.buildId,
    reason: 'the evidence pack could not be built',
  });
  console.error('\nThe evidence pack could not be built.');
  process.exit(1);
}

// ---- Seal it.
let sealed = null;
if (comparisonFailed) {
  console.error(
    `\nThis formal run DIFFERS from the dry run (${manifest.comparison.failed.join(', ')}). It was NOT sealed.`,
  );
  console.error(`The pack is in ${regulatedDir} for investigation; see its comparison/ folder.`);
  appendAudit('run-not-accepted', {
    type: info.type,
    build: info.buildId,
    against: request.against,
    failed: manifest.comparison.failed,
  });
} else if (isActive(config, 'archive')) {
  sealed = await sealArchive({
    packDir: regulatedDir,
    type: info.type,
    build: info.buildId,
    suffix: testsPassed ? '' : '-FAILED',
    directory: config.archive.directory,
  });
  appendAudit('run-sealed', {
    type: info.type,
    build: info.buildId,
    testsPassed,
    zip: sealed.zipPath,
    sha256: sealed.sha256,
  });
}

console.log('\n----------------------------------------------------------------');
console.log(
  comparisonFailed
    ? `${label}: NOT ACCEPTED (${testsPassed ? 'the tests passed, but' : 'tests failed and'} the run differs from the dry run)`
    : `${label}: ${testsPassed ? 'all tests passed' : 'SOME TESTS FAILED'}`,
);
if (sealed) {
  console.log(`Sealed archive: ${sealed.zipPath}`);
  console.log(`SHA-256:        ${sealed.sha256}`);
  console.log(`Checksum file:  ${sealed.shaPath}`);
  console.log(
    'Keep the zip and the checksum together in your records (Xray, SharePoint). Check them later with:',
  );
  console.log(`  npm run regulated:verify -- ${sealed.zipPath}`);
  if (info.type === 'dry' && testsPassed) {
    console.log('When the dry run is accepted, run the formal run against the same build with:');
    console.log(
      `  npm run regulated:run -- --type formal --build ${info.buildId} --against ${sealed.zipPath}`,
    );
  }
} else if (!comparisonFailed) {
  console.log(`Archive is switched off. Zip ${regulatedDir} yourself and keep it with a checksum.`);
}
console.log('----------------------------------------------------------------');
process.exit(testsPassed && !comparisonFailed ? 0 : 1);
