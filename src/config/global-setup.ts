import { request } from '@playwright/test';
import { AuthApi } from '../api/auth-api';
import { ProductsApi } from '../api/products-api';
import { ReferenceDataApi } from '../api/reference-api';
import { credentialsFor, env } from './env';

/**
 * Runs once before the whole suite. Makes sure the shared product that order tests use exists, whether the
 * application was just seeded (CI) or has been used before (a developer's machine).
 */
export default async function globalSetup(): Promise<void> {
  const api = await request.newContext({
    baseURL: env.apiUrl,
    extraHTTPHeaders: { Accept: 'application/json' },
  });
  try {
    const { email, password } = credentialsFor('admin');
    const { access_token } = await new AuthApi(api).login(email, password);
    const references = await new ReferenceDataApi(api).productReferences();
    await new ProductsApi(api).ensureOrderable(access_token, references);
  } finally {
    await api.dispose();
  }
}
