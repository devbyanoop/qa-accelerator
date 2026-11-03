import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';

type Analysis = Awaited<ReturnType<AxeBuilder['analyze']>>;
export type AccessibilityViolation = Analysis['violations'][number];

/**
 * Scans the current page against WCAG 2.0/2.1 A and AA rules and attaches the full result to the test report.
 * Returns the violations so the caller decides what counts as a failure.
 */
export async function scanAccessibility(page: Page, testInfo: TestInfo): Promise<AccessibilityViolation[]> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  await testInfo.attach('accessibility-violations.json', {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  });
  return violations;
}

/** Violations whose rule is not in the known baseline, formatted for a readable failure message. */
export function newViolations(violations: AccessibilityViolation[], baselineRuleIds: string[]): string[] {
  return violations
    .filter((violation) => !baselineRuleIds.includes(violation.id))
    .map(
      (violation) =>
        `${violation.id} [${violation.impact}] on ${violation.nodes.length} element(s): ${violation.help}`,
    );
}
