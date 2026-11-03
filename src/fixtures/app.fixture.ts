import type { Page } from '@playwright/test';
import { credentialsFor } from '@config/env';
import { AuthApi } from '@api/auth-api';
import { CartsApi } from '@api/carts-api';
import { ProductsApi } from '@api/products-api';
import { AccountPage } from '@pages/account-page';
import { CartPage } from '@pages/cart-page';
import { Header } from '@pages/components/header';
import { HomePage } from '@pages/home-page';
import { LoginPage } from '@pages/login-page';
import { ProductPage } from '@pages/product-page';
import { test as base } from './base.fixture';

interface AppFixtures {
  authApi: AuthApi;
  productsApi: ProductsApi;
  cartsApi: CartsApi;
  header: Header;
  loginPage: LoginPage;
  homePage: HomePage;
  productPage: ProductPage;
  cartPage: CartPage;
  accountPage: AccountPage;
  /** A page that is already signed in as the customer (token created through the API). */
  customerPage: Page;
}

/** Key under which the application stores its bearer token in localStorage. */
const TOKEN_STORAGE_KEY = 'auth-token';

export const test = base.extend<AppFixtures>({
  authApi: async ({ api }, use) => use(new AuthApi(api)),
  productsApi: async ({ api }, use) => use(new ProductsApi(api)),
  cartsApi: async ({ api }, use) => use(new CartsApi(api)),

  header: async ({ page }, use) => use(new Header(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  homePage: async ({ page }, use) => use(new HomePage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  accountPage: async ({ page }, use) => use(new AccountPage(page)),

  // Tokens are short-lived, so each test signs in through the API instead of sharing a saved session.
  customerPage: async ({ page, context, authApi }, use) => {
    const { email, password } = credentialsFor('customer');
    const { access_token } = await authApi.login(email, password);
    await context.addInitScript(
      ([key, token]) => window.localStorage.setItem(key as string, token as string),
      [TOKEN_STORAGE_KEY, access_token],
    );
    await use(page);
  },
});

export { expect } from '@playwright/test';
