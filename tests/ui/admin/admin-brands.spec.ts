import { expect, test } from '@fixtures/app.fixture';
import { requirement } from '@utils/requirements';
import { Tags } from '@utils/tags';

test.describe('Admin brands', { tag: [...requirement('REQ-ADM-001')] }, () => {
  test(
    'an admin can create a brand',
    { tag: [Tags.smoke, Tags.ui] },
    async ({ adminBrandsPage, brandForm, newBrand, brandsApi }) => {
      await adminBrandsPage.goto();
      await adminBrandsPage.openAddForm();
      await brandForm.fill(newBrand);
      await brandForm.submit();

      await expect(brandForm.saved).toBeVisible();
      await expect.poll(() => brandsApi.findByName(newBrand.name)).toMatchObject({ slug: newBrand.slug });
    },
  );

  test(
    'an admin can delete a brand',
    { tag: [Tags.regression, Tags.ui] },
    async ({ adminBrandsPage, seededBrand, brandsApi }) => {
      await adminBrandsPage.goto();
      await adminBrandsPage.search(seededBrand.name);
      await adminBrandsPage.deleteBrand(seededBrand.name);

      await expect.poll(() => brandsApi.findByName(seededBrand.name)).toBeUndefined();
    },
  );

  test(
    'a deleted brand disappears from the admin list',
    { tag: [Tags.regression, Tags.ui, Tags.knownIssue] },
    async ({ adminBrandsPage, seededBrand }) => {
      test.fail(
        true,
        'Known application issue: brand search results are cached for an hour and the cache is not cleared when ' +
          'a brand is deleted, so the admin list keeps showing it.',
      );

      await adminBrandsPage.goto();
      await adminBrandsPage.search(seededBrand.name);
      await adminBrandsPage.deleteBrand(seededBrand.name);

      await expect(adminBrandsPage.row(seededBrand.name)).toHaveCount(0);
    },
  );

  test(
    'an admin can rename a brand',
    { tag: [Tags.regression, Tags.ui] },
    async ({ adminBrandsPage, brandForm, seededBrand, brandsApi }) => {
      const renamed = `${seededBrand.name} renamed`;

      await adminBrandsPage.goto();
      await adminBrandsPage.search(seededBrand.name);
      await adminBrandsPage.openEditForm(seededBrand.name);
      await brandForm.waitForExistingName(seededBrand.name);
      await brandForm.fill({ name: renamed });
      await brandForm.submit();

      await expect(brandForm.saved).toBeVisible();
      await expect.poll(() => brandsApi.findByName(renamed)).toBeDefined();
    },
  );

  test(
    'a brand cannot be saved without a slug',
    { tag: [Tags.regression, Tags.ui] },
    async ({ adminBrandsPage, brandForm, newBrand, brandsApi }) => {
      await adminBrandsPage.goto();
      await adminBrandsPage.openAddForm();
      await brandForm.fill({ name: newBrand.name });
      await brandForm.submit();

      await expect(brandForm.slugError).toBeVisible();
      expect(await brandsApi.findByName(newBrand.name)).toBeUndefined();
    },
  );
});
