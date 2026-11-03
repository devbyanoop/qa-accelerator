import type { Locator, Page } from '@playwright/test';

/** First step of the checkout wizard: the cart contents. */
export class CartPage {
  readonly items: Locator;
  readonly total: Locator;
  private readonly proceed: Locator;

  constructor(private readonly page: Page) {
    this.items = page.getByTestId('product-title');
    this.total = page.getByTestId('cart-total');
    this.proceed = page.getByTestId('proceed-1');
  }

  async goto(): Promise<void> {
    await this.page.goto('/checkout');
  }

  async proceedToCheckout(): Promise<void> {
    await this.proceed.click();
  }

  async totalAmount(): Promise<number> {
    return Number((await this.total.innerText()).replace(/[^0-9.]/g, ''));
  }
}
