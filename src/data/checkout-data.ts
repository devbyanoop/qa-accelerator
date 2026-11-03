/** Synthetic checkout data. Formats follow the reference application's validation rules. */

export interface Address {
  /** ISO country code, as used by the country dropdown. */
  country: string;
  postalCode: string;
  houseNumber: string;
}

export type PaymentDetails =
  | { method: 'cash-on-delivery' }
  | { method: 'bank-transfer'; bankName: string; accountName: string; accountNumber: string }
  | { method: 'credit-card'; number: string; expiry: string; cvv: string; holder: string }
  | { method: 'buy-now-pay-later'; installments: 3 | 6 | 9 | 12 }
  | { method: 'gift-card'; number: string; validationCode: string };

export type PaymentMethod = PaymentDetails['method'];

export const sampleAddress: Address = { country: 'AT', postalCode: '1010', houseNumber: '1' };

/** MM/YYYY one year ahead, so a card is never expired whenever the suite runs. */
export function futureExpiry(): string {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear() + 1}`;
}

/** MM/YYYY safely in the past. */
export const expiredExpiry = '01/2020';

export interface InvalidPayment {
  reason: string;
  details: PaymentDetails;
}

/** Payment details the application must refuse, each breaking one rule. */
export function invalidPaymentSamples(): InvalidPayment[] {
  const validCard = {
    method: 'credit-card',
    number: '1111-2222-3333-4444',
    expiry: futureExpiry(),
    cvv: '123',
    holder: 'Jane Doe',
  } as const;
  return [
    { reason: 'a card number that is too short', details: { ...validCard, number: '1234' } },
    { reason: 'an expired card', details: { ...validCard, expiry: expiredExpiry } },
    { reason: 'a card holder name with digits', details: { ...validCard, holder: 'Jane 123' } },
    {
      reason: 'a bank account number with letters',
      details: {
        method: 'bank-transfer',
        bankName: 'Test Bank',
        accountName: 'Jane Doe',
        accountNumber: 'ABC',
      },
    },
    {
      reason: 'a gift card number of the wrong length',
      details: { method: 'gift-card', number: 'SHORT', validationCode: 'AB12' },
    },
  ];
}

export function paymentSamples(): PaymentDetails[] {
  return [
    { method: 'cash-on-delivery' },
    { method: 'bank-transfer', bankName: 'Test Bank', accountName: 'Jane Doe', accountNumber: '123456789' },
    {
      method: 'credit-card',
      number: '1111-2222-3333-4444',
      expiry: futureExpiry(),
      cvv: '123',
      holder: 'Jane Doe',
    },
    { method: 'buy-now-pay-later', installments: 6 },
    { method: 'gift-card', number: 'ABCD1234EFGH5678', validationCode: 'AB12' },
  ];
}
