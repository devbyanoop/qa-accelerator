import dotenv from 'dotenv';
import path from 'node:path';

/**
 * Environment profile selection.
 *
 *   TEST_ENV=qa npx playwright test   ->   loads .env.qa
 *
 * Defaults to "local" (.env.local, which is gitignored). Real environment variables
 * always win over file values, so CI and secret vaults can inject anything.
 */
export const targetEnv = process.env.TEST_ENV ?? 'local';

dotenv.config({ path: path.resolve(process.cwd(), `.env.${targetEnv}`) });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable "${name}" (TEST_ENV=${targetEnv}).`);
  }
  return value;
}

export type Role = 'admin' | 'customer';

export const env = {
  name: targetEnv,
  isCI: Boolean(process.env.CI),
  uiUrl: required('UI_URL', 'http://localhost:4200'),
  apiUrl: required('API_URL', 'http://localhost:8091'),
  /** Optional cap on parallel workers, e.g. for a slow or shared environment. */
  workers: process.env.WORKERS ? Number(process.env.WORKERS) : undefined,
} as const;

/** Credentials are resolved lazily so a run that never logs in does not need them. */
export function credentialsFor(role: Role): { email: string; password: string } {
  const prefix = role.toUpperCase();
  return {
    email: required(`${prefix}_EMAIL`),
    password: required(`${prefix}_PASSWORD`),
  };
}
