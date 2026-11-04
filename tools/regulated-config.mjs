// Shows the regulated-mode settings, or checks a CI request against them.
//
//   node tools/regulated-config.mjs                 what is active, and why
//   node tools/regulated-config.mjs --require-enabled
//   node tools/regulated-config.mjs --gate --type formal --build 2.4.1 --against <dry run>   (used by the CI workflow)
import {
  checkRunRequest,
  configFile,
  inactiveMessage,
  isActive,
  loadConfig,
} from './lib/regulated-config.mjs';

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : '';
};
const config = loadConfig();

if (args.includes('--require-enabled') || args.includes('--gate')) {
  if (!isActive(config, 'ciControls')) {
    console.error(inactiveMessage(config, 'The regulated CI workflow'));
    process.exit(2);
  }
}

if (args.includes('--gate')) {
  const problems = checkRunRequest(
    config,
    { type: option('type'), build: option('build'), against: option('against') },
    { ci: true, ref: process.env.GITHUB_REF },
  );
  if (problems.length) {
    console.error('The regulated run was refused:');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`regulated gate: ${option('type')} run for build ${option('build')} is allowed.`);
  process.exit(0);
}

if (!args.includes('--require-enabled')) {
  const on = (feature) => (isActive(config, feature) ? 'on' : 'off');
  console.log(
    `Regulated mode: ${config.enabled ? 'ON' : 'OFF'} (decided by ${config.source}; settings in ${configFile})`,
  );
  console.log('');
  console.log(`  1. Run labels (dry or formal):        ${on('runLabels')}`);
  console.log(`  2. Archive zip with a checksum:       ${on('archive')}`);
  console.log(`  3. Dry-versus-formal comparison:      ${on('compare')}`);
  console.log(`  4. CI controls (approval, tag only):  ${on('ciControls')}`);
  if (config.enabled) {
    console.log('');
    console.log(
      '  Formal runs: ' +
        [
          config.formalRun.requireBuildId && 'need a build id',
          config.formalRun.requireCleanTree && 'need a clean working tree',
          config.formalRun.requireDryRun && 'need an accepted dry run (--against)',
          config.formalRun.allowLocal ? 'may run locally' : 'may not run locally',
          `in CI only from ${config.formalRun.allowedRefs.join(', ')}`,
        ]
          .filter(Boolean)
          .join('; '),
    );
  } else {
    console.log('');
    console.log(
      `To switch it on, set "enabled": true in ${configFile}, or set REGULATED_MODE=on for one run.`,
    );
  }
}
