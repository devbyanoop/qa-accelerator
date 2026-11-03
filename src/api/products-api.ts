import type { APIRequestContext } from '@playwright/test';
import { BaseApiClient } from './base-api-client';
import type { Page, Product, ProductSort } from './types';

export interface ProductQuery {
  page?: number;
  q?: string;
  sort?: ProductSort;
}

export class ProductsApi extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  list(query: ProductQuery = {}): Promise<Page<Product>> {
    const params: Record<string, string | number> = {};
    if (query.page !== undefined) params.page = query.page;
    if (query.q !== undefined) params.q = query.q;
    if (query.sort !== undefined) params.sort = query.sort;
    return this.send<Page<Product>>('GET', '/products', { params });
  }

  getById(id: string): Promise<Product> {
    return this.send<Product>('GET', `/products/${id}`);
  }

  /** First product that can be ordered (in stock, not a rental). */
  async firstOrderable(): Promise<Product> {
    const { data } = await this.list();
    const product = data.find((p) => p.in_stock && !p.is_rental);
    if (!product) {
      throw new Error('No in-stock, non-rental product found on the first page of the catalog.');
    }
    return product;
  }
}
