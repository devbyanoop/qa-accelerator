import { credentialsFor } from '@config/env';
import { invalidPaymentSamples, paymentSamples, sampleAddress } from '@data/checkout-data';
import { expect, test } from '@fixtures/app.fixture';
import { Tags } from '@utils/tags';

test.describe('Checkout', () => {
  for (const payment of paymentSamples()) {
    const tag = payment.method === 'cash-on-delivery' ? Tags.smoke : Tags.regression;

    test(
      `a customer can place an order paying by ${payment.method}`,
      { tag: [tag, Tags.ui] },
      async ({ addressStep: checkout, invoicesApi, customerToken, seededCart }) => {
        await checkout.enterAddress(sampleAddress);
        await checkout.continueToPayment();
        await checkout.pay(payment);

        const invoiceNumber = await checkout.invoiceNumber();
        const invoice = await invoicesApi.findByNumber(customerToken, invoiceNumber);
        expect(invoice, `invoice ${invoiceNumber} should exist for the customer`).toBeDefined();
        expect(invoice?.billing_country).toBe(sampleAddress.country);
        expect(invoice?.invoicelines).toHaveLength(1);
        expect(invoice?.invoicelines[0]?.quantity).toBe(seededCart.quantity);
      },
    );
  }

  test(
    'the address step stays blocked until the address is complete',
    { tag: [Tags.regression, Tags.ui] },
    async ({ addressStep: checkout }) => {
      await expect(checkout.continueToPaymentButton).toBeDisabled();

      await checkout.enterAddress(sampleAddress);

      await expect(checkout.continueToPaymentButton).toBeEnabled();
    },
  );

  test(
    'entering a postcode fills in street, city and state',
    { tag: [Tags.regression, Tags.ui] },
    async ({ addressStep: checkout }) => {
      await checkout.enterAddress(sampleAddress);

      await expect(checkout.street).not.toHaveValue('');
      await expect(checkout.city).not.toHaveValue('');
      await expect(checkout.state).not.toHaveValue('');
    },
  );

  for (const { reason, details } of invalidPaymentSamples()) {
    test(
      `the order is blocked with ${reason}`,
      { tag: [Tags.regression, Tags.ui] },
      async ({ addressStep: checkout }) => {
        await checkout.enterAddress(sampleAddress);
        await checkout.continueToPayment();

        await checkout.fillPaymentDetails(details);

        await expect(checkout.finishButton).toBeDisabled();
      },
    );
  }

  test(
    'an anonymous shopper can sign in during checkout and continue',
    { tag: [Tags.regression, Tags.ui] },
    async ({ page, cartPage, loginPage, checkoutPage, seededCart }) => {
      const { email, password } = credentialsFor('customer');

      await page.goto('/checkout');
      await expect(cartPage.items).toHaveText(seededCart.product.name);
      await cartPage.proceedToCheckout();
      await loginPage.login(email, password);

      await expect(checkoutPage.continueAsSignedInButton).toBeVisible();
    },
  );
});
