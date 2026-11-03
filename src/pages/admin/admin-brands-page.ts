import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { AdminListPage } from './admin-list-page';

export class AdminBrandsPage extends AdminListPage {
  private readonly addButton: Locator;

  constructor(page: Page) {
    super(page, '/admin/brands', 'brand');
    this.addButton = page.getByTestId('brand-add');
  }

  async openAddForm(): Promise<void> {
    await test.step('Open the add-brand form', async () => {
      await this.addButton.click();
    });
  }

  async openEditForm(name: string): Promise<void> {
    await test.step(`Open the edit form for "${name}"`, async () => {
      await this.row(name).locator('[data-test$="-edit"]').click();
    });
  }

  async deleteBrand(name: string): Promise<void> {
    await test.step(`Delete brand "${name}"`, async () => {
      await this.row(name).locator('[data-test$="-delete"]').click();
    });
  }
}

export class BrandFormPage {
  readonly saved: Locator;
  readonly slugError: Locator;
  readonly name: Locator;
  private readonly slug: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    this.name = page.getByTestId('name');
    this.slug = page.getByTestId('slug');
    this.submitButton = page.getByTestId('brand-submit');
    this.saved = page.getByTestId('brand-saved');
    this.slugError = page.getByTestId('slug-error');
  }

  /** The edit form fills itself from the server; wait for that before changing anything. */
  async waitForExistingName(name: string): Promise<void> {
    await expect(this.name).toHaveValue(name);
  }

  async fill(brand: { name: string; slug?: string }): Promise<void> {
    await test.step(`Fill the brand form (${brand.name})`, async () => {
      await this.name.fill(brand.name);
      if (brand.slug !== undefined) {
        await this.slug.fill(brand.slug);
      }
    });
  }

  async submit(): Promise<void> {
    await test.step('Save the brand', async () => {
      await this.submitButton.click();
    });
  }
}
