import { expect, test } from '@fixtures/app.fixture';
import { Tags } from '@utils/tags';

test.describe('Catalog pagination API', () => {
  test(
    'consecutive pages do not repeat products',
    { tag: [Tags.regression, Tags.api] },
    async ({ productsApi }) => {
      const first = await productsApi.list({ page: 1 });
      const second = await productsApi.list({ page: 2 });

      const firstIds = new Set(first.data.map((p) => p.id));
      expect(second.data.length).toBeGreaterThan(0);
      expect(second.data.filter((p) => firstIds.has(p.id))).toHaveLength(0);
    },
  );

  test('every page but the last is full', { tag: [Tags.regression, Tags.api] }, async ({ productsApi }) => {
    const first = await productsApi.list({ page: 1 });
    expect(first.last_page).toBeGreaterThan(1);

    expect(first.data).toHaveLength(first.per_page);
  });

  test(
    'the last page holds the remaining products',
    { tag: [Tags.regression, Tags.api] },
    async ({ productsApi }) => {
      const first = await productsApi.list({ page: 1 });
      const remaining = first.total - (first.last_page - 1) * first.per_page;

      const last = await productsApi.list({ page: first.last_page });

      expect(last.data).toHaveLength(remaining);
    },
  );

  test('a page beyond the last is empty', { tag: [Tags.regression, Tags.api] }, async ({ productsApi }) => {
    const first = await productsApi.list({ page: 1 });

    const beyond = await productsApi.list({ page: first.last_page + 1 });

    expect(beyond.data).toHaveLength(0);
  });
});
