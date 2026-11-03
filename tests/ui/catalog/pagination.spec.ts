import { expect, test } from '@fixtures/app.fixture';
import { Tags } from '@utils/tags';

test.describe('Catalog pagination', () => {
  test('the pager starts on page 1', { tag: [Tags.smoke, Tags.ui] }, async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.activePage).toHaveText('1');
  });

  test(
    'the next page shows different products',
    { tag: [Tags.regression, Tags.ui] },
    async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productCards.first()).toBeVisible();
      const firstPage = await homePage.productNames();

      await homePage.nextPage();

      await expect(homePage.activePage).toHaveText('2');
      await expect.poll(async () => (await homePage.productNames())[0]).not.toBe(firstPage[0]);
      const secondPage = await homePage.productNames();
      expect(secondPage.filter((name) => firstPage.includes(name))).toHaveLength(0);
    },
  );

  test('previous returns to the first page', { tag: [Tags.regression, Tags.ui] }, async ({ homePage }) => {
    await homePage.goto();

    await homePage.nextPage();
    await expect(homePage.activePage).toHaveText('2');
    await homePage.previousPage();

    await expect(homePage.activePage).toHaveText('1');
  });

  test(
    'the last page shows the remaining products',
    { tag: [Tags.regression, Tags.ui] },
    async ({ homePage }) => {
      // The page applies its own filters, so take the page count from the listing it actually loaded.
      const { lastPage } = await homePage.gotoAndReadPaging();

      // Other tests add and remove products while this one runs, so compare the cards with what the server
      // returned for this very page instead of with a total read earlier.
      const listing = await homePage.goToPageAndReadListing(lastPage);

      expect(listing.productCount).toBeGreaterThan(0);
      await expect(homePage.activePage).toHaveText(String(listing.currentPage));
      await expect(homePage.productCards).toHaveCount(listing.productCount);
    },
  );
});
