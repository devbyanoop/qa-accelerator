import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pinText, unpinned } from './pin-actions.mjs';

const sha = (n) => String(n).repeat(40).slice(0, 40);
const workflow = `jobs:
  build:
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache/restore@v4   # restore the history
        with:
          path: .allure
      - uses: ./local-action
      - uses: docker://alpine:3
      - uses: actions/setup-node@${sha('a')} # v4
`;

test('only unpinned remote actions are reported', () => {
  assert.deepEqual(unpinned(workflow), ['actions/checkout@v4', 'actions/cache/restore@v4']);
});

test('actions are pinned to the commit the resolver returns, keeping the version as a comment', async () => {
  const calls = [];
  const { text, pinned } = await pinText(workflow, async (repo, ref) => {
    calls.push(`${repo}@${ref}`);
    return sha(repo === 'actions/checkout' ? 1 : 2);
  });
  assert.deepEqual(
    calls,
    ['actions/checkout@v4', 'actions/cache@v4'],
    'the repo is the first two parts of the name',
  );
  assert.match(text, new RegExp(`- uses: actions/checkout@${sha(1)} # v4\\n`));
  assert.match(text, new RegExp(`- uses: actions/cache/restore@${sha(2)} # v4\\n`));
  assert.equal(pinned.length, 2);
});

test('local actions, docker images and already pinned actions are left alone', async () => {
  const { text } = await pinText(workflow, async () => sha(3));
  assert.match(text, /- uses: \.\/local-action\n/);
  assert.match(text, /- uses: docker:\/\/alpine:3\n/);
  assert.match(text, new RegExp(`- uses: actions/setup-node@${sha('a')} # v4\\n`));
  assert.deepEqual(unpinned(text), []);
});

test('the rest of the file is untouched', async () => {
  const { text } = await pinText(workflow, async () => sha(3));
  assert.match(text, /with:\n {10}path: \.allure\n/);
  assert.ok(text.startsWith('jobs:\n  build:\n    steps:\n'));
});
