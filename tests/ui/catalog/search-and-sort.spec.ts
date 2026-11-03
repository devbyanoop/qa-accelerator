import { expect, test } from '@fixtures/app.fixture';
import { isSortedAscending, isSortedDescending } from '@utils/sorting';
import { Tags } from '@utils/tags';

test.describe('Catalog', () => {
  test('products are shown on the landing page', { tag: [Tags.smoke, Tags.ui] }, async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.productCards.first()).toBeVisible();
  });

  test(
    'search narrows the list to matching products',
    { tag: [Tags.regression, Tags.ui] },
    async ({ homePage, productsApi }) => {
      const [first] = (await productsApi.list()).data;
      const term = first!.name.split(' ')[0]!.toLowerCase();

      await homePage.goto();
      await homePage.search(term);

      await expect
        .poll(async () => (await homePage.productNames()).every((name) => name.toLowerCase().includes(term)))
        .toBe(true);
      expect(await homePage.productNames()).toContain(first!.name);
    },
  );

  test(
    'sorting by price ascending orders the visible products',
    { tag: [Tags.regression, Tags.ui] },
    async ({ homePage }) => {
      await homePage.goto();
      await homePage.sortBy('price,asc');

      await expect.poll(async () => isSortedAscending(await homePage.productPrices())).toBe(true);
    },
  );

  test(
    'sorting by price descending orders the visible products',
    { tag: [Tags.regression, Tags.ui] },
    async ({ homePage }) => {
      await homePage.goto();
      await homePage.sortBy('price,desc');

      await expect.poll(async () => isSortedDescending(await homePage.productPrices())).toBe(true);
    },
  );
});
