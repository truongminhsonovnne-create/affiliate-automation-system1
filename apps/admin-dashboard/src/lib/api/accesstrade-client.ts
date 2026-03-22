/**
 * AccessTrade API Client — SERVER-SIDE ONLY
 * ─────────────────────────────────────────────
 * Wraps the AccessTrade affiliate API with:
 *  - Token authentication via Authorization header
 *  - Safe error handling (never log the API key)
 *  - Correlation IDs for request tracing
 *  - Structured logging for observability
 *  - Type-safe response normalization
 *
 * SECURITY:
 *  - This module MUST NOT be imported in 'use client' components.
 *  - The ACCESSTRADE_API_KEY is a server-side secret.
 *  - Never return raw API keys or auth headers to the browser.
 *
 * Usage (server-side only):
 *  import { getAccessTradeClient } from '@/lib/api/accesstrade-client';
 *  const client = getAccessTradeClient();
 *  const campaigns = await client.getCampaigns({ page: 1, page_size: 20 });
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import type {
  AccessTradeCampaign,
  AccessTradeDeal,
  AccessTradePaginatedResponse,
  AccessTradeConnectionTest,
  NormalizedAccessTradeVoucher,
  AccessTradeSingleResponse,
  AccessTradeListResponse,
} from './accesstrade-types';

// =============================================================================
// Config
// =============================================================================

/** AccessTrade API base URL */
const ACCESSTRADE_BASE_URL =
  (process.env.ACCESSTRADE_API_URL as string | undefined) ??
  'https://api.accesstrade.vn';

/** Request timeout — 15 seconds for list endpoints, 30 for sync */
const DEFAULT_TIMEOUT = 15_000;
const SYNC_TIMEOUT = 30_000;

/** Mask a string for safe logging (shows first/last 3 chars) */
function maskKey(key: string): string {
  if (!key || key.length <= 6) return '***';
  return `${key.slice(0, 3)}...${key.slice(-3)}`;
}

// =============================================================================
// Server-side guard
// =============================================================================

function assertServerSide(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      '[AccessTrade] SECURITY: accesstrade-client.ts must not be imported in browser code. ' +
        'Use the /api/admin/accesstrade/ route handler instead.'
    );
  }
}

// =============================================================================
// Logging helpers — safe, no sensitive data
// =============================================================================

function logInfo(message: string, meta?: Record<string, unknown>): void {
  console.info(`[AccessTrade] ${message}`, meta ?? '');
}

function logWarn(message: string, meta?: Record<string, unknown>): void {
  console.warn(`[AccessTrade] ${message}`, meta ?? '');
}

