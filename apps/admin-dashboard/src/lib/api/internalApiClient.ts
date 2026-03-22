/**
 * Internal API Client -- SERVER-SIDE ONLY
 *
 * This module MUST NOT be imported in 'use client' components.
 * It is designed to be used only in Server Components and Route Handlers.
 *
 * SECURITY: The internal API URL is a server-side secret. It should NEVER be
 * exposed to the browser. Do NOT prefix with NEXT_PUBLIC_.
 *
 * For browser-side calls, use the /api/admin/proxy route handler instead.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse, ApiError } from '../types/api';

// Internal API URL — server-side only, never exposed to the browser
// In production, this should be an internal network address (e.g., Docker service name)
const DEFAULT_BASE_URL = process.env.INTERNAL_API_URL || 'http://localhost:3001';
const DEFAULT_TIMEOUT = 30000;

// =============================================================================
// Server-Side Guard
// =============================================================================

/**
 * Runtime guard: this module must only be imported server-side.
 * Browsers must NOT have access to the internal API URL.
 */
function assertServerSide(): void {
  if (typeof window !== 'undefined') {
    // Browser detected — this is a critical security error
    throw new Error(
      'SECURITY VIOLATION: internalApiClient.ts must not be imported in browser code. ' +
        'Use the /api/admin/proxy route for browser-to-internal-API communication.'
    );
  }
}

/**
 * Create axios instance with default config
 */
function createApiClient(baseURL: string = DEFAULT_BASE_URL): AxiosInstance {
  assertServerSide();
  const client = axios.create({
    baseURL,
    timeout: DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      // Add correlation ID if not present
      if (!config.headers['X-Correlation-ID']) {
        config.headers['X-Correlation-ID'] = `fe_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor — never log URL/path (they may contain internal hostnames)
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        // Server responded with error — log status only, never the URL
        console.error(`API Error: HTTP ${error.response.status}`);
      } else if (error.request) {
        // Request made but no response — log nothing to avoid leaking internal host
        console.error('API Error: No response received');
      } else {
        // Error in request setup
        console.error('API Error: Request setup failed');
      }
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * API Client class for internal dashboard APIs
 */
export class InternalApiClient {
  private client: AxiosInstance;

  constructor(baseURL?: string) {
    this.client = createApiClient(baseURL);
  }

  /**
   * Set authorization token
   */
  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authorization token
   */
  clearAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  /**
   * Make GET request
   */
  async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client.get(url, config);
      return this.normalizeResponse(response);
    } catch (error) {
      return this.normalizeError(error);
    }
  }

  /**
   * Make POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client.post(url, data, config);
      return this.normalizeResponse(response);
    } catch (error) {
      return this.normalizeError(error);
    }
  }

  /**
   * Make PUT request
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client.put(url, data, config);
      return this.normalizeResponse(response);
    } catch (error) {
      return this.normalizeError(error);
    }
  }

  /**
   * Make DELETE request
   */
  async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client.delete(url, config);
      return this.normalizeResponse(response);
    } catch (error) {
      return this.normalizeError(error);
    }
  }

  /**
   * Normalize successful response
   */
  private normalizeResponse<T>(response: AxiosResponse<ApiResponse<T>>): ApiResponse<T> {
    return response.data;
  }

  /**
   * Normalize error response
   */
  private normalizeError<T>(error: unknown): ApiResponse<T> {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error
        return {
          ok: false,
          status: 'error',
          error: {
            code: `HTTP_${error.response.status}`,
            message: error.response.data?.error?.message || error.message,
            details: error.response.data?.error?.details,
          },
          timestamp: new Date().toISOString(),
          correlationId: error.response.headers['x-correlation-id'] || '',
        };
      } else if (error.request) {
        // No response received
        return {
          ok: false,
          status: 'error',
          error: {
            code: 'NETWORK_ERROR',
            message: 'Unable to reach the server. Please check your connection.',
          },
          timestamp: new Date().toISOString(),
          correlationId: '',
        };
      }
    }

    // Unknown error
    return {
      ok: false,
      status: 'error',
      error: {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
      correlationId: '',
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let apiClientInstance: InternalApiClient | null = null;

export function getApiClient(): InternalApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new InternalApiClient();
  }
  return apiClientInstance;
}

export default InternalApiClient;
