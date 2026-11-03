import { test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

/** An admin screen that lists records in a table with a search box (brands, users, orders, ...). */
export class AdminListPage {
  readonly title: Locator;
  readonly rows: Locator;
  private readonly searchInput: Locator;
  private readonly searchSubmit: Locator;

  /**
   * @param path   URL of the list, e.g. "/admin/users"
   * @param prefix test-id prefix of the search controls, e.g. "user" for user-search-query
   */
  constructor(
    protected readonly page: Page,
    private readonly path: string,
    prefix: string,
  ) {
    this.title = page.getByTestId('page-title');
    this.rows = page.locator('table tbody tr');
    this.searchInput = page.getByTestId(`${prefix}-search-query`);
    this.searchSubmit = page.getByTestId(`${prefix}-search-submit`);
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }

  async search(term: string): Promise<void> {
    await test.step(`Search the list for "${term}"`, async () => {
      await this.searchInput.fill(term);
      await this.searchSubmit.click();
    });
  }

  row(text: string): Locator {
    return this.rows.filter({ hasText: text });
  }
}

export class AdminOrdersPage extends AdminListPage {
  constructor(page: Page) {
    super(page, '/admin/orders', 'order');
  }
}
