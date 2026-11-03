import type { APIRequestContext } from '@playwright/test';
import { BaseApiClient } from './base-api-client';

interface Named {
  id: string;
  name: string;
}

interface CategoryNode extends Named {
  sub_categories: Named[];
}

interface ImageRecord {
  id: string;
  title: string;
}

/** Existing records a new product must point at. */
export interface ProductReferences {
  brand: Named;
  category: Named;
  image: { id: string; title: string };
}

export class ReferenceDataApi extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  /** The first brand, sub-category and image the application offers. */
  async productReferences(): Promise<ProductReferences> {
    const [brands, categories, images] = await Promise.all([
      this.send<Named[]>('GET', '/brands'),
      this.send<CategoryNode[]>('GET', '/categories/tree'),
      this.send<ImageRecord[]>('GET', '/images'),
    ]);
    const brand = brands[0];
    const category = categories.flatMap((c) => c.sub_categories)[0];
    const image = images[0];
    if (!brand || !category || !image) {
      throw new Error('The application has no brand, sub-category or image to attach a product to.');
    }
    return { brand, category, image };
  }
}
