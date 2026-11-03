import type { APIRequestContext } from '@playwright/test';
import type { ProductDraft } from '@data/builders';
import { BaseApiClient } from './base-api-client';
import { bearer } from './bearer';
import type { ProductReferences } from './reference-api';
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

  async findByName(name: string): Promise<Product | undefined> {
    return (await this.list({ q: name })).data.find((product) => product.name === name);
  }

  create(adminToken: string, draft: ProductDraft, references: ProductReferences): Promise<Product> {
    return this.send<Product>('POST', '/products', {
      headers: bearer(adminToken),
      data: {
        name: draft.name,
        description: draft.description,
        price: draft.price,
        stock: draft.stock,
        brand_id: references.brand.id,
        category_id: references.category.id,
        product_image_id: references.image.id,
        is_location_offer: false,
        is_rental: false,
      },
    });
  }

  /** Deletes a product; a product that is already gone is not an error. */
  async delete(adminToken: string, id: string): Promise<void> {
    await this.send<void>('DELETE', `/products/${id}`, {
      headers: bearer(adminToken),
      expectedStatus: [204, 404],
    });
  }

  async deleteByName(adminToken: string, name: string): Promise<void> {
    const product = await this.findByName(name);
    if (product) {
      await this.delete(adminToken, product.id);
    }
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
