import { expect, test } from '@fixtures/app.fixture';
import { Tags } from '@utils/tags';

test.describe('Cart', () => {
  test(
    'adding a product updates the cart badge and total',
    { tag: [Tags.smoke, Tags.ui] },
    async ({ orderableProduct: product, productPage, header, cartPage }) => {
      const quantity = 2;

      await productPage.goto(product.id);
      await expect(productPage.name).toHaveText(product.name);
      await productPage.setQuantity(quantity);
      await productPage.addToCart();

      await expect(header.cartCount).toHaveText(String(quantity));
      await header.openCart();
      await expect(cartPage.items).toHaveCount(1);
      await expect.poll(() => cartPage.totalAmount()).toBeCloseTo(product.price * quantity, 2);
    },
  );
});
