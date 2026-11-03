import type { Locator, Page } from '@playwright/test';

export class AdminDashboardPage {
  readonly title: Locator;
  readonly invoiceRows: Locator;

  constructor(private readonly page: Page) {
    this.title = page.getByTestId('page-title');
    this.invoiceRows = page.locator('table tbody tr');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/dashboard');
  }
}
