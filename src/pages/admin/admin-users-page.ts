import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { UserDraft } from '@data/builders';
import { AdminListPage } from './admin-list-page';

export class AdminUsersPage extends AdminListPage {
  private readonly addButton: Locator;

  constructor(page: Page) {
    super(page, '/admin/users', 'user');
    this.addButton = page.getByTestId('user-add');
  }

  async openAddForm(): Promise<void> {
    await test.step('Open the add-user form', async () => {
      await this.addButton.click();
    });
  }

  async openEditForm(email: string): Promise<void> {
    await test.step(`Open the edit form for ${email}`, async () => {
      await this.row(email).locator('[data-test^="user-edit-"]').click();
    });
  }

  async deleteUser(email: string): Promise<void> {
    await test.step(`Delete user ${email}`, async () => {
      await this.row(email).locator('[data-test^="user-delete-"]').click();
    });
  }
}

export class UserFormPage {
  readonly saved: Locator;
  readonly errors: Locator;
  readonly firstName: Locator;
  private readonly lastName: Locator;
  private readonly dob: Locator;
  private readonly street: Locator;
  private readonly postalCode: Locator;
  private readonly city: Locator;
  private readonly state: Locator;
  private readonly country: Locator;
  private readonly phone: Locator;
  private readonly email: Locator;
  private readonly password: Locator;
  private readonly failedLoginAttempts: Locator;
  private readonly enabled: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    this.firstName = page.getByTestId('first-name');
    this.failedLoginAttempts = page.getByTestId('failed_login_attempts');
    this.enabled = page.getByTestId('enabled');
    this.lastName = page.getByTestId('last-name');
    this.dob = page.getByTestId('dob');
    this.street = page.getByTestId('street');
    this.postalCode = page.getByTestId('postal_code');
    this.city = page.getByTestId('city');
    this.state = page.getByTestId('state');
    this.country = page.getByTestId('country');
    this.phone = page.getByTestId('phone');
    this.email = page.getByTestId('email');
    this.password = page.getByTestId('password');
    this.submitButton = page.getByTestId('user-submit');
    this.saved = page.locator('.alert-success');
    this.errors = page.locator('.alert-danger');
  }

  /** The edit form fills itself from the server; wait for that before changing anything. */
  async waitForExistingFirstName(firstName: string): Promise<void> {
    await expect(this.firstName).toHaveValue(firstName);
  }

  /**
   * Fills the form. By default it also completes the "failed login attempts" and "enabled" fields, which the
   * server needs in order to accept the user. Pass `includeOptionalFields: false` to leave them untouched.
   */
  async fill(user: UserDraft, options: { includeOptionalFields?: boolean } = {}): Promise<void> {
    const { includeOptionalFields = true } = options;
    await test.step(`Fill the user form (${user.email})`, async () => {
      await this.firstName.fill(user.firstName);
      await this.lastName.fill(user.lastName);
      await this.dob.fill(user.dob);
      await this.street.fill(user.street);
      await this.postalCode.fill(user.postalCode);
      await this.city.fill(user.city);
      await this.state.fill(user.state);
      await this.country.selectOption(user.country);
      await this.phone.fill(user.phone);
      await this.email.fill(user.email);
      await this.password.fill(user.password);
      if (includeOptionalFields) {
        await this.failedLoginAttempts.fill('0');
        await this.enabled.check();
      }
    });
  }

  async setFirstName(firstName: string): Promise<void> {
    await test.step(`Set the first name to ${firstName}`, async () => {
      await this.firstName.fill(firstName);
    });
  }

  async setEmail(email: string): Promise<void> {
    await test.step(`Set the email to ${email}`, async () => {
      await this.email.fill(email);
    });
  }

  async submit(): Promise<void> {
    await test.step('Save the user', async () => {
      await this.submitButton.click();
    });
  }
}
