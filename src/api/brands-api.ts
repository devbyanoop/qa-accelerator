import type { APIRequestContext } from '@playwright/test';
import { BaseApiClient } from './base-api-client';
import { bearer } from './bearer';

export interface Brand {
  id: string;
  name: string;
  slug: string;
}

export class BrandsApi extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  list(): Promise<Brand[]> {
    return this.send<Brand[]>('GET', '/brands');
  }

  async findByName(name: string): Promise<Brand | undefined> {
    return (await this.list()).find((brand) => brand.name === name);
  }

  create(adminToken: string, name: string, slug: string): Promise<Brand> {
    return this.send<Brand>('POST', '/brands', { data: { name, slug }, headers: bearer(adminToken) });
  }

  /** Deletes a brand; a brand that is already gone is not an error. */
  async delete(adminToken: string, id: string): Promise<void> {
    await this.send<void>('DELETE', `/brands/${id}`, {
      headers: bearer(adminToken),
      expectedStatus: [204, 404],
    });
  }

  /** Slugs survive a rename, so this finds a test's brand whatever its name has become. */
  async deleteBySlug(adminToken: string, slug: string): Promise<void> {
    const brand = (await this.list()).find((b) => b.slug === slug);
    if (brand) {
      await this.delete(adminToken, brand.id);
    }
  }
}
