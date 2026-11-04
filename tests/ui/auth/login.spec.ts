import { credentialsFor } from '@config/env';
import { expect, test } from '@fixtures/app.fixture';
import { requirement } from '@utils/requirements';
import { Tags } from '@utils/tags';

test.describe('Login', () => {
  test(
    'a customer can sign in',
    { tag: [Tags.smoke, Tags.ui, ...requirement('REQ-AUTH-001')] },
    async ({ page, loginPage, accountPage }) => {
      const { email, password } = credentialsFor('customer');

      await loginPage.goto();
      await loginPage.login(email, password);

      await expect(page).toHaveURL(/\/account/);
      await expect(accountPage.title).toHaveText('My account');
    },
  );

  test(
    'a wrong password shows an error and stays on the login page',
    { tag: [Tags.regression, Tags.ui, ...requirement('REQ-AUTH-002')] },
    async ({ page, loginPage }) => {
      const { email } = credentialsFor('customer');

      await loginPage.goto();
      await loginPage.login(email, 'not-the-password');

      await expect(loginPage.error).toBeVisible();
      await expect(page).toHaveURL(/\/auth\/login/);
    },
  );

  test(
    'an anonymous visitor is sent to the login page for account pages',
    { tag: [Tags.regression, Tags.ui, ...requirement('REQ-AUTH-003')] },
    async ({ page, accountPage }) => {
      await accountPage.goto();

      await expect(page).toHaveURL(/\/auth\/login/);
    },
  );
});
