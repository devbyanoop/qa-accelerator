import { expect, test } from '@fixtures/app.fixture';
import { Tags } from '@utils/tags';

test.describe('Carts API', () => {
  test(
    'an item added to a new cart can be read back',
    { tag: [Tags.smoke, Tags.api] },
    async ({ cartsApi, productsApi }) => {
      const product = await productsApi.firstOrderable();
      const cartId = await cartsApi.create();

      await cartsApi.addItem(cartId, product.id, 2);
      const cart = await cartsApi.get(cartId);

      expect(cart.cart_items).toHaveLength(1);
      expect(cart.cart_items[0]).toMatchObject({ product_id: product.id, quantity: 2 });
    },
  );
});
