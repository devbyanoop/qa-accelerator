import type { ProductDraft } from './builders';

/**
 * One shared product that tests order from. An ordered product cannot be deleted in the application, so
 * creating a product per test would leave them behind forever. Instead this one is found or created once per
 * run (see src/config/global-setup.ts) and given so much stock that ordering from it never runs out.
 *
 * The name avoids words shorter than three letters, which the application's full-text search ignores.
 */
export const orderableProductDraft: ProductDraft = {
  name: 'Gadget Orderable Stock',
  description: 'Shared product with a very large stock, used by tests that place orders',
  price: 12.5,
  stock: 1_000_000,
};
