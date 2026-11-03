import type { Locator, Page } from '@playwright/test';

export class AccountPage {
  readonly title: Locator;

  constructor(private readonly page: Page) {
    this.title = page.getByTestId('page-title');
  }

  async goto(): Promise<void> {
    await this.page.goto('/account');
  }
}
