import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { ProductReferences } from '@api/reference-api';
import type { ProductDraft } from '@data/builders';
import { AdminListPage } from './admin-list-page';

export class AdminProductsPage extends AdminListPage {
  private readonly addButton: Locator;

  constructor(page: Page) {
    super(page, '/admin/products', 'product');
    this.addButton = page.getByTestId('product-add');
  }

  async openAddForm(): Promise<void> {
    await test.step('Open the add-product form', async () => {
      await this.addButton.click();
    });
  }

  async openEditForm(name: string): Promise<void> {
    await test.step(`Open the edit form for "${name}"`, async () => {
      await this.row(name).locator('[data-test^="product-edit-"]').click();
    });
  }

  async deleteProduct(name: string): Promise<void> {
    await test.step(`Delete product "${name}"`, async () => {
      await this.row(name).locator('[data-test^="product-delete-"]').click();
    });
  }
}

export class ProductFormPage {
  readonly saved: Locator;
  readonly errors: Locator;
  readonly name: Locator;
  readonly stock: Locator;
  readonly brand: Locator;
  readonly category: Locator;
  readonly image: Locator;
  private readonly description: Locator;
  private readonly price: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    this.name = page.getByTestId('name');
    this.description = page.getByTestId('description');
    this.stock = page.getByTestId('stock');
    this.price = page.getByTestId('price');
    this.brand = page.getByTestId('brand-id');
    this.category = page.getByTestId('category-id');
    this.image = page.getByTestId('product-image-id');
    this.submitButton = page.getByTestId('product-submit');
    this.saved = page.locator('.alert-success');
    this.errors = page.locator('.alert-danger');
  }

  /** The edit form fills itself from the server; wait for that before changing anything. */
  async waitForExistingName(name: string): Promise<void> {
    await expect(this.name).toHaveValue(name);
  }

  async fill(draft: ProductDraft, references: ProductReferences): Promise<void> {
    await test.step(`Fill the product form (${draft.name})`, async () => {
      await this.name.fill(draft.name);
      await this.description.fill(draft.description);
      await this.stock.fill(String(draft.stock));
      await this.price.fill(String(draft.price));
      await this.brand.selectOption({ label: references.brand.name });
      await this.category.selectOption({ label: references.category.name });
      await this.image.selectOption({ label: references.image.title });
    });
  }

  async setStock(stock: number): Promise<void> {
    await test.step(`Set the stock to ${stock}`, async () => {
      await this.stock.fill(String(stock));
    });
  }

  async setPrice(price: number): Promise<void> {
    await test.step(`Set the price to ${price}`, async () => {
      await this.price.fill(String(price));
    });
  }

  async submit(): Promise<void> {
    await test.step('Save the product', async () => {
      await this.submitButton.click();
    });
  }
}
