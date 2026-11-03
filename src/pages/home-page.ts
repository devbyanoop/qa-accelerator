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
    this.productCards = page.getByTestId(/^product-[0-9A-Z]{26}$/);
    this.searchInput = page.getByTestId('search-query');
    this.searchSubmit = page.getByTestId('search-submit');
    this.searchReset = page.getByTestId('search-reset');
    this.sortSelect = page.getByTestId('sort');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchSubmit.click();
  }

  async resetSearch(): Promise<void> {
    await this.searchReset.click();
  }

  async sortBy(sort: ProductSort): Promise<void> {
    await this.sortSelect.selectOption(sort);
  }

  async productNames(): Promise<string[]> {
    return (await this.productCards.getByTestId('product-name').allTextContents()).map((t) => t.trim());
  }

  async productPrices(): Promise<number[]> {
    const texts = await this.productCards.getByTestId('product-price').allTextContents();
    return texts.map((t) => Number(t.replace(/[^0-9.]/g, '')));
  }

  async openProduct(name: string): Promise<void> {
    await this.productCards.filter({ hasText: name }).first().click();
  }
}