function logError(message: string, meta?: Record<string, unknown>): void {
  // Never log 'meta' if it contains sensitive fields
  const safe: Record<string, unknown> = {};
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      if (
        k.toLowerCase().includes('key') ||
        k.toLowerCase().includes('token') ||
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
  console.error(`[AccessTrade] ${message}`, safe);
}

// =============================================================================
// Client factory
// =============================================================================

function createClient(timeout = DEFAULT_TIMEOUT): AxiosInstance {
  assertServerSide();

  const apiKey = process.env.ACCESSTRADE_API_KEY;

  if (!apiKey) {
    logWarn('ACCESSTRADE_API_KEY is not set in environment variables');
  }

  const client = axios.create({
    baseURL: ACCESSTRADE_BASE_URL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // AccessTrade uses Token auth — key is masked in logs
      Authorization: apiKey ? `Token ${apiKey}` : undefined,
    },
  });

  // ── Request interceptor ──────────────────────────────────────────
  client.interceptors.request.use(
    (config) => {
      const corrId = `at_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      config.headers['X-Correlation-ID'] = corrId;

      logInfo('API request sent', {
        method: config.method?.toUpperCase(),
        url: config.url,
        corrId,
        // Mask the key — NEVER log raw API key
        hasAuth: Boolean(apiKey),
        authPrefix: apiKey ? `Token ${maskKey(apiKey)}` : 'NONE',
      });

      return config;
    },
    (error) => {
      logError('Request setup error', { message: error.message });
      return Promise.reject(error);
    }
  );

  // ── Response interceptor ──────────────────────────────────────────
  client.interceptors.response.use(
    (response) => {
      logInfo('API response received', {
        status: response.status,
        url: response.config.url,
        corrId: response.config.headers['X-Correlation-ID'],
        dataKeys: response.data ? Object.keys(response.data) : [],
      });
      return response;
    },
    (error: AxiosError) => {
      const corrId = (error.config?.headers?.['X-Correlation-ID'] as string | undefined) ?? 'unknown';

      // Extract safe error info — NEVER log key
      const safeError: Record<string, unknown> = {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        corrId,
      };

      if (error.response) {
        // Server responded with error status
        safeError.responseData = error.response.data;
        logError('API error response', safeError);
      } else if (error.request) {
        // No response — network issue or timeout
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
// AccessTrade Client
// =============================================================================

export class AccessTradeClient {
  private client: AxiosInstance;
  private syncClient: AxiosInstance;
  private apiKey: string | undefined;

  constructor() {
    assertServerSide();
    this.apiKey = process.env.ACCESSTRADE_API_KEY;
    this.client = createClient(DEFAULT_TIMEOUT);
    this.syncClient = createClient(SYNC_TIMEOUT);
  }

  /** Returns true if the API key is configured */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  // ── Connection Test ─────────────────────────────────────────────────────────

  /**
   * Test connectivity to AccessTrade API.
   * Verifies key is valid and API is reachable.
   */
  async testConnection(): Promise<AccessTradeConnectionTest> {
    const start = Date.now();

    try {
      // Call account / campaign list endpoint to verify auth
      // AccessTrade typically uses GET /v1/campaigns for auth verification
      const response = await this.client.get('/v1/campaigns', {
        params: { page: 1, page_size: 1 },
      });

      const data = response.data as AccessTradePaginatedResponse<AccessTradeCampaign>;

      return {
        success: true,
        campaign_count: data.pagination?.total ?? 0,
        response_time_ms: Date.now() - start,
        tested_at: new Date().toISOString(),
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
      };
    }
  }

  // ── Campaigns ─────────────────────────────────────────────────────────────

  /**
   * Get list of available campaigns.
   * https://docs.accesstrade.vn/campaigns
   */
  async getCampaigns(params?: {
    page?: number;
    page_size?: number;
    status?: 'active' | 'inactive';
    category?: string;
  }): Promise<AccessTradePaginatedResponse<AccessTradeCampaign>> {
    const response = await this.client.get<AccessTradePaginatedResponse<AccessTradeCampaign>>(
      '/v1/campaigns',
      { params }
    );
    return response.data;
  }

  /**
   * Get a single campaign by ID.
   */
  async getCampaign(campaignId: number): Promise<AccessTradeCampaign> {
    const response = await this.client.get<AccessTradeSingleResponse<AccessTradeCampaign>>(
      `/v1/campaigns/${campaignId}`
    );
    return response.data.data;
  }

  // ── Deals / Vouchers ───────────────────────────────────────────────────────

  /**
   * Get deals / vouchers from AccessTrade.
   * https://docs.accesstrade.vn/deals
   */
  async getDeals(params?: {
    page?: number;
    page_size?: number;
    campaign_id?: number;
    type?: 'voucher' | 'promotion' | 'cashback' | 'flash_sale';
    status?: 'active' | 'inactive';
    platform?: string;
  }): Promise<AccessTradePaginatedResponse<AccessTradeDeal>> {
    const response = await this.client.get<AccessTradePaginatedResponse<AccessTradeDeal>>(
      '/v1/deals',
      { params }
    );
    return response.data;
  }

  /**
   * Get deals for a specific campaign.
   */
  async getCampaignDeals(campaignId: number): Promise<AccessTradeDeal[]> {
    const response = await this.client.get<AccessTradeListResponse<AccessTradeDeal>>(
      `/v1/campaigns/${campaignId}/deals`
    );
    return response.data.data ?? [];
  }

  // ── Normalization (for DB sync) ────────────────────────────────────────────

  /**
   * Normalize AccessTrade deal into a DB-ready record.
   */
  normalizeDeal(deal: AccessTradeDeal): NormalizedAccessTradeVoucher {
    return {
      external_id: `at_deal_${deal.id}`,
      campaign_id: deal.campaign_id,
      campaign_name: deal.campaign_name,
      title: deal.title,
      description: deal.description ?? null,
      deal_type: deal.type,
      discount_type: deal.discount_type,
      discount_value: deal.discount_value,
      max_discount: deal.max_discount ?? null,
      min_order_value: deal.min_order_value ?? null,
      code: deal.code ?? null,
      start_date: deal.start_date,
      end_date: deal.end_date,
      tracking_url: deal.tracking_url ?? null,
      is_exclusive: deal.is_exclusive ?? false,
      status: deal.status,
      platform: inferPlatform(deal),
      raw_data: deal,
      synced_at: new Date().toISOString(),
    };
  }

  /**
   * Sync all active deals from AccessTrade.
   * Returns normalized records ready for DB upsert.
   */
  async syncAllDeals(options?: {
    page_size?: number;
    max_pages?: number;
    campaign_id?: number;
  }): Promise<NormalizedAccessTradeVoucher[]> {
    const { page_size = 100, max_pages = 10, campaign_id } = options ?? {};
    const normalized: NormalizedAccessTradeVoucher[] = [];

    let page = 1;

    while (page <= max_pages) {
      logInfo(`Syncing deals page ${page}`, { campaign_id });

      const result = await this.getDeals({
        page,
        page_size,
        campaign_id,
        status: 'active',
      });

      for (const deal of result.data) {
        if (deal.status === 'active') {
          normalized.push(this.normalizeDeal(deal));
        }
      }

      if (page >= result.pagination.total_pages) break;
      page++;
    }

    logInfo(`Sync complete`, {
      total_deals: normalized.length,
      pages_fetched: page,
    });

    return normalized;
  }

  // ── Error extraction ────────────────────────────────────────────────────────

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

let _client: AccessTradeClient | null = null;

export function getAccessTradeClient(): AccessTradeClient {
  if (!_client) {
    assertServerSide();
    _client = new AccessTradeClient();
  }
  return _client;
}

// =============================================================================
// Utilities
// =============================================================================

/** Infer platform from campaign/deal name or URL */
function inferPlatform(deal: AccessTradeDeal): string {
  const name = `${deal.campaign_name} ${deal.title}`.toLowerCase();
  if (name.includes('shopee')) return 'shopee';
  if (name.includes('lazada')) return 'lazada';
  if (name.includes('tiki')) return 'tiki';
  if (name.includes('tiktok')) return 'tiktok';
  if (name.includes('sendo')) return 'sendo';
  if (name.includes('bidv')) return 'bidv';
  return 'unknown';
}

export default AccessTradeClient;
