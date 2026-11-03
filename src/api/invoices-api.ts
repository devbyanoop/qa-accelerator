import type { APIRequestContext } from '@playwright/test';
import { BaseApiClient } from './base-api-client';
import type { Invoice, Page } from './types';

export interface NewInvoice {
  billing_street: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_postal_code: string;
  payment_method: string;
  payment_details: Record<string, unknown>;
  cart_id: string;
}

export class InvoicesApi extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  /** Places an order for a cart, the same call the checkout page makes. */
  create(token: string, invoice: NewInvoice): Promise<{ invoice_number: string }> {
    return this.send('POST', '/invoices', { data: invoice, headers: { Authorization: `Bearer ${token}` } });
  }

  /**
   * Finds one of the user's invoices by its number. The list is paginated, so this checks the first page and
   * the last few pages, where a just-created invoice is found whichever way the list is ordered.
   */
  async findByNumber(token: string, invoiceNumber: string): Promise<Invoice | undefined> {
    const headers = { Authorization: `Bearer ${token}` };
    const first = await this.send<Page<Invoice>>('GET', '/invoices', { headers });

    const firstMatch = first.data.find((i) => i.invoice_number === invoiceNumber);
    if (firstMatch) return firstMatch;

    for (let page = first.last_page; page > Math.max(1, first.last_page - 3); page--) {
      const result = await this.send<Page<Invoice>>('GET', '/invoices', { headers, params: { page } });
      const match = result.data.find((i) => i.invoice_number === invoiceNumber);
      if (match) return match;
    }
    return undefined;
  }
}
