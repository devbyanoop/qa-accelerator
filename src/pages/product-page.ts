import type { Locator, Page } from '@playwright/test';

export class ProductPage {
  readonly name: Locator;
  readonly unitPrice: Locator;
  private readonly quantity: Locator;
  private readonly addToCartButton: Locator;

  constructor(private readonly page: Page) {
    this.name = page.getByTestId('product-name');
    this.unitPrice = page.getByTestId('unit-price');
    this.quantity = page.getByTestId('quantity');
    this.addToCartButton = page.getByTestId('add-to-cart');
  }

  async goto(productId: string): Promise<void> {
    await this.page.goto(`/product/${productId}`);
  }

  async setQuantity(quantity: number): Promise<void> {
    await this.quantity.fill(String(quantity));
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }

  async price(): Promise<number> {
    return Number((await this.unitPrice.innerText()).replace(/[^0-9.]/g, ''));
  }
}
