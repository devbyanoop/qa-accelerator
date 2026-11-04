import { expect, test } from '@fixtures/app.fixture';
import { requirement } from '@utils/requirements';
import { Tags } from '@utils/tags';

test.describe('Catalog pagination API', { tag: [...requirement('REQ-CAT-002')] }, () => {
  test(
    'consecutive pages do not repeat products',
    { tag: [Tags.regression, Tags.api] },
    async ({ productsApi }) => {
      // A product added between the two requests can shift items across the page boundary, so retry briefly.
      await expect
        .poll(async () => {
          const first = await productsApi.list({ page: 1 });
          const second = await productsApi.list({ page: 2 });
          const firstIds = new Set(first.data.map((p) => p.id));
          return second.data.length > 0 ? second.data.filter((p) => firstIds.has(p.id)).length : -1;
        })
        .toBe(0);
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
      // Other tests add and remove products, so each attempt checks one consistent pair of responses.
      await expect
        .poll(async () => {
          const first = await productsApi.list({ page: 1 });
          const last = await productsApi.list({ page: first.last_page });
          if (last.current_page !== last.last_page) return 'the number of pages changed while checking';
          const remaining = last.total - (last.last_page - 1) * last.per_page;
          return last.data.length === remaining
            ? 'consistent'
            : `last page has ${last.data.length}, expected ${remaining}`;
        })
        .toBe('consistent');
    },
  );

  test('a page beyond the last is empty', { tag: [Tags.regression, Tags.api] }, async ({ productsApi }) => {
    await expect
      .poll(async () => {
        const first = await productsApi.list({ page: 1 });
        const beyond = await productsApi.list({ page: first.last_page + 1 });
        return beyond.current_page > beyond.last_page
          ? beyond.data.length
          : 'the number of pages changed while checking';
      })
      .toBe(0);
  });
});
