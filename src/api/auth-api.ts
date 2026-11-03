import type { APIRequestContext } from '@playwright/test';
import { BaseApiClient } from './base-api-client';
import type { LoginResponse } from './types';

export class AuthApi extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  /** Logs in and returns the bearer token response. Fails on any non-2xx status. */
  login(email: string, password: string): Promise<LoginResponse> {
    return this.send<LoginResponse>('POST', '/users/login', { data: { email, password } });
  }

  /** Raw login for negative tests: returns the HTTP status instead of throwing. */
  async loginStatus(email: string, password: string): Promise<number> {
    const response = await this.request.post('/users/login', { data: { email, password } });
    return response.status();
  }
}
