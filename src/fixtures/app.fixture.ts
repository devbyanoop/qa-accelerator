import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { credentialsFor } from '@config/env';
import { AccessApi } from '@api/access-api';
import { AuthApi } from '@api/auth-api';
import { BrandsApi } from '@api/brands-api';
import type { Brand } from '@api/brands-api';
import { CartsApi } from '@api/carts-api';
import { InvoicesApi } from '@api/invoices-api';
import { PaymentApi } from '@api/payment-api';
import { PostcodeApi } from '@api/postcode-api';
import { ProductsApi } from '@api/products-api';
import { ReferenceDataApi } from '@api/reference-api';
import type { ProductReferences } from '@api/reference-api';
import type { Product } from '@api/types';
import { UsersApi } from '@api/users-api';
import type { UserRecord } from '@api/users-api';
import { buildBrand, buildProduct, buildUser } from '@data/builders';
import type { BrandDraft, ProductDraft, UserDraft } from '@data/builders';
import { AccountPage } from '@pages/account-page';
import { AdminBrandsPage, BrandFormPage } from '@pages/admin/admin-brands-page';
import { AdminDashboardPage } from '@pages/admin/admin-dashboard-page';
import { AdminOrdersPage } from '@pages/admin/admin-list-page';
import { AdminProductsPage, ProductFormPage } from '@pages/admin/admin-products-page';
import { AdminUsersPage, UserFormPage } from '@pages/admin/admin-users-page';
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

interface AppFixtures {
  // API clients
  authApi: AuthApi;
  productsApi: ProductsApi;
  cartsApi: CartsApi;
  invoicesApi: InvoicesApi;
  brandsApi: BrandsApi;
  usersApi: UsersApi;
  referenceApi: ReferenceDataApi;
  paymentApi: PaymentApi;
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
  productForm: ProductFormPage;
  userForm: UserFormPage;

  // Customer session
  /** Bearer token for the customer, created through the API. */
  customerToken: string;
  /** A page that is already signed in as the customer. */
  customerPage: Page;
  /** A cart created through the API and attached to the browser session, so a test starts at checkout. */
  seededCart: SeededCart;
  /** The checkout page at the billing-address step: signed-in customer with a seeded cart. */
  addressStep: CheckoutPage;
  /** The shared, practically unlimited product that tests order from. */
  orderableProduct: Product;

  // Admin session. Each of these pages is already signed in as the admin.
  /** Bearer token for the admin, created through the API. */
  adminToken: string;
  adminDashboardPage: AdminDashboardPage;
  adminBrandsPage: AdminBrandsPage;
  adminProductsPage: AdminProductsPage;
  adminUsersPage: AdminUsersPage;
  adminOrdersPage: AdminOrdersPage;

  // Test data. "new*" is a unique draft that does not exist yet and is removed afterwards if a test creates it.
  // "seeded*" is created through the API first, and removed afterwards unless the test deleted it.
  newBrand: BrandDraft;
  seededBrand: Brand;
  /** The brand, category and image a new product points at. */
  productReferences: ProductReferences;
  newProduct: ProductDraft;
  seededProduct: Product;
  newUser: UserDraft;
  seededUser: UserDraft & UserRecord;
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
  usersApi: async ({ api }, use) => use(new UsersApi(api)),
  referenceApi: async ({ api }, use) => use(new ReferenceDataApi(api)),
  paymentApi: async ({ api }, use) => use(new PaymentApi(api)),
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
  productForm: async ({ page }, use) => use(new ProductFormPage(page)),
  userForm: async ({ page }, use) => use(new UserFormPage(page)),

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

  orderableProduct: async ({ productsApi }, use) => use(await productsApi.orderable()),

  seededCart: async ({ context, cartsApi, orderableProduct: product }, use) => {
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
  adminProductsPage: async ({ page, adminToken }, use) => {
    await signIn(page, adminToken);
    await use(new AdminProductsPage(page));
  },
  adminUsersPage: async ({ page, adminToken }, use) => {
    await signIn(page, adminToken);
    await use(new AdminUsersPage(page));
  },
  adminOrdersPage: async ({ page, adminToken }, use) => {
    await signIn(page, adminToken);
    await use(new AdminOrdersPage(page));
  },

  // Brands are cleaned up by slug, which survives a rename.
  newBrand: async ({ brandsApi, adminToken }, use) => {
    const draft = buildBrand();
    await use(draft);
    await brandsApi.deleteBySlug(adminToken, draft.slug);
  },

  seededBrand: async ({ brandsApi, adminToken, newBrand }, use) => {
    await use(await brandsApi.create(adminToken, newBrand.name, newBrand.slug));
  },

  productReferences: async ({ referenceApi }, use) => use(await referenceApi.productReferences()),

  // Products are cleaned up by name, so a test must not rename the product it creates.
  newProduct: async ({ productsApi, adminToken }, use) => {
    const draft = buildProduct();
    await use(draft);
    await productsApi.deleteByName(adminToken, draft.name);
  },

  seededProduct: async ({ productsApi, adminToken, newProduct, productReferences }, use) => {
    await use(await productsApi.create(adminToken, newProduct, productReferences));
  },

  // Users are cleaned up by email, so a test must not change the email of the user it creates.
  newUser: async ({ usersApi, adminToken }, use) => {
    const draft = buildUser();
    await use(draft);
    await usersApi.deleteByEmail(adminToken, draft.email);
  },

  seededUser: async ({ usersApi, newUser }, use) => {
    const record = await usersApi.create(newUser);
    await use({ ...newUser, ...record });
  },
});

export { expect } from '@playwright/test';
