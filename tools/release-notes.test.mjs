import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractSection } from './release-notes.mjs';

const changelog = `# Changelog

## [Unreleased]

## [1.1.0] - 2026-12-01

### Added
- a thing

## [1.0.0] - 2026-11-04

### Added
- the first release
- another line
`;

test('the section of one version is returned without its heading', () => {
  assert.equal(extractSection(changelog, '1.1.0'), '### Added\n- a thing');
});

test('the last section runs to the end of the file', () => {
  assert.equal(extractSection(changelog, '1.0.0'), '### Added\n- the first release\n- another line');
});

test('a version that is not in the changelog gives null, and dots are not wildcards', () => {
  assert.equal(extractSection(changelog, '2.0.0'), null);
  assert.equal(extractSection(changelog, '1x0x0'), null);
});
