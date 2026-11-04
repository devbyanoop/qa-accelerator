import { credentialsFor } from '@config/env';
import { expect, test } from '@fixtures/app.fixture';
import { shapeProblems } from '@utils/contract';
import type { FieldType } from '@utils/contract';
import { requirement } from '@utils/requirements';
import { Tags } from '@utils/tags';

// What the front end and the other tests rely on. A renamed field or a changed type should fail here, with a
// message that says which one, before it shows up as a confusing failure somewhere else.
const productShape: Record<string, FieldType> = {
  id: 'string',
  name: 'string',
  description: 'string',
  price: 'number',
  in_stock: 'boolean',
  is_rental: 'boolean',
  is_eco_friendly: 'boolean',
};

const pageShape: Record<string, FieldType> = {
  current_page: 'number',
  per_page: 'number',
  last_page: 'number',
  total: 'number',
  data: 'array',
};

test.describe('API contract', { tag: [...requirement('REQ-API-001')] }, () => {
  test(
    'a product list matches the expected shape',
    { tag: [Tags.regression, Tags.api] },
    async ({ productsApi }) => {
      const page = await productsApi.list();

      expect(shapeProblems(page, pageShape)).toEqual([]);
      expect(shapeProblems(page.data[0], productShape)).toEqual([]);
    },
  );

  test(
    'a single product matches the expected shape',
    { tag: [Tags.regression, Tags.api] },
    async ({ productsApi }) => {
      const [first] = (await productsApi.list()).data;

      expect(shapeProblems(await productsApi.getById(first!.id), productShape)).toEqual([]);
    },
  );

  test(
    'the login response matches the expected shape',
    { tag: [Tags.regression, Tags.api] },
    async ({ authApi }) => {
      const { email, password } = credentialsFor('customer');

      const response = await authApi.login(email, password);

      expect(
        shapeProblems(response, { access_token: 'string', token_type: 'string', expires_in: 'number' }),
      ).toEqual([]);
    },
  );
});
