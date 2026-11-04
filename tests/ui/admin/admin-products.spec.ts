import { expect, test } from '@fixtures/app.fixture';
import { requirement } from '@utils/requirements';
import { Tags } from '@utils/tags';

test.describe('Admin products', { tag: [...requirement('REQ-ADM-001')] }, () => {
  test(
    'an admin can create a product',
    { tag: [Tags.smoke, Tags.ui] },
    async ({ adminProductsPage, productForm, newProduct, productReferences, productsApi }) => {
      await adminProductsPage.goto();
      await adminProductsPage.openAddForm();
      await productForm.fill(newProduct, productReferences);
      await productForm.submit();

      await expect(productForm.saved).toBeVisible();
      await expect
        .poll(() => productsApi.findByName(newProduct.name))
        .toMatchObject({ name: newProduct.name });
    },
  );

  test(
    'an admin can change a product price',
    { tag: [Tags.regression, Tags.ui] },
    async ({ adminProductsPage, productForm, seededProduct, newProduct, productReferences, productsApi }) => {
      const newPrice = 24.5;

      await adminProductsPage.goto();
      await adminProductsPage.search(seededProduct.name);
      await adminProductsPage.openEditForm(seededProduct.name);
      await productForm.waitForExistingName(seededProduct.name);
      // The edit form does not pre-fill stock, brand, category or image (see the next test), so, like a real
      // admin, the test has to enter them again before the form can be saved.
      await productForm.fill(newProduct, productReferences);
      await productForm.setPrice(newPrice);
      await productForm.submit();

      await expect(productForm.saved).toBeVisible();
      await expect.poll(async () => (await productsApi.getById(seededProduct.id)).price).toBe(newPrice);
    },
  );

  test(
    'the edit form shows the product current stock, brand, category and image',
    { tag: [Tags.regression, Tags.ui, Tags.knownIssue] },
    async ({ adminProductsPage, productForm, seededProduct, newProduct, productReferences }) => {
      test.fail(
        true,
        'Known application issue: the edit form pre-fills only name, description and price, so saving an edit ' +
          'means entering stock, brand, category and image again.',
      );

      await adminProductsPage.goto();
      await adminProductsPage.search(seededProduct.name);
      await adminProductsPage.openEditForm(seededProduct.name);
      await productForm.waitForExistingName(seededProduct.name);

      await expect.soft(productForm.stock).toHaveValue(String(newProduct.stock));
      await expect.soft(productForm.brand).toHaveValue(productReferences.brand.id);
      await expect.soft(productForm.category).toHaveValue(productReferences.category.id);
      await expect.soft(productForm.image).toHaveValue(productReferences.image.id);
    },
  );

  test(
    'an admin can delete a product',
    { tag: [Tags.regression, Tags.ui] },
    async ({ adminProductsPage, seededProduct, productsApi }) => {
      await adminProductsPage.goto();
      await adminProductsPage.search(seededProduct.name);
      await adminProductsPage.deleteProduct(seededProduct.name);

      await expect.poll(() => productsApi.findByName(seededProduct.name)).toBeUndefined();
    },
  );

  test(
    'a product cannot be saved without its required fields',
    { tag: [Tags.regression, Tags.ui] },
    async ({ adminProductsPage, productForm }) => {
      await adminProductsPage.goto();
      await adminProductsPage.openAddForm();
      await productForm.submit();

      await expect(productForm.errors.first()).toBeVisible();
      await expect(productForm.saved).toHaveCount(0);
    },
  );
});
