// Shared by the traceability and validation-report scripts: reads the Allure results of a run and joins them with
// the requirement list. Node built-ins only.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

// Terminal colour codes that Playwright puts in error messages.
// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*m/g;

const labelValues = (result, name) =>
  (result.labels ?? []).filter((l) => l.name === name).map((l) => l.value);

/** Every attachment of a result (screenshots, videos, traces), including those recorded inside steps. */
function collectAttachments(node, found = []) {
  for (const attachment of node.attachments ?? [])
    found.push({ name: attachment.name, source: attachment.source, type: attachment.type });
  for (const step of node.steps ?? []) collectAttachments(step, found);
  return found;
}

/** One result per test and browser. The results folder can hold older runs and retries, so keep the latest. */
export function loadTests(resultsDir) {
  const latest = new Map();
  for (const file of readdirSync(resultsDir).filter((f) => f.endsWith('-result.json'))) {
    const result = JSON.parse(readFileSync(path.join(resultsDir, file), 'utf8'));
    const project = result.parameters?.find((p) => p.name === 'Project')?.value ?? 'default';
    const key = `${result.historyId}|${project}`;
    const seen = latest.get(key);
    if (!seen || (result.stop ?? 0) > (seen.stop ?? 0)) {
      latest.set(key, { ...result, project });
    }
  }
  return [...latest.values()].map((result) => {
    const tags = labelValues(result, 'tag');
    return {
      name: result.fullName ?? result.name,
      project: result.project,
      status: result.status,
      startedAt: result.start ? new Date(result.start).toISOString() : '',
      durationMs: Math.max(0, (result.stop ?? 0) - (result.start ?? 0)),
      knownIssue: tags.includes('known-issue'),
      tags: tags.filter((tag) => !tag.startsWith('REQ-')),
      requirements: tags.filter((tag) => tag.startsWith('REQ-')),
      attachments: collectAttachments(result),
      message: (result.statusDetails?.message ?? '').replace(ANSI, '').trim(),
    };
  });
}

export function verdict(list) {
  if (list.length === 0) return 'Not tested';
  if (list.some((t) => t.status === 'failed' || t.status === 'broken')) return 'Failed';
  if (list.every((t) => t.status === 'skipped')) return 'Skipped';
  return list.some((t) => t.knownIssue) ? 'Verified (known defect)' : 'Verified';
}

/** Joins the requirement list with the tests: a verdict per requirement, plus what could not be linked. */
export function analyse(resultsDir, requirementsFile) {
  const requirements = JSON.parse(readFileSync(requirementsFile, 'utf8'));
  const tests = loadTests(resultsDir);

  const byRequirement = new Map(requirements.map((r) => [r.id, []]));
  const unlinked = [];
  const unknownIds = new Set();
  for (const test of tests) {
    if (test.requirements.length === 0) unlinked.push(test);
    for (const id of test.requirements) {
      if (byRequirement.has(id)) byRequirement.get(id).push(test);
      else unknownIds.add(id);
    }
  }

  const rows = requirements.map((r) => {
    const list = byRequirement.get(r.id);
    return { ...r, tests: list, verdict: verdict(list) };
  });
  return { requirements, tests, rows, unlinked, unknownIds };
}
