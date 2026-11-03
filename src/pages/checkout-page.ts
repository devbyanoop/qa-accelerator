import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { Address, PaymentDetails } from '@data/checkout-data';

/**
 * The checkout wizard after the cart step: sign-in, billing address and payment.
 * The cart step itself is handled by CartPage.
 */
export class CheckoutPage {
  readonly continueAsSignedInButton: Locator;
  readonly continueToPaymentButton: Locator;
  readonly finishButton: Locator;
  readonly street: Locator;
  readonly city: Locator;
  readonly state: Locator;
  readonly paymentSuccess: Locator;
  readonly confirmation: Locator;
  private readonly country: Locator;
  private readonly postalCode: Locator;
  private readonly houseNumber: Locator;
  private readonly paymentMethod: Locator;

  constructor(private readonly page: Page) {
    this.continueAsSignedInButton = page.getByTestId('proceed-2');
    this.continueToPaymentButton = page.getByTestId('proceed-3');
    this.finishButton = page.getByTestId('finish');
    this.street = page.getByTestId('street');
    this.city = page.getByTestId('city');
    this.state = page.getByTestId('state');
    this.paymentSuccess = page.getByTestId('payment-success-message');
    this.confirmation = page.locator('#order-confirmation');
    this.country = page.getByTestId('country');
    this.postalCode = page.getByTestId('postal_code');
    this.houseNumber = page.getByTestId('house_number');
    this.paymentMethod = page.getByTestId('payment-method');
  }

  async continueAsSignedInUser(): Promise<void> {
    await test.step('Continue as the signed-in customer', async () => {
      await this.continueAsSignedInButton.click();
    });
  }

  async enterAddress(address: Address): Promise<void> {
    await test.step(`Enter address (${address.country} ${address.postalCode} ${address.houseNumber})`, async () => {
      await this.country.selectOption(address.country);
      await this.postalCode.fill(address.postalCode);
      await this.houseNumber.fill(address.houseNumber);
      // The application looks the address up from the postcode and fills in street, city and state.
      await expect(this.state).not.toHaveValue('');
    });
  }

  async continueToPayment(): Promise<void> {
    await test.step('Continue to payment', async () => {
      await this.continueToPaymentButton.click();
    });
  }

  async fillPaymentDetails(details: PaymentDetails): Promise<void> {
    await test.step(`Choose payment by ${details.method}`, async () => {
      await this.paymentMethod.selectOption(details.method);
      switch (details.method) {
        case 'cash-on-delivery':
          break;
        case 'bank-transfer':
          await this.page.getByTestId('bank_name').fill(details.bankName);
          await this.page.getByTestId('account_name').fill(details.accountName);
          await this.page.getByTestId('account_number').fill(details.accountNumber);
          break;
        case 'credit-card':
          await this.page.getByTestId('credit_card_number').fill(details.number);
          await this.page.getByTestId('expiration_date').fill(details.expiry);
          await this.page.getByTestId('cvv').fill(details.cvv);
          await this.page.getByTestId('card_holder_name').fill(details.holder);
          break;
        case 'buy-now-pay-later':
          await this.page.getByTestId('monthly_installments').selectOption(String(details.installments));
          break;
        case 'gift-card':
          await this.page.getByTestId('gift_card_number').fill(details.number);
          await this.page.getByTestId('validation_code').fill(details.validationCode);
          break;
      }
    });
  }

  /** The first click validates the payment; the second one places the order. */
  async placeOrder(): Promise<void> {
    await test.step('Place the order', async () => {
      await this.finishButton.click();
      await expect(this.paymentSuccess).toBeVisible();
      await this.finishButton.click();
      await expect(this.confirmation).toBeVisible();
    });
  }

  async pay(details: PaymentDetails): Promise<void> {
    await this.fillPaymentDetails(details);
    await this.placeOrder();
  }

  /** The invoice number shown on the order confirmation, e.g. "INV-20260000123". */
  async invoiceNumber(): Promise<string> {
    const match = /INV-\w+/.exec(await this.confirmation.innerText());
    if (!match) {
      throw new Error('No invoice number found in the order confirmation.');
    }
    return match[0];
  }
}
