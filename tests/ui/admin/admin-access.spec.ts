import { expect, test } from '@fixtures/app.fixture';
import { requirement } from '@utils/requirements';
import { Tags } from '@utils/tags';

test.describe('Admin area access', { tag: [...requirement('REQ-SEC-001')] }, () => {
  test(
    'an admin sees the dashboard with recent invoices',
    { tag: [Tags.smoke, Tags.ui] },
    async ({ adminDashboardPage }) => {
      await adminDashboardPage.goto();

      await expect(adminDashboardPage.title).toBeVisible();
      await expect(adminDashboardPage.invoiceRows.first()).toBeVisible();
    },
  );

  test(
    'a customer is sent to the login page when opening the admin area',
    { tag: [Tags.smoke, Tags.ui] },
    async ({ customerPage }) => {
      await customerPage.goto('/admin/dashboard');

      await expect(customerPage).toHaveURL(/\/auth\/login/);
    },
  );

  test(
    'an anonymous visitor is sent to the login page when opening the admin area',
    { tag: [Tags.regression, Tags.ui] },
    async ({ page }) => {
      await page.goto('/admin/dashboard');

      await expect(page).toHaveURL(/\/auth\/login/);
    },
  );
});
