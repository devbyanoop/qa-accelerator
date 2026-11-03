import type { APIRequestContext } from '@playwright/test';
import { BaseApiClient } from './base-api-client';

export interface PostcodeLookupResult {
  street: string;
  house_number: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
}

/** The application's address lookup, which also decides which billing addresses it accepts. */
export class PostcodeApi extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  lookup(country: string, postcode: string, houseNumber: string): Promise<PostcodeLookupResult> {
    return this.send<PostcodeLookupResult>('GET', '/postcode-lookup', {
      params: { country, postcode, house_number: houseNumber },
    });
  }
}
