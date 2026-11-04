/**
 * Links a test to the requirement(s) it verifies, for traceability. The IDs become tags, so they also work as
 * filters: `npx playwright test --grep @REQ-ORD-001` runs the tests for one requirement, and the report's Tags
 * filter lists them.
 *
 *   test('a customer can sign in', { tag: [Tags.smoke, ...requirement('REQ-AUTH-001')] }, ...)
 *   test.describe('Checkout', { tag: [...requirement('REQ-ORD-001', 'REQ-ORD-003')] }, () => { ... })
 *
 * `npm run traceability` turns the tags into a requirement-to-test matrix. The list of valid IDs lives in
 * docs/regulated/requirements.json.
 */
export function requirement(...ids: string[]): string[] {
  return ids.map((id) => `@${id}`);
}
