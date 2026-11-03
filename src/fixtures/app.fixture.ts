import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { credentialsFor } from '@config/env';
import { AccessApi } from '@api/access-api';
import { AuthApi } from '@api/auth-api';
import { BrandsApi } from '@api/brands-api';
import type { Brand } from '@api/brands-api';
import { CartsApi } from '@api/carts-api';
import { InvoicesApi } from '@api/invoices-api';
import { PostcodeApi } from '@api/postcode-api';
import { ProductsApi } from '@api/products-api';
import type { Product } from '@api/types';
import { AccountPage } from '@pages/account-page';
import { AdminBrandsPage, BrandFormPage } from '@pages/admin/admin-brands-page';
import { AdminDashboardPage } from '@pages/admin/admin-dashboard-page';
import { AdminOrdersPage, AdminUsersPage } from '@pages/admin/admin-list-page';
import { CartPage } from '@pages/cart-page';
import { CheckoutPage } from '@pages/checkout-page';
import { Header } from '@pages/components/header';
import { HomePage } from '@pages/home-page';
import { LoginPage } from '@pages/login-page';
import { ProductPage } from '@pages/product-page';
import { test as base } from './base.fixture';

export interface SeededCart {
  cartId: string;
  product: Product;
  quantity: number;
}

/** A unique brand definition for a test; the brand is removed afterwards if it was created. */
export interface BrandDraft {
  name: string;
  slug: string;
}

interface AppFixtures {
  // API clients
  authApi: AuthApi;
  productsApi: ProductsApi;
  cartsApi: CartsApi;
  invoicesApi: InvoicesApi;
  brandsApi: BrandsApi;
  accessApi: AccessApi;
  postcodeApi: PostcodeApi;

  // Page objects
  header: Header;
  loginPage: LoginPage;
  homePage: HomePage;
  productPage: ProductPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  accountPage: AccountPage;
  brandForm: BrandFormPage;

  // Customer session
  /** Bearer token for the customer, created through the API. */
  customerToken: string;
  /** A page that is already signed in as the customer. */
  customerPage: Page;
  /** A cart created through the API and attached to the browser session, so a test starts at checkout. */
  seededCart: SeededCart;
  /** The checkout page at the billing-address step: signed-in customer with a seeded cart. */
  addressStep: CheckoutPage;

  // Admin session. Each of these pages is already signed in as the admin.
  /** Bearer token for the admin, created through the API. */
  adminToken: string;
  adminDashboardPage: AdminDashboardPage;
  adminBrandsPage: AdminBrandsPage;
  adminUsersPage: AdminUsersPage;
  adminOrdersPage: AdminOrdersPage;

  // Brand data
  /** A unique brand name and slug that does not exist yet; any brand created with it is removed afterwards. */
  newBrand: BrandDraft;
  /** A brand created through the API; removed afterwards if the test has not already deleted it. */
  seededBrand: Brand;
}

/** Key under which the application stores its bearer token in localStorage. */
const TOKEN_STORAGE_KEY = 'auth-token';
/** Key under which the application remembers the current cart in sessionStorage. */
const CART_STORAGE_KEY = 'cart_id';

async function signIn(page: Page, token: string): Promise<void> {
  await page
    .context()
    .addInitScript(
      ([key, value]) => window.localStorage.setItem(key as string, value as string),
      [TOKEN_STORAGE_KEY, token],
    );
}

export const test = base.extend<AppFixtures>({
  authApi: async ({ api }, use) => use(new AuthApi(api)),
  productsApi: async ({ api }, use) => use(new ProductsApi(api)),
  cartsApi: async ({ api }, use) => use(new CartsApi(api)),
  invoicesApi: async ({ api }, use) => use(new InvoicesApi(api)),
  brandsApi: async ({ api }, use) => use(new BrandsApi(api)),
  accessApi: async ({ api }, use) => use(new AccessApi(api)),
  postcodeApi: async ({ api }, use) => use(new PostcodeApi(api)),

  header: async ({ page }, use) => use(new Header(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  homePage: async ({ page }, use) => use(new HomePage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  accountPage: async ({ page }, use) => use(new AccountPage(page)),
  brandForm: async ({ page }, use) => use(new BrandFormPage(page)),

  // Tokens are short-lived, so each test signs in through the API instead of sharing a saved session.
  customerToken: async ({ authApi }, use) => {
    const { email, password } = credentialsFor('customer');
    const { access_token } = await authApi.login(email, password);
    await use(access_token);
  },

  customerPage: async ({ page, customerToken }, use) => {
    await signIn(page, customerToken);
    await use(page);
  },

  seededCart: async ({ context, cartsApi, productsApi }, use) => {
    const product = await productsApi.firstOrderable();
    const quantity = 2;
    const cartId = await cartsApi.create();
    await cartsApi.addItem(cartId, product.id, quantity);
    await context.addInitScript(
      ([key, id]) => window.sessionStorage.setItem(key as string, id as string),
      [CART_STORAGE_KEY, cartId],
    );
    await use({ cartId, product, quantity });
  },

  addressStep: async ({ customerPage, seededCart, cartPage, checkoutPage }, use) => {
    await customerPage.goto('/checkout');
    await expect(cartPage.items).toHaveText(seededCart.product.name);
    await cartPage.proceedToCheckout();
    await checkoutPage.continueAsSignedInUser();
    await use(checkoutPage);
  },

  adminToken: async ({ authApi }, use) => {
    const { email, password } = credentialsFor('admin');
    const { access_token } = await authApi.login(email, password);
    await use(access_token);
  },

  adminDashboardPage: async ({ page, adminToken }, use) => {
    await signIn(page, adminToken);
    await use(new AdminDashboardPage(page));
  },
  adminBrandsPage: async ({ page, adminToken }, use) => {
    await signIn(page, adminToken);
    await use(new AdminBrandsPage(page));
  },
  adminUsersPage: async ({ page, adminToken }, use) => {
    await signIn(page, adminToken);
    await use(new AdminUsersPage(page));
  },
  adminOrdersPage: async ({ page, adminToken }, use) => {
    await signIn(page, adminToken);
    await use(new AdminOrdersPage(page));
  },

  newBrand: async ({ brandsApi, adminToken }, use) => {
    const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const draft: BrandDraft = { name: `QA Brand ${unique}`, slug: `qa-brand-${unique}` };
    await use(draft);
    await brandsApi.deleteBySlug(adminToken, draft.slug);
  },

  seededBrand: async ({ brandsApi, adminToken, newBrand }, use) => {
    const brand = await brandsApi.create(adminToken, newBrand.name, newBrand.slug);
    await use(brand);
    // newBrand's teardown removes it by name; nothing more to do here.
  },
});

export { expect } from '@playwright/test';
