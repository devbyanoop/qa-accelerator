import { expect, test } from '@fixtures/app.fixture';
import { requirement } from '@utils/requirements';
import { Tags } from '@utils/tags';

test.describe('Customer session', { tag: [...requirement('REQ-AUTH-001')] }, () => {
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
