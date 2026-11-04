import { credentialsFor } from '@config/env';
import { expect, test } from '@fixtures/app.fixture';
import { Tags } from '@utils/tags';

// Runs only in the "mobile-chrome" project (BROWSERS=mobile-chrome), a phone-sized Chrome. See playwright.config.ts.
test.describe('Mobile viewport', () => {
  test(
    'products are shown on a phone',
    { tag: [Tags.regression, Tags.ui, Tags.mobile] },
    async ({ homePage }) => {
      await homePage.goto();

      await expect(homePage.productCards.first()).toBeVisible();
    },
  );

  test(
    'search works on a phone',
    { tag: [Tags.regression, Tags.ui, Tags.mobile] },
    async ({ page, homePage, productsApi }) => {
      const [first] = (await productsApi.list()).data;
      const term = first!.name.split(' ')[0]!.toLowerCase();

      await homePage.goto();
      // On a phone the search box is inside a collapsed "Filters" panel.
      await page.getByRole('button', { name: 'Filters' }).click();
      await homePage.search(term);

      await expect
        .poll(async () => (await homePage.productNames()).every((name) => name.toLowerCase().includes(term)))
        .toBe(true);
    },
  );

  test(
    'a customer can sign in on a phone',
    { tag: [Tags.regression, Tags.ui, Tags.mobile] },
    async ({ page, loginPage, accountPage }) => {
      const { email, password } = credentialsFor('customer');

      await loginPage.goto();
      await loginPage.login(email, password);

      await expect(page).toHaveURL(/\/account/);
      await expect(accountPage.title).toHaveText('My account');
    },
  );
});
