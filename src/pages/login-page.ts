import { test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly error: Locator;
  private readonly email: Locator;
  private readonly password: Locator;
  private readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.email = page.getByTestId('email');
    this.password = page.getByTestId('password');
    this.submit = page.getByTestId('login-submit');
    this.error = page.getByTestId('login-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/auth/login');
  }

  async login(email: string, password: string): Promise<void> {
    await test.step(`Log in as ${email}`, async () => {
      await this.email.fill(email);
      await this.password.fill(password);
      await this.submit.click();
    });
  }
}
