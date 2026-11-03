import type { APIRequestContext } from '@playwright/test';
import type { UserDraft } from '@data/builders';
import { BaseApiClient } from './base-api-client';
import { bearer } from './bearer';
import type { Page } from './types';

export interface UserRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export class UsersApi extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  /** Registers a user, the same call the admin form makes. */
  create(draft: UserDraft): Promise<UserRecord> {
    return this.send<UserRecord>('POST', '/users/register', {
      data: {
        first_name: draft.firstName,
        last_name: draft.lastName,
        dob: draft.dob,
        phone: draft.phone,
        email: draft.email,
        password: draft.password,
        address: {
          street: draft.street,
          city: draft.city,
          state: draft.state,
          country: draft.country,
          postal_code: draft.postalCode,
        },
      },
    });
  }

  async findByEmail(adminToken: string, email: string): Promise<UserRecord | undefined> {
    const result = await this.send<Page<UserRecord>>('GET', '/users', {
      headers: bearer(adminToken),
      params: { q: email },
    });
    return result.data.find((user) => user.email === email);
  }

  /** Deletes a user; a user that is already gone is not an error. */
  async delete(adminToken: string, id: string): Promise<void> {
    await this.send<void>('DELETE', `/users/${id}`, {
      headers: bearer(adminToken),
      expectedStatus: [204, 404],
    });
  }

  async deleteByEmail(adminToken: string, email: string): Promise<void> {
    const user = await this.findByEmail(adminToken, email);
    if (user) {
      await this.delete(adminToken, user.id);
    }
  }
}
