import { credentialsFor } from '@config/env';
import { sampleAddress } from '@data/checkout-data';
import { expect, test } from '@fixtures/app.fixture';
import { requirement } from '@utils/requirements';
import { Tags } from '@utils/tags';

test.describe('Admin lists', { tag: [...requirement('REQ-ADM-001')] }, () => {
  test(
    'an admin can find a user by email',
    { tag: [Tags.regression, Tags.ui] },
    async ({ adminUsersPage }) => {
      const { email } = credentialsFor('customer');

      await adminUsersPage.goto();
      await adminUsersPage.search(email);

      await expect(adminUsersPage.row(email)).toBeVisible();
    },
  );

  test(
    'an order placed by a customer appears in the admin orders list',
    { tag: [Tags.regression, Tags.ui] },
    async ({ adminOrdersPage, invoicesApi, postcodeApi, customerToken, seededCart }) => {
      // The application only accepts billing addresses that match its own postcode lookup.
      const address = await postcodeApi.lookup(
        sampleAddress.country,
        sampleAddress.postalCode,
        sampleAddress.houseNumber,
      );
      const { invoice_number } = await invoicesApi.create(customerToken, {
        billing_street: address.street,
        billing_city: address.city,
        billing_state: address.state,
        billing_country: address.country,
        billing_postal_code: address.postcode,
        payment_method: 'cash-on-delivery',
        payment_details: {},
        cart_id: seededCart.cartId,
      });

      await adminOrdersPage.goto();
      await adminOrdersPage.search(invoice_number);

      await expect(adminOrdersPage.row(invoice_number)).toBeVisible();
    },
  );
});
