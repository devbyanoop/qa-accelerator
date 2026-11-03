import type { APIRequestContext } from '@playwright/test';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  data?: unknown;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  /** Accepted status code(s). Defaults to any 2xx used for success. */
  expectedStatus?: number | number[];
}

const DEFAULT_SUCCESS = [200, 201, 202, 204];

/**
 * Thin typed wrapper over Playwright's APIRequestContext.
 * Domain clients (orders, users, ...) extend this and expose business-level methods.
 */
export abstract class BaseApiClient {
  protected constructor(protected readonly request: APIRequestContext) {}

  protected async send<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.request.fetch(path, {
      method,
      data: options.data,
      params: options.params,
      headers: options.headers,
    });

    const expected =
      options.expectedStatus === undefined
        ? DEFAULT_SUCCESS
        : Array.isArray(options.expectedStatus)
          ? options.expectedStatus
          : [options.expectedStatus];

    if (!expected.includes(response.status())) {
      throw new Error(`${method} ${path} returned ${response.status()}: ${await response.text()}`);
    }
    if (response.status() === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }
}
