import { expect, test } from '@fixtures/app.fixture';
import { requirement } from '@utils/requirements';
import { Tags } from '@utils/tags';

test.describe('Admin users', { tag: [...requirement('REQ-ADM-001')] }, () => {
  test(
    'an admin can create a user',
    { tag: [Tags.smoke, Tags.ui] },
    async ({ adminUsersPage, userForm, newUser, usersApi, adminToken }) => {
      await adminUsersPage.goto();
      await adminUsersPage.openAddForm();
      await userForm.fill(newUser);
      await userForm.submit();

      await expect(userForm.saved).toBeVisible();
      await expect.poll(() => usersApi.findByEmail(adminToken, newUser.email)).toBeDefined();
    },
  );

  test(
    'an admin can change a user name',
    { tag: [Tags.regression, Tags.ui] },
    async ({ adminUsersPage, userForm, seededUser, usersApi, adminToken }) => {
      const changedName = 'Changed';

      await adminUsersPage.goto();
      await adminUsersPage.search(seededUser.email);
      await adminUsersPage.openEditForm(seededUser.email);
      await userForm.waitForExistingFirstName(seededUser.firstName);
      await userForm.setFirstName(changedName);
      await userForm.submit();

      await expect(userForm.saved).toBeVisible();
      await expect
        .poll(async () => (await usersApi.findByEmail(adminToken, seededUser.email))?.first_name)
        .toBe(changedName);
    },
  );

  test(
    'an admin can delete a user',
    { tag: [Tags.regression, Tags.ui] },
    async ({ adminUsersPage, seededUser, usersApi, adminToken }) => {
      await adminUsersPage.goto();
      await adminUsersPage.search(seededUser.email);
      await adminUsersPage.deleteUser(seededUser.email);

      await expect.poll(() => usersApi.findByEmail(adminToken, seededUser.email)).toBeUndefined();
    },
  );

  test(
    'a user can be saved without filling the optional fields',
    { tag: [Tags.regression, Tags.ui, Tags.knownIssue] },
    async ({ adminUsersPage, userForm, newUser }) => {
      test.fail(
        true,
        'Known application issue: leaving "failed login attempts" and "enabled" blank makes the server answer ' +
          '500 ("Something went wrong"), so a user cannot be created with the form defaults.',
      );

      await adminUsersPage.goto();
      await adminUsersPage.openAddForm();
      await userForm.fill(newUser, { includeOptionalFields: false });
      await userForm.submit();

      await expect(userForm.saved).toBeVisible();
    },
  );

  test(
    'a user cannot be saved with an invalid email address',
    { tag: [Tags.regression, Tags.ui] },
    async ({ adminUsersPage, userForm, newUser, usersApi, adminToken }) => {
      await adminUsersPage.goto();
      await adminUsersPage.openAddForm();
      await userForm.fill({ ...newUser, email: 'not-an-email' });
      await userForm.submit();

      await expect(userForm.errors.first()).toBeVisible();
      await expect(userForm.saved).toHaveCount(0);
      expect(await usersApi.findByEmail(adminToken, newUser.email)).toBeUndefined();
    },
  );
});
