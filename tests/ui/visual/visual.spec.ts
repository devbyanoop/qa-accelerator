import { expect, test } from '@fixtures/app.fixture';
import { Tags } from '@utils/tags';

/**
 * Screenshot comparisons. Baselines live in ./__screenshots__ and are produced in the Linux runner image so
 * they match CI. To refresh them after an intended UI change, see "Visual regression" in the README.
 */
test.describe('Visual regression', () => {
  test(
    'the login form looks as expected',
    { tag: [Tags.regression, Tags.ui, Tags.visual] },
    async ({ loginPage, page }) => {
      await loginPage.goto();
      const form = page.getByTestId('login-form');
      await expect(form).toBeVisible();

      await expect(form).toHaveScreenshot('login-form.png');
    },
  );

  // Static pages only: anything that shows stock, prices or lists would change as other tests run.
  test(
    'the registration form looks as expected',
    { tag: [Tags.regression, Tags.ui, Tags.visual] },
    async ({ page }) => {
      await page.goto('/auth/register');
      const form = page.locator('form');
      await expect(form).toBeVisible();

      await expect(form).toHaveScreenshot('registration-form.png');
    },
  );

  test(
    'the navigation bar looks as expected',
    { tag: [Tags.regression, Tags.ui, Tags.visual] },
    async ({ homePage, page }) => {
      await homePage.goto();
      const navigation = page.getByRole('navigation').first();
      await expect(navigation).toBeVisible();

      await expect(navigation).toHaveScreenshot('navigation-bar.png');
    },
  );
});
