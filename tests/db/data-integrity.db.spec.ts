import { env } from '@config/env';
import { sampleAddress } from '@data/checkout-data';
import { expect, test } from '@fixtures/app.fixture';
import { requirement } from '@utils/requirements';
import { Tags } from '@utils/tags';

// These look at what the application really stored, which the API and the screen can't prove on their own.
// They need direct database access, so they run only when DB_HOST is set (CI sets it for the local containers).
test.describe('Database integrity', () => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(!env.db, 'Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME to run the database checks.');

  test(
    'a placed order is stored with its items and payment',
    { tag: [Tags.regression, Tags.db, ...requirement('REQ-ORD-002')] },
    async ({ invoicesApi, postcodeApi, customerToken, seededCart, toolshopDb }) => {
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

      const invoice = await toolshopDb.invoiceByNumber(invoice_number);
      expect(invoice, 'the invoice row').toBeDefined();
      expect(invoice!.billing_country).toBe(address.country);
      // A new order always starts here. In the full application stack a scheduled job moves it on a little later.
      expect(invoice!.status).toBe('AWAITING_FULFILLMENT');

      const items = await toolshopDb.invoiceItems(invoice!.id);
      expect(items).toHaveLength(1);
      expect(items[0]!.product_id).toBe(seededCart.product.id);
      expect(items[0]!.quantity).toBe(seededCart.quantity);

      const payments = await toolshopDb.payments(invoice!.id);
      expect(payments.map((p) => p.payment_method)).toEqual(['cash-on-delivery']);

      const fromApi = await invoicesApi.findByNumber(customerToken, invoice_number);
      expect(Number(invoice!.total)).toBe(Number(fromApi!.total));
    },
  );

  test(
    'a registered user is stored with a hashed password',
    { tag: [Tags.regression, Tags.db, ...requirement('REQ-SEC-002')] },
    async ({ seededUser, toolshopDb }) => {
      const row = await toolshopDb.userByEmail(seededUser.email);

      expect(row, 'the user row').toBeDefined();
      expect(row!.password).not.toBe(seededUser.password);
      expect(row!.password).toMatch(/^\$(2[aby]|argon2id?)\$/);
      expect(row!.role).toBe('user');
    },
  );

  test(
    'deleting a product removes its row',
    { tag: [Tags.regression, Tags.db, ...requirement('REQ-ADM-001')] },
    async ({ productsApi, adminToken, seededProduct, toolshopDb }) => {
      expect(await toolshopDb.productCount(seededProduct.name)).toBe(1);

      await productsApi.delete(adminToken, seededProduct.id);

      expect(await toolshopDb.productCount(seededProduct.name)).toBe(0);
    },
  );
});
