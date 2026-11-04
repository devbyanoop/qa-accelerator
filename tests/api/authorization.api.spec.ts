import { expect, test } from '@fixtures/app.fixture';
import { requirement } from '@utils/requirements';
import { Tags } from '@utils/tags';

/** Endpoints that only an admin may call. */
const adminOnlyEndpoints = ['/users', '/reports/total-sales-per-country'];

test.describe('Access control', { tag: [...requirement('REQ-SEC-001')] }, () => {
  for (const path of adminOnlyEndpoints) {
    const tag = path === '/users' ? Tags.smoke : Tags.regression;

    test.describe(`GET ${path}`, () => {
      test('is refused to an anonymous caller (401)', { tag: [tag, Tags.api] }, async ({ accessApi }) => {
        expect(await accessApi.statusFor(path)).toBe(401);
      });

      test(
        'is refused to a customer (403)',
        { tag: [tag, Tags.api] },
        async ({ accessApi, customerToken }) => {
          expect(await accessApi.statusFor(path, customerToken)).toBe(403);
        },
      );

      test('is allowed for an admin (200)', { tag: [tag, Tags.api] }, async ({ accessApi, adminToken }) => {
        expect(await accessApi.statusFor(path, adminToken)).toBe(200);
      });
    });
  }
});
