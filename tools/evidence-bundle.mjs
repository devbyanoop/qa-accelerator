// Builds the regulated evidence pack of a run in reports/regulated/ (or the folder in EVIDENCE_DIR):
//
//   READ-ME-FIRST.txt        what is in the pack and where to start
//   validation-report.html   ONE self-contained report with everything a reviewer needs (and a PDF with --pdf)
//   traceability/            requirement-to-test matrix (HTML, CSV, Markdown)
//   allure/                  the browsable Allure report of the same run (npm run report:validation:open)
//   allure-results/          raw results with every screenshot, video and trace
//   junit.xml, manifest.json run data, versions and image digests
//   SHA256SUMS               a checksum for every file above, so the pack can be shown not to have changed
//
//   node tools/evidence-bundle.mjs [--pdf]
//
// Verify later with:  cd reports/regulated && sha256sum -c SHA256SUMS
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rawAllureResults, rawJunit, regulatedDir } from './lib/paths.mjs';

const outDir = process.env.EVIDENCE_DIR ?? regulatedDir;
const pdfFlag = process.argv.includes('--pdf') ? ' --pdf' : '';

if (!existsSync(rawAllureResults)) {
  console.error(`No results found in ${rawAllureResults}. Run the tests first (npm run test:capture).`);
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const run = (command) => {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'unknown';
  }
};

function copyTree(source, destination) {
  if (statSync(source).isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const name of readdirSync(source)) copyTree(path.join(source, name), path.join(destination, name));
  } else {
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }
}

// 1. The browsable Allure report, built first and straight from the raw results. On Windows it fails if it starts
// right after many large files were written, so it goes before the copy below, and it is retried with a pause.
const pause = (seconds) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, seconds * 1000);
let allureBuilt = false;
for (let attempt = 1; attempt <= 4 && !allureBuilt; attempt++) {
  try {
    rmSync(path.join(outDir, 'allure'), { recursive: true, force: true });
    execSync(
      `npx allure generate ${rawAllureResults} --config config/allurerc.regulated.mjs --output ${outDir}/allure`,
      {
        stdio: 'ignore',
      },
    );
    allureBuilt = existsSync(path.join(outDir, 'allure', 'index.html'));
  } catch {
    allureBuilt = false;
  }
  if (!allureBuilt) pause(attempt * 3);
}
if (!allureBuilt)
  console.warn('evidence: the Allure report could not be built; the rest of the pack is complete.');

// 2. Traceability matrix, built from the raw results.
execSync(`node tools/traceability.mjs --out ${outDir}/traceability`, { stdio: 'inherit' });

// 3. Raw results (with all recordings) and the JUnit file.
copyTree(rawAllureResults, path.join(outDir, 'allure-results'));
if (existsSync(rawJunit)) copyTree(rawJunit, path.join(outDir, 'junit.xml'));

// 4. Manifest: what produced this run.
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lockfile = existsSync('package-lock.json') ? sha256('package-lock.json') : null;
const playwrightPackage = 'node_modules/@playwright/test/package.json';
const playwrightVersion = existsSync(playwrightPackage)
  ? JSON.parse(readFileSync(playwrightPackage, 'utf8')).version
  : 'unknown';
const composeFile = 'infra/toolshop/docker-compose.yml';
const images = existsSync(composeFile)
  ? [...readFileSync(composeFile, 'utf8').matchAll(/^\s*image:\s*(\S+)/gm)].map((m) => m[1])
  : [];

const manifest = {
  generatedAt: new Date().toISOString(),
  project: pkg.name,
  commit: process.env.GITHUB_SHA ?? run('git rev-parse HEAD'),
  branch: process.env.GITHUB_REF_NAME ?? run('git rev-parse --abbrev-ref HEAD'),
  trigger: process.env.GITHUB_EVENT_NAME ?? 'local',
  executedBy: process.env.GITHUB_ACTOR ?? os.userInfo().username,
  ciRun: process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null,
  environment: {
    testEnv: process.env.TEST_ENV ?? 'local',
    browsers: process.env.BROWSERS ?? 'chromium',
    node: process.version,
    playwright: playwrightVersion,
    os: `${os.platform()} ${os.release()}`,
    packageLockSha256: lockfile,
  },
  applicationImages: images,
};
writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

// 5. The single-file report, before the checksums are made so it is covered by them.
execSync(
  `node tools/validation-report.mjs --manifest ${outDir}/manifest.json --out ${outDir}/validation-report.html${pdfFlag}`,
  { stdio: 'inherit' },
);

// 6. A short note for whoever opens the folder.
writeFileSync(
  path.join(outDir, 'READ-ME-FIRST.txt'),
  [
    'REGULATED EVIDENCE PACK',
    '',
    'This folder is the validation evidence of one test run. It is different from the everyday reports in',
    'reports/standard, which are for developers and carry no checksums or traceability.',
    '',
    'Start here:',
    '  validation-report.html   one page with the overall result, run details, requirement traceability,',
    '                           known defects, gaps, every test result (with links to its screenshot, video',
    '                           and trace) and any failures. Open it by double-clicking. validation-report.pdf is',
    '                           the same page, when it was requested.',
    '',
    'Also in this folder:',
    '  traceability/            the requirement-to-test matrix as HTML, CSV and Markdown',
    '  allure/                  the Allure report of the same run (steps, attachments, trace viewer).',
    '                           It needs a small local server: run  npm run report:validation:open',
    '  allure-results/          the raw results, including every screenshot, video and trace',
    '  junit.xml                machine-readable results',
    '  manifest.json            commit, who ran it, tool versions, lock-file hash, application image digests',
    '  SHA256SUMS               a checksum for every file in this folder',
    '',
    'To check that nothing has been changed, run this in this folder (every line must say OK):',
    '  sha256sum -c SHA256SUMS',
    '',
    `Generated ${manifest.generatedAt} from commit ${manifest.commit}.`,
    '',
  ].join('\n'),
);

// 7. Checksums of every file in the pack (except the checksum file itself), in `sha256sum -c` format.
const files = [];
const walk = (directory) => {
  for (const name of readdirSync(directory)) {
    const full = path.join(directory, name);
    if (statSync(full).isDirectory()) walk(full);
    else files.push(full);
  }
};
walk(outDir);
const lines = files
  .map((f) => path.relative(outDir, f).split(path.sep).join('/'))
  .filter((rel) => rel !== 'SHA256SUMS')
  .sort()
  .map((rel) => `${sha256(path.join(outDir, rel))}  ${rel}`);
writeFileSync(path.join(outDir, 'SHA256SUMS'), lines.join('\n') + '\n');

console.log(`evidence: ${lines.length} files written to ${outDir}/ (commit ${manifest.commit.slice(0, 8)})`);
