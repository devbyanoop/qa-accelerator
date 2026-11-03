import { credentialsFor } from '@config/env';
import { expect, test } from '@fixtures/app.fixture';
import { Tags } from '@utils/tags';

test.describe('Auth API', () => {
  test('valid credentials return a bearer token', { tag: [Tags.smoke, Tags.api] }, async ({ authApi }) => {
    const { email, password } = credentialsFor('customer');

    const response = await authApi.login(email, password);

    expect(response.token_type).toBe('bearer');
    expect(response.access_token).toBeTruthy();
    expect(response.expires_in).toBeGreaterThan(0);
  });

  test('a wrong password is rejected with 401', { tag: [Tags.regression, Tags.api] }, async ({ authApi }) => {
    const { email } = credentialsFor('customer');

    expect(await authApi.loginStatus(email, 'not-the-password')).toBe(401);
  });
});
