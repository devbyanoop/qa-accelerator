import { expect, test } from '@fixtures/app.fixture';
import { requirement } from '@utils/requirements';
import { Tags } from '@utils/tags';

test.describe('Carts API', { tag: [...requirement('REQ-CART-001')] }, () => {
  test(
    'an item added to a new cart can be read back',
    { tag: [Tags.smoke, Tags.api] },
    async ({ cartsApi, orderableProduct: product }) => {
      const cartId = await cartsApi.create();

      await cartsApi.addItem(cartId, product.id, 2);
      const cart = await cartsApi.get(cartId);

      expect(cart.cart_items).toHaveLength(1);
      expect(cart.cart_items[0]).toMatchObject({ product_id: product.id, quantity: 2 });
    },
  );
});
