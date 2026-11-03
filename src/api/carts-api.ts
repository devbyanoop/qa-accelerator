import type { APIRequestContext } from '@playwright/test';
import { BaseApiClient } from './base-api-client';
import type { Cart } from './types';

export class CartsApi extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  async create(): Promise<string> {
    const { id } = await this.send<{ id: string }>('POST', '/carts', { data: {} });
    return id;
  }

  addItem(cartId: string, productId: string, quantity: number): Promise<{ result: string }> {
    return this.send('POST', `/carts/${cartId}`, { data: { product_id: productId, quantity } });
  }

  get(cartId: string): Promise<Cart> {
    return this.send<Cart>('GET', `/carts/${cartId}`);
  }
}
