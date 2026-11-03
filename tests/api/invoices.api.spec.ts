import { sampleAddress } from '@data/checkout-data';
import { expect, test } from '@fixtures/app.fixture';
import { Tags } from '@utils/tags';

test.describe('Invoices API', () => {
  test(
    'an order cannot be placed for an empty cart',
    { tag: [Tags.regression, Tags.api, Tags.knownIssue] },
    async ({ cartsApi, invoicesApi, postcodeApi, customerToken }) => {
      test.fail(true, 'Known application issue: an invoice is created for a cart that has no items.');
      const address = await postcodeApi.lookup(
        sampleAddress.country,
        sampleAddress.postalCode,
        sampleAddress.houseNumber,
      );
      const emptyCartId = await cartsApi.create();

      const placeOrder = invoicesApi.create(customerToken, {
        billing_street: address.street,
        billing_city: address.city,
        billing_state: address.state,
        billing_country: address.country,
        billing_postal_code: address.postcode,
        payment_method: 'cash-on-delivery',
        payment_details: {},
        cart_id: emptyCartId,
      });

      await expect(placeOrder).rejects.toThrow();
    },
  );
});
