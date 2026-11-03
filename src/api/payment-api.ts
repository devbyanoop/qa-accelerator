import type { APIRequestContext } from '@playwright/test';
import type { PaymentDetails } from '@data/checkout-data';
import { BaseApiClient } from './base-api-client';

export interface PaymentCheckResult {
  status: number;
  body: { message?: string; errors?: Record<string, string[]> };
}

/** The request body the application expects for a payment method and its details. */
export function toPaymentPayload(details: PaymentDetails): Record<string, unknown> {
  switch (details.method) {
    case 'cash-on-delivery':
      return { payment_method: details.method, payment_details: {} };
    case 'bank-transfer':
      return {
        payment_method: details.method,
        payment_details: {
          bank_name: details.bankName,
          account_name: details.accountName,
          account_number: details.accountNumber,
        },
      };
    case 'credit-card':
      return {
        payment_method: details.method,
        payment_details: {
          credit_card_number: details.number,
          expiration_date: details.expiry,
          cvv: details.cvv,
          card_holder_name: details.holder,
        },
      };
    case 'buy-now-pay-later':
      return {
        payment_method: details.method,
        payment_details: { monthly_installments: details.installments },
      };
    case 'gift-card':
      return {
        payment_method: details.method,
        payment_details: { gift_card_number: details.number, validation_code: details.validationCode },
      };
  }
}

export class PaymentApi extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  check(details: PaymentDetails): Promise<PaymentCheckResult> {
    return this.checkRaw(toPaymentPayload(details));
  }

  /** Sends an arbitrary payload, for cases the typed details cannot express (such as an unknown method). */
  async checkRaw(payload: Record<string, unknown>): Promise<PaymentCheckResult> {
    const response = await this.request.post('/payment/check', { data: payload });
    return { status: response.status(), body: await response.json() };
  }
}
