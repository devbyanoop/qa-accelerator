// The organisation's settings for the optional regulated-run features: run labels (dry or formal), the archive zip,
// the dry-versus-formal comparison and the CI controls. Everything here is OFF until `enabled` is true.
//
// Order of precedence: the REGULATED_MODE environment variable (on or off), then config/regulated.json, then the
// defaults below. Node built-ins only.
import { existsSync, readFileSync } from 'node:fs';

export const configFile = 'config/regulated.json';

export const defaults = {
  enabled: false,
  features: { runLabels: true, archive: true, compare: true, ciControls: true },
  formalRun: {
    requireBuildId: true,
    requireCleanTree: true,
    requireDryRun: true,
    allowLocal: true,
    allowedRefs: ['refs/tags/*'],
  },
  compare: {
    dryMustPass: true,
    requireSameBuild: true,
    requireSameScripts: true,
    requireSameTests: true,
    requireSameVerdicts: true,
  },
  archive: { directory: 'reports/archive' },
  changeRecord: { probes: [] },
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function merge(base, extra) {
  const result = { ...base };
  for (const [key, value] of Object.entries(extra ?? {})) {
    result[key] = isPlainObject(value) && isPlainObject(base[key]) ? merge(base[key], value) : value;
  }
  return result;
}

/** The effective settings, plus where the on/off decision came from. */
export function loadConfig({ file = configFile, env = process.env } = {}) {
  const fromFile = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const config = merge(defaults, fromFile);
  let source = existsSync(file) ? file : 'built-in defaults';
  const override = String(env.REGULATED_MODE ?? '').toLowerCase();
  if (override === 'on') {
    config.enabled = true;
    source = 'REGULATED_MODE=on';
  } else if (override === 'off') {
    config.enabled = false;
    source = 'REGULATED_MODE=off';
  }
  return { ...config, source };
}

/** True when regulated mode is on and, if a feature is named, that feature is not switched off. */
export function isActive(config, feature) {
  if (!config.enabled) return false;
  return feature ? config.features[feature] !== false : true;
}

export function inactiveMessage(config, what) {
  const why = config.enabled
    ? `this part is switched off under "features" in ${configFile}`
    : `regulated mode is off (decided by ${config.source})`;
  return (
    `${what} is not active: ${why}.\n` +
    `To use it, set "enabled": true in ${configFile} (a change your code owners review), ` +
    'or set REGULATED_MODE=on for a single run.'
  );
}

/** Stops the process with a clear message when a feature is not active. */
export function requireActive(config, feature, what) {
  if (isActive(config, feature)) return;
  console.error(inactiveMessage(config, what));
  process.exit(2);
}

/** Does a git ref such as refs/tags/v1.2.0 match a pattern such as refs/tags/* ? */
export function refMatches(ref, patterns) {
  return patterns.some((pattern) => {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`).test(ref);
  });
}

export const runTypes = ['dry', 'formal'];

/**
 * Checks the inputs of a regulated run before anything starts. Returns a list of problems (empty when fine).
 * `context.ci` and `context.ref` describe where the run happens; the git state is checked by the caller.
 */
export function checkRunRequest(config, request, context = {}) {
  const problems = [];
  if (!runTypes.includes(request.type)) problems.push(`--type must be one of: ${runTypes.join(', ')}.`);
  if ((config.formalRun.requireBuildId || request.type === 'formal') && !String(request.build ?? '').trim()) {
    problems.push('--build (the application build or version under test) is required.');
  } else if (request.build && !/^[A-Za-z0-9._-]+$/.test(String(request.build))) {
    problems.push('--build may contain only letters, digits, dots, dashes and underscores.');
  }
  if (request.type === 'formal') {
    if (context.ci) {
      if (!context.ref || !refMatches(context.ref, config.formalRun.allowedRefs)) {
        problems.push(
          `A formal run in CI must start from one of: ${config.formalRun.allowedRefs.join(', ')} (this run: ${context.ref || 'unknown'}).`,
        );
      }
    } else if (!config.formalRun.allowLocal) {
      problems.push('Formal runs on a local machine are not allowed (formalRun.allowLocal is false).');
    }
    if (config.formalRun.requireDryRun && isActive(config, 'compare') && !request.against) {
      problems.push(
        'A formal run must name the accepted dry run it is compared with (--against <dry run zip>).',
      );
    }
  }
  return problems;
}
