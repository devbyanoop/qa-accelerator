import { test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { ProductSort } from '@api/types';

/** Product catalog (the landing page): search, sort and browse. */
export class HomePage {
  readonly productCards: Locator;
  private readonly searchInput: Locator;
  private readonly searchSubmit: Locator;
  private readonly searchReset: Locator;
  private readonly sortSelect: Locator;

  constructor(private readonly page: Page) {
    // Card ids are "product-<26 char id>"; this excludes "product-name" and "product-price".
    // Seeded products have uppercase ids and products created at runtime have lowercase ones.
    this.productCards = page.getByTestId(/^product-[0-9A-Za-z]{26}$/);
    this.searchInput = page.getByTestId('search-query');
    this.searchSubmit = page.getByTestId('search-submit');
    this.searchReset = page.getByTestId('search-reset');
    this.sortSelect = page.getByTestId('sort');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /**
   * Opens the catalog and returns the paging numbers of the listing the page itself requested. These can
   * differ from the plain GET /products listing because the page applies its own filters.
   */
  async gotoAndReadPaging(): Promise<{ total: number; perPage: number; lastPage: number }> {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/products' && r.request().method() === 'QUERY',
      ),
      this.page.goto('/'),
    ]);
    const body = (await response.json()) as { total: number; per_page: number; last_page: number };
    return { total: body.total, perPage: body.per_page, lastPage: body.last_page };
  }

  /** Opens a page of the catalog and returns what the server sent for it. */
  async goToPageAndReadListing(pageNumber: number): Promise<{ currentPage: number; productCount: number }> {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/products' && r.request().method() === 'QUERY',
      ),
      this.goToPage(pageNumber),
    ]);
    const body = (await response.json()) as { current_page: number; data: unknown[] };
    return { currentPage: body.current_page, productCount: body.data.length };
  }

  async search(term: string): Promise<void> {
    await test.step(`Search for "${term}"`, async () => {
      await this.searchInput.fill(term);
      await this.searchSubmit.click();
    });
  }

  async resetSearch(): Promise<void> {
    await this.searchReset.click();
  }

  async sortBy(sort: ProductSort): Promise<void> {
    await test.step(`Sort products by ${sort}`, async () => {
      await this.sortSelect.selectOption(sort);
    });
  }

  async productNames(): Promise<string[]> {
    return (await this.productCards.getByTestId('product-name').allTextContents()).map((t) => t.trim());
  }

  async productPrices(): Promise<number[]> {
    const texts = await this.productCards.getByTestId('product-price').allTextContents();
    return texts.map((t) => Number(t.replace(/[^0-9.]/g, '')));
  }

  /** The highlighted page number in the pager, e.g. "2". */
  get activePage(): Locator {
    return this.page.locator('.pagination .page-item.active');
  }

  async goToPage(pageNumber: number): Promise<void> {
    await test.step(`Go to page ${pageNumber}`, async () => {
      await this.page.getByRole('button', { name: `Page-${pageNumber}`, exact: true }).click();
    });
  }

  async nextPage(): Promise<void> {
    await test.step('Go to the next page', async () => {
      await this.page.getByTestId('pagination-next').click();
    });
  }

  async previousPage(): Promise<void> {
    await test.step('Go to the previous page', async () => {
      await this.page.getByTestId('pagination-prev').click();
    });
  }

  async openProduct(name: string): Promise<void> {
    await this.productCards.filter({ hasText: name }).first().click();
  }
}
