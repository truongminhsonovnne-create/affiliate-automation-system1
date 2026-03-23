/**
 * AccessTrade API Client — SERVER-SIDE ONLY (admin-dashboard copy)
 *
 * Updated to match real API docs:
 *  - GET /v1/offers_informations — unified endpoint for vouchers/coupons/deals
 *  - GET /v1/campaigns — merchant campaigns
 *
 * Docs: https://developers.accesstrade.vn/api-publisher-vietnamese
 *
 * SECURITY:
 *  - This module MUST NOT be imported in 'use client' components.
 *  - The ACCESSTRADE_API_KEY is a server-side secret.
 *  - Never return raw API keys or auth headers to the browser.
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type {
  AccessTradeOffer,
  AccessTradeOffersResponse,
  AccessTradeCampaign,
  AccessTradeCampaignsResponse,
  AccessTradeConnectionTest,
} from './accesstrade-types';

// =============================================================================
// Config
// =============================================================================

const ACCESSTRADE_BASE_URL =
  (process.env.ACCESSTRADE_API_URL as string | undefined) ??
  'https://api.accesstrade.vn';

const DEFAULT_TIMEOUT = 15_000;
const SYNC_TIMEOUT = 30_000;

// =============================================================================
// Safe logging
// =============================================================================

function maskKey(key: string): string {
  if (!key || key.length <= 6) return '***';
  return `${key.slice(0, 3)}...${key.slice(-3)}`;
}

function logInfo(message: string, meta?: Record<string, unknown>): void {
  console.info(`[AccessTrade] ${message}`, meta ?? '');
}

function logError(message: string, meta?: Record<string, unknown>): void {
  const safe: Record<string, unknown> = {};
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      if (
        k.toLowerCase().includes('key') ||
        k.toLowerCase().includes('token') ||
        k.toLowerCase().includes('auth') ||
        k.toLowerCase().includes('secret')
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
// Axios factory
// =============================================================================

function createAxiosInstance(timeout = DEFAULT_TIMEOUT): AxiosInstance {
  assertServerSide();
  const apiKey = process.env.ACCESSTRADE_API_KEY;

  if (!apiKey) {
    logError('ACCESSTRADE_API_KEY is not set in environment variables');
  }

  const instance = axios.create({
    baseURL: ACCESSTRADE_BASE_URL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // Real API: Authorization: Token <access_key>
      Authorization: apiKey ? `Token ${apiKey}` : undefined,
    },
  });

  instance.interceptors.request.use((config) => {
    const corrId = `at_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    config.headers['X-Correlation-ID'] = corrId;
    logInfo('API request', {
      method: config.method?.toUpperCase(),
      url: config.url,
      corrId,
      hasAuth: Boolean(apiKey),
    });
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const corrId = (error.config?.headers?.['X-Correlation-ID'] as string | undefined) ?? 'unknown';
      logError('API error', {
        url: error.config?.url,
        status: error.response?.status,
        corrId,
        message: extractErrorMessage(error),
      });
      return Promise.reject(error);
    }
  );

  return instance;
}

// =============================================================================
// AccessTrade Client
// =============================================================================

export class AccessTradeClient {
  private client: AxiosInstance;
  private apiKey: string | undefined;

  constructor() {
    assertServerSide();
    this.apiKey = process.env.ACCESSTRADE_API_KEY;
    this.client = createAxiosInstance(DEFAULT_TIMEOUT);
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  // ── Connection Test ─────────────────────────────────────────────────────────

  /**
   * Test connectivity. Calls /v1/offers_informations with limit=1.
   * Returns offer_count from the response.
   */
  async testConnection(): Promise<AccessTradeConnectionTest> {
    const start = Date.now();
    try {
      const response = await this.client.get<AccessTradeOffersResponse>('/v1/offers_informations', {
        params: { limit: 1, status: 1 },
      });
      return {
        success: true,
        offer_count: response.data.data?.length ?? 0,
        response_time_ms: Date.now() - start,
        tested_at: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        response_time_ms: Date.now() - start,
        tested_at: new Date().toISOString(),
        error: extractErrorMessage(err),
      };
    }
  }

  // ── Offers (unified) ───────────────────────────────────────────────────────

  /**
   * Fetch offers from /v1/offers_informations — the single canonical endpoint.
   * Docs: https://developers.accesstrade.vn — "Lấy thông tin vouchers / coupons / deals"
   *
   * @param coupon  1 = only offers with coupon codes, 0 = no-code offers, undefined = all
   * @param status  1 = active, 0 = expired, undefined = all
   * @param scope   'expiring' = deals expiring within 3 days
   */
  async getOffers(params?: {
    page?: number;
    limit?: number;
    coupon?: 0 | 1;
    status?: 0 | 1;
    scope?: 'expiring';
    merchant?: string;
    categories?: string;
    domain?: string;
  }): Promise<AccessTradeOffersResponse> {
    const { page = 1, limit = 50, coupon, status, scope, merchant, categories, domain } = params ?? {};

    const queryParams: Record<string, unknown> = { page, limit };
    if (coupon !== undefined)  queryParams.coupon    = coupon;
    if (status !== undefined) queryParams.status    = status;
    if (scope)                queryParams.scope      = scope;
    if (merchant)             queryParams.merchant   = merchant;
    if (categories)            queryParams.categories = categories;
    if (domain)               queryParams.domain     = domain;

    const response = await this.client.get<AccessTradeOffersResponse>(
      '/v1/offers_informations',
      { params: queryParams }
    );
    return response.data;
  }

  // ── Campaigns ─────────────────────────────────────────────────────────────

  /**
   * Fetch campaigns from /v1/campaigns.
   * Docs: https://developers.accesstrade.vn — "Lấy danh sách campaigns"
   *
   * @param approval Filter by registration status: 'Successful' | 'Pending' | 'Unregistered'
   */
  async getCampaigns(params?: {
    page?: number;
    limit?: number;
    approval?: 'Successful' | 'Pending' | 'Unregistered';
  }): Promise<AccessTradeCampaignsResponse> {
    const { page = 1, limit = 50, approval } = params ?? {};

    const queryParams: Record<string, unknown> = { page, limit };
    if (approval) queryParams.approval = approval;

    const response = await this.client.get<AccessTradeCampaignsResponse>(
      '/v1/campaigns',
      { params: queryParams }
    );
    return response.data;
  }

  // ── Normalization ─────────────────────────────────────────────────────────

  /**
   * Normalize an AccessTrade offer to a flat display-friendly object.
   * Used by API routes to return structured data to the UI.
   */
  normalizeOffer(offer: AccessTradeOffer): {
    id: string;
    title: string;
    merchant: string;
    domain: string;
    description: string;
    couponCode: string | null;
    affLink: string | null;
    link: string | null;
    image: string | null;
    startTime: string | null;
    endTime: string | null;
    categories: string[];
    source: 'accesstrade';
  } {
    const firstCode = Array.isArray(offer.coupons) && offer.coupons.length > 0
      ? offer.coupons[0]
      : (offer.code ?? null);

    return {
      id: String(offer.id),
      title: typeof offer.name === 'string' ? offer.name.trim() : 'Unknown Offer',
      merchant: typeof offer.merchant === 'string' ? offer.merchant.trim() : 'Unknown Merchant',
      domain: typeof offer.domain === 'string' ? offer.domain : '',
      description: typeof offer.content === 'string' ? offer.content : '',
      couponCode: typeof firstCode === 'string' && firstCode.length > 0 ? firstCode : null,
      affLink: typeof offer.aff_link === 'string' ? offer.aff_link : null,
      link: typeof offer.link === 'string' ? offer.link : null,
      image: typeof offer.image === 'string' ? offer.image : null,
      startTime: typeof offer.start_time === 'string' ? offer.start_time : null,
      endTime: typeof offer.end_time === 'string' ? offer.end_time : null,
      categories: Array.isArray(offer.categories) ? offer.categories : [],
      source: 'accesstrade' as const,
    };
  }

  // ── Sync all active offers ────────────────────────────────────────────────

  /**
   * Sync all active offers. Fetches page by page until exhaustion.
   * Returns flat normalized offer objects ready for DB upsert.
   */
  async syncAllOffers(options?: {
    limit?: number;
    maxPages?: number;
    coupon?: 0 | 1;
  }): Promise<ReturnType<AccessTradeClient['normalizeOffer']>[]> {
    const { limit = 100, maxPages = 20, coupon } = options ?? {};
    const results: ReturnType<AccessTradeClient['normalizeOffer']>[] = [];

    let page = 1;
    while (page <= maxPages) {
      logInfo(`Fetching offers page ${page}`, { coupon, limit });

      const response = await this.getOffers({ page, limit, coupon, status: 1 });
      const offers = response.data ?? [];

      if (offers.length === 0) break;

      for (const offer of offers) {
        results.push(this.normalizeOffer(offer));
      }

      if (offers.length < limit) break;
      page++;
    }

    logInfo('Sync complete', { total: results.length, pagesFetched: page });
    return results;
  }

  // ── Error extraction ───────────────────────────────────────────────────────

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

export default AccessTradeClient;
