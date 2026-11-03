import type { APIRequestContext } from '@playwright/test';
import { BaseApiClient } from './base-api-client';
import { bearer } from './bearer';

/** Probes which HTTP status an endpoint returns for a given caller, for access-control tests. */
export class AccessApi extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  /** GET status for a path; pass no token to call as an anonymous visitor. */
  async statusFor(path: string, token?: string): Promise<number> {
    const response = await this.request.get(path, { headers: token ? bearer(token) : undefined });
    return response.status();
  }
}
