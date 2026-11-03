import { expect, test } from '@fixtures/app.fixture';
import { newViolations, scanAccessibility } from '@utils/accessibility';
import { Tags } from '@utils/tags';

/**
 * Accessibility violations the application already has. The tests below fail only when a page shows a rule
 * that is not listed here, so new problems are caught while known ones do not block the build. Remove an entry
 * once the application fixes it.
 */
const knownViolations = {
  home: ['label-content-name-mismatch', 'list'],
  login: ['button-name', 'label-content-name-mismatch'],
  product: ['label-content-name-mismatch'],
  adminDashboard: ['label-content-name-mismatch'],
};

test.describe('Accessibility (WCAG 2.1 A/AA)', () => {
  // Analysing a whole page with axe is slow, especially in Firefox.
  test.describe.configure({ timeout: 60_000 });

  test(
    'the catalog page has no new violations',
    { tag: [Tags.regression, Tags.ui, Tags.a11y] },
    async ({ homePage, page }, testInfo) => {
      await homePage.goto();
      await expect(homePage.productCards.first()).toBeVisible();

      const violations = await scanAccessibility(page, testInfo);

      expect(newViolations(violations, knownViolations.home)).toEqual([]);
    },
  );

  test(
    'the login page has no new violations',
    { tag: [Tags.regression, Tags.ui, Tags.a11y] },
    async ({ loginPage, page }, testInfo) => {
      await loginPage.goto();
      await expect(page.getByTestId('login-form')).toBeVisible();

      const violations = await scanAccessibility(page, testInfo);

      expect(newViolations(violations, knownViolations.login)).toEqual([]);
    },
  );

  test(
    'a product page has no new violations',
    { tag: [Tags.regression, Tags.ui, Tags.a11y] },
    async ({ productPage, orderableProduct: product, page }, testInfo) => {
      await productPage.goto(product.id);
      await expect(productPage.name).toHaveText(product.name);

      const violations = await scanAccessibility(page, testInfo);

      expect(newViolations(violations, knownViolations.product)).toEqual([]);
    },
  );

  test(
    'the admin dashboard has no new violations',
    { tag: [Tags.regression, Tags.ui, Tags.a11y] },
    async ({ adminDashboardPage, page }, testInfo) => {
      await adminDashboardPage.goto();
      await expect(adminDashboardPage.invoiceRows.first()).toBeVisible();

      const violations = await scanAccessibility(page, testInfo);

      expect(newViolations(violations, knownViolations.adminDashboard)).toEqual([]);
    },
  );

  test(
    'the login page has no critical violations',
    { tag: [Tags.regression, Tags.ui, Tags.a11y, Tags.knownIssue] },
    async ({ loginPage, page }, testInfo) => {
      test.fail(
        true,
        'Known application issue: a button on the login page has no accessible name (axe: button-name).',
      );
      await loginPage.goto();
      await expect(page.getByTestId('login-form')).toBeVisible();

      const violations = await scanAccessibility(page, testInfo);

      expect(violations.filter((violation) => violation.impact === 'critical')).toEqual([]);
    },
  );
});
