import { expect, test } from '@fixtures/app.fixture';
import { isSortedAscending } from '@utils/sorting';
import { requirement } from '@utils/requirements';
import { Tags } from '@utils/tags';

test.describe('Products API', { tag: [...requirement('REQ-CAT-001')] }, () => {
  test(
    'lists products with pagination metadata',
    { tag: [Tags.smoke, Tags.api] },
    async ({ productsApi }) => {
      const page = await productsApi.list();

      expect(page.current_page).toBe(1);
      expect(page.data.length).toBeGreaterThan(0);
      expect(page.data.length).toBeLessThanOrEqual(page.per_page);
      expect(page.total).toBeGreaterThanOrEqual(page.data.length);
    },
  );

  test('returns a single product by id', { tag: [Tags.regression, Tags.api] }, async ({ productsApi }) => {
    const [first] = (await productsApi.list()).data;

    const product = await productsApi.getById(first!.id);

    expect(product.id).toBe(first!.id);
    expect(product.name).toBe(first!.name);
  });

  test(
    'search finds a product by a word from its name',
    { tag: [Tags.regression, Tags.api] },
    async ({ productsApi }) => {
      const [first] = (await productsApi.list()).data;
      const term = first!.name.split(' ')[0]!;

      const result = await productsApi.list({ q: term });

      expect(result.data.map((p) => p.id)).toContain(first!.id);
    },
  );

  test(
    'sorting by price ascending orders the results',
    { tag: [Tags.regression, Tags.api] },
    async ({ productsApi }) => {
      const { data } = await productsApi.list({ sort: 'price,asc' });

      expect(isSortedAscending(data.map((p) => p.price))).toBe(true);
    },
  );
});
