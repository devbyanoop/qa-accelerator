import { expect, test } from '@fixtures/app.fixture';
import { Tags } from '@utils/tags';

test.describe('Customer session', () => {
  test(
    'a customer signed in through the API lands directly on the account page',
    { tag: [Tags.smoke, Tags.ui] },
    async ({ customerPage, accountPage }) => {
      await accountPage.goto();

      await expect(customerPage).toHaveURL(/\/account/);
      await expect(accountPage.title).toHaveText('My account');
    },
  );
});
