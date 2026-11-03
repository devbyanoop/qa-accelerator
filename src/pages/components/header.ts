import type { Locator, Page } from '@playwright/test';

/** Site header shared by every page. */
export class Header {
  readonly cartCount: Locator;
  readonly signInLink: Locator;
  readonly userMenu: Locator;
  private readonly cartLink: Locator;

  constructor(page: Page) {
    this.cartCount = page.getByTestId('cart-quantity');
    this.signInLink = page.getByTestId('nav-sign-in');
    this.userMenu = page.getByTestId('nav-menu');
    this.cartLink = page.getByTestId('nav-cart');
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }
}
