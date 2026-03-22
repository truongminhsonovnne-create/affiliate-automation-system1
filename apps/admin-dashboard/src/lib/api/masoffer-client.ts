/**
 * MasOffer API Client — SERVER-SIDE ONLY (admin dashboard Next.js)
 * ─────────────────────────────────────────────────────────────────
 * Wraps the MasOffer Publisher API with:
 *  - Bearer token auth via Authorization header + publisher_id query param
 *  - Safe error handling (never log the API token)
 *  - Correlation IDs for request tracing
 *  - Type-safe response normalization
 *
 * SECURITY:
 *  - This module MUST NOT be imported in 'use client' components.
 *  - The MASOFFER_API_TOKEN is a server-side secret.
 *  - Never return raw API tokens or auth headers to the browser.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  MasOfferCampaignsResponse,
  MasOfferDealsResponse,
  MasOfferVouchersResponse,
  MasOfferCouponsResponse,
  MasOfferConnectionTest,
} from './masoffer-types';

// =============================================================================
// Config
// =============================================================================

const MASOFFER_BASE_URL =
  (process.env.MASOFFER_API_URL as string | undefined) ??
  'https://publisher-api.masoffer.net';

const DEFAULT_TIMEOUT = 15_000;
const SYNC_TIMEOUT = 30_000;

function maskToken(token: string): string {
  if (!token || token.length <= 6) return '***';
  return `${token.slice(0, 3)}...${token.slice(-3)}`;
}

// =============================================================================
// Server-side guard
// =============================================================================

function assertServerSide(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      '[MasOffer] SECURITY: masoffer-client.ts must not be imported in browser code. ' +
        'Use the /api/admin/masoffer/ route handler instead.'
    );
  }
}

// =============================================================================
// Logging helpers — safe, no sensitive data
// =============================================================================

function logInfo(message: string, meta?: Record<string, unknown>): void {
  console.info(`[MasOffer] ${message}`, meta ?? '');
}

function logWarn(message: string, meta?: Record<string, unknown>): void {
  console.warn(`[MasOffer] ${message}`, meta ?? '');
}

function logError(message: string, meta?: Record<string, unknown>): void {
  const safe: Record<string, unknown> = {};
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      if (
        k.toLowerCase().includes('token') ||
        k.toLowerCase().includes('key') ||
        k.toLowerCase().includes('auth') ||
        k.toLowerCase().includes('secret') ||
        k.toLowerCase().includes('password')
      ) {
        safe[k] = '[REDACTED]';
      } else {
        safe[k] = v;
      }
    }
  }
  console.error(`[MasOffer] ${message}`, safe);
}

// =============================================================================
// Client factory
// =============================================================================

function createClient(timeout = DEFAULT_TIMEOUT): AxiosInstance {
  assertServerSide();

  const apiToken = process.env.MASOFFER_API_TOKEN;
  const publisherId = process.env.MASOFFER_PUBLISHER_ID;

  if (!apiToken || !publisherId) {
    logWarn('MASOFFER_API_TOKEN or MASOFFER_PUBLISHER_ID is not set');
  }

  const client = axios.create({
    baseURL: MASOFFER_BASE_URL,
    timeout,
    params: {
      publisher_id: publisherId,
    },
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: apiToken ? `Bearer ${apiToken}` : undefined,
    },
  });

  client.interceptors.request.use(
    (config) => {
      const corrId = `mo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      config.headers['X-Correlation-ID'] = corrId;

      logInfo('API request sent', {
        method: config.method?.toUpperCase(),
        url: config.url,
        corrId,
        hasAuth: Boolean(apiToken),
        authHeader: apiToken ? `Bearer ${maskToken(apiToken)}` : 'NONE',
      });

      return config;
    },
    (error) => {
      logError('Request setup error', { message: error.message });
      return Promise.reject(error);
    }
  );

  client.interceptors.response.use(
    (response) => {
      logInfo('API response received', {
        status: response.status,
        url: response.config.url,
        corrId: response.config.headers['X-Correlation-ID'],
      });
      return response;
    },
    (error: AxiosError) => {
      const corrId = (error.config?.headers?.['X-Correlation-ID'] as string | undefined) ?? 'unknown';

      const safeError: Record<string, unknown> = {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        corrId,
      };

      if (error.response) {
        safeError.responseData = error.response.data;
        logError('API error response', safeError);
      } else if (error.request) {
        safeError.code = error.code;
        safeError.message = error.message;
        logError('API network error (no response)', safeError);
      } else {
        logError('API request error', safeError);
      }

      return Promise.reject(error);
    }
  );

  return client;
}

// =============================================================================
// MasOffer Client
// =============================================================================

export class MasOfferClient {
  private client: AxiosInstance;
  private syncClient: AxiosInstance;
  private apiToken: string | undefined;
  private publisherId: string | undefined;

  constructor() {
    assertServerSide();
    this.apiToken = process.env.MASOFFER_API_TOKEN;
    this.publisherId = process.env.MASOFFER_PUBLISHER_ID;
    this.client = createClient(DEFAULT_TIMEOUT);
    this.syncClient = createClient(SYNC_TIMEOUT);
  }

  isConfigured(): boolean {
    return Boolean(
      this.apiToken && this.apiToken.length > 0 &&
      this.publisherId && this.publisherId.length > 0
    );
  }

  async testConnection(): Promise<MasOfferConnectionTest> {
    const start = Date.now();

    try {
      const response = await this.client.get<MasOfferCampaignsResponse>('/v1/campaigns', {
        params: { page: 1, limit: 1 },
      });

      return {
        success: true,
        response_time_ms: Date.now() - start,
        tested_at: new Date().toISOString(),
        campaign_count: response.data.pagination?.total,
      };
    } catch (err) {
      const axiosError = err as AxiosError;
      const status = axiosError.response?.status;
      const message = this.extractErrorMessage(err);

      logError('Connection test failed', {
        status,
        message,
        response_time_ms: Date.now() - start,
      });

      return {
        success: false,
        response_time_ms: Date.now() - start,
        tested_at: new Date().toISOString(),
        error: message,
      };
    }
  }

  async getCampaigns(params?: {
    page?: number;
    limit?: number;
  }): Promise<MasOfferCampaignsResponse> {
    const response = await this.client.get<MasOfferCampaignsResponse>('/v1/campaigns', { params });
    return response.data;
  }

  async getDeals(params?: {
    page?: number;
    limit?: number;
    campaign_id?: number;
    status?: string;
    category?: string;
  }): Promise<MasOfferDealsResponse> {
    const response = await this.syncClient.get<MasOfferDealsResponse>('/v1/deals', { params });
    return response.data;
  }

  async getVouchers(params?: {
    page?: number;
    limit?: number;
    campaign_id?: number;
    status?: string;
  }): Promise<MasOfferVouchersResponse> {
    const response = await this.syncClient.get<MasOfferVouchersResponse>('/v1/vouchers', { params });
    return response.data;
  }

  async getCoupons(params?: {
    page?: number;
    limit?: number;
    campaign_id?: number;
    status?: string;
  }): Promise<MasOfferCouponsResponse> {
    const response = await this.syncClient.get<MasOfferCouponsResponse>('/v1/coupons', { params });
    return response.data;
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof AxiosError) {
      const data = err.response?.data as Record<string, unknown> | undefined;
      if (typeof data?.message === 'string') return data.message as string;
      if (typeof data?.error === 'string') return data.error as string;
      if (err.message) return err.message;
    }
    if (err instanceof Error) return err.message;
    return 'Unknown error';
  }
}

// =============================================================================
// Singleton
// =============================================================================

let _client: MasOfferClient | null = null;

export function getMasOfferClient(): MasOfferClient {
  if (!_client) {
    assertServerSide();
    _client = new MasOfferClient();
  }
  return _client;
}

// Alias for consistency with other integrations
export const getMasOfferApiClient = getMasOfferClient;

export default MasOfferClient;
