import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkRunRequest, isActive, loadConfig, refMatches } from './regulated-config.mjs';

const configIn = (content) => {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'reg-config-')), 'regulated.json');
  writeFileSync(file, JSON.stringify(content));
  return file;
};

test('regulated mode is off when there is no config and no override', () => {
  const config = loadConfig({ file: 'does-not-exist.json', env: {} });
  assert.equal(config.enabled, false);
  assert.equal(isActive(config, 'archive'), false);
});

test('the config file switches it on, and REGULATED_MODE overrides the file in both directions', () => {
  const file = configIn({ enabled: true });
  assert.equal(loadConfig({ file, env: {} }).enabled, true);
  assert.equal(loadConfig({ file, env: { REGULATED_MODE: 'off' } }).enabled, false);
  const off = configIn({ enabled: false });
  const forced = loadConfig({ file: off, env: { REGULATED_MODE: 'on' } });
  assert.equal(forced.enabled, true);
  assert.equal(forced.source, 'REGULATED_MODE=on');
});

test('one feature can be switched off while the others stay on', () => {
  const config = loadConfig({ file: configIn({ enabled: true, features: { archive: false } }), env: {} });
  assert.equal(isActive(config, 'archive'), false);
  assert.equal(isActive(config, 'compare'), true);
  assert.equal(config.formalRun.requireCleanTree, true, 'settings that were not given keep their defaults');
});

test('ref patterns match tags but not branches', () => {
  assert.equal(refMatches('refs/tags/v1.2.0', ['refs/tags/*']), true);
  assert.equal(refMatches('refs/heads/main', ['refs/tags/*']), false);
});

test('a run request is checked against the rules', () => {
  const config = loadConfig({ file: configIn({ enabled: true }), env: {} });
  assert.match(checkRunRequest(config, { type: 'weekly', build: '1' }).join(' '), /--type/);
  assert.match(checkRunRequest(config, { type: 'dry', build: '' }).join(' '), /--build/);
  assert.deepEqual(checkRunRequest(config, { type: 'dry', build: '2.4.1' }), []);

  const noDry = checkRunRequest(config, { type: 'formal', build: '2.4.1' }, { ci: false });
  assert.match(noDry.join(' '), /--against/);
  assert.deepEqual(
    checkRunRequest(config, { type: 'formal', build: '2.4.1', against: 'dry.zip' }, { ci: false }),
    [],
  );

  const branch = checkRunRequest(
    config,
    { type: 'formal', build: '2.4.1', against: 'dry.zip' },
    { ci: true, ref: 'refs/heads/main' },
  );
  assert.match(branch.join(' '), /must start from/);
  const tag = checkRunRequest(
    config,
    { type: 'formal', build: '2.4.1', against: 'dry.zip' },
    { ci: true, ref: 'refs/tags/v2.4.1' },
  );
  assert.deepEqual(tag, []);
});

test('local formal runs can be switched off', () => {
  const config = loadConfig({ file: configIn({ enabled: true, formalRun: { allowLocal: false } }), env: {} });
  const problems = checkRunRequest(config, { type: 'formal', build: '1', against: 'd.zip' }, { ci: false });
  assert.match(problems.join(' '), /local machine/);
});

test('a build id with odd characters is refused', () => {
  const config = loadConfig({ file: configIn({ enabled: true }), env: {} });
  assert.match(checkRunRequest(config, { type: 'dry', build: 'bad build/1' }).join(' '), /letters, digits/);
  assert.deepEqual(checkRunRequest(config, { type: 'dry', build: 'v2.4.1-rc_1' }), []);
});
