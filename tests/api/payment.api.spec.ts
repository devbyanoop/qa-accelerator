import { invalidPaymentSamples, paymentSamples } from '@data/checkout-data';
import { expect, test } from '@fixtures/app.fixture';
import { Tags } from '@utils/tags';

test.describe('Payment check API', () => {
  for (const payment of paymentSamples()) {
    test(
      `accepts valid ${payment.method} details`,
      { tag: [Tags.regression, Tags.api] },
      async ({ paymentApi }) => {
        const result = await paymentApi.check(payment);

        expect(result.status).toBe(200);
        expect(result.body.message).toBe('Payment was successful');
      },
    );
  }

  for (const { reason, details } of invalidPaymentSamples()) {
    test(`rejects ${reason}`, { tag: [Tags.regression, Tags.api] }, async ({ paymentApi }) => {
      const result = await paymentApi.check(details);

      expect(result.status).toBe(422);
      expect(Object.keys(result.body.errors ?? {})).not.toHaveLength(0);
    });
  }

  test(
    'rejects a payment method that does not exist',
    { tag: [Tags.regression, Tags.api, Tags.knownIssue] },
    async ({ paymentApi }) => {
      test.fail(
        true,
        'Known application issue: an unsupported payment method is reported as "Payment was successful".',
      );

      const result = await paymentApi.checkRaw({ payment_method: 'not-a-real-method', payment_details: {} });

      expect(result.status).toBeGreaterThanOrEqual(400);
    },
  );
});
