import { randomBytes } from 'node:crypto';

/** Test-data builders. Every call returns values that are unique, so tests never collide with each other. */

function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
}

export interface BrandDraft {
  name: string;
  slug: string;
}

export function buildBrand(): BrandDraft {
  const suffix = uniqueSuffix();
  return { name: `QA Brand ${suffix}`, slug: `qa-brand-${suffix}` };
}

export interface ProductDraft {
  name: string;
  description: string;
  price: number;
  stock: number;
}

/**
 * Product names avoid words shorter than three letters: the application's full-text search ignores them,
 * so a name such as "QA Widget" can never be found through the admin search.
 */
export function buildProduct(): ProductDraft {
  return {
    name: `Gadget Probe ${uniqueSuffix()}`,
    description: 'Created by an automated test',
    price: 19.95,
    stock: 7,
  };
}

export interface UserDraft {
  firstName: string;
  lastName: string;
  dob: string;
  street: string;
  postalCode: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  password: string;
}

/** The password is random: the application rejects passwords that appear in known data leaks. */
export function buildUser(): UserDraft {
  const suffix = uniqueSuffix();
  return {
    firstName: 'Qa',
    lastName: `User${suffix}`,
    dob: '1990-01-15',
    street: 'Test street 1',
    postalCode: '1010',
    city: 'Vienna',
    state: 'Vienna',
    country: 'AT',
    phone: '0123456789',
    email: `qa.user.${suffix}@example.com`,
    password: `${randomBytes(12).toString('base64url')}aA1!`,
  };
}
