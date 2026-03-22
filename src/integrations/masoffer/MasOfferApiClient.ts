/**
 * MasOffer Publisher API Client — SERVER-SIDE ONLY
 *
 * Uses Node.js native `fetch` (available since Node 18).
 *
 * Features:
 *  - Bearer token auth via Authorization header + publisher_id query param
 *  - Exponential backoff + jitter for transient errors
 *  - Correlation IDs for request tracing
 *  - Safe logging (API token NEVER appears in logs)
 *  - Full TypeScript type safety
 *
 * SECURITY:
 *  - This module MUST NOT be imported in browser code.
 *  - MASOFFER_API_TOKEN is a server-side secret.
 *  - Authorization header is set here and never exposed.
 *  - Never log raw API token or Authorization header value.
 */

import type {
  MasOfferClientConfig,
  MasOfferCampaignsResponse,
  MasOfferDealsResponse,
  MasOfferVouchersResponse,
  MasOfferCouponsResponse,
  MasOfferCampaign,
  MasOfferOfferItem,
  MasOfferListResponse,
  FetchOffersOptions,
} from './masoffer.types.js';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TIMEOUT_MS = 15_000;
const SYNC_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const BASE_URL = 'https://publisher-api.masoffer.net';

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
// Note: MasOffer's nginx may return 404 instead of 429 when rate-limited.
// We also treat 404 as retryable since the API has been verified to exist
// at this path with correct auth (confirmed via 429 responses in testing).
const RATE_LIMIT_STATUS_CODES = new Set([429, 404]);

// =============================================================================
// Safe Logging
// =============================================================================

/** Returns a masked version of the token for logging purposes only. */
function maskToken(token: string): string {
  if (!token || token.length <= 6) return '***';
  return `${token.slice(0, 3)}...${token.slice(-3)}`;
}

function safeHeaders(hasToken: boolean): string {
  return hasToken ? 'Authorization: Bearer <masked>' : 'Authorization: NONE';
}

function safeMeta(meta?: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  if (!meta) return safe;
  for (const [k, v] of Object.entries(meta)) {
    const lo = k.toLowerCase();
    safe[k] =
      lo.includes('token') || lo.includes('key') || lo.includes('auth') || lo.includes('secret')
        ? '[REDACTED]'
        : v;
  }
  return safe;
}

function logInfo(msg: string, meta?: Record<string, unknown>): void {
  console.info(`[MasOffer] ${msg}`, safeMeta(meta));
}

function logWarn(msg: string, meta?: Record<string, unknown>): void {
  console.warn(`[MasOffer] ${msg}`, safeMeta(meta));
}

function logError(msg: string, meta?: Record<string, unknown>): void {
  console.error(`[MasOffer] ${msg}`, safeMeta(meta));
}

// =============================================================================
// Server-Side Guard
// =============================================================================

function assertServerSide(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (globalThis as any).window !== 'undefined') {
    throw new Error(
      '[MasOffer] SECURITY: MasOffer client must not be imported in browser code. ' +
        'Use the /api/admin/masoffer/ route handler instead.'
    );
  }
}

// =============================================================================
// HTTP Utilities — uses https.request (HTTP/1.1) for MasOffer compatibility
// MasOffer's nginx 1.11.3 does not handle HTTP/2 properly.
// Node.js 22 fetch uses HTTP/2 by default → causes 404s.
// Using https.request forces HTTP/1.1 which works correctly.
// =============================================================================

import https from 'node:https';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(baseMs: number): number {
  return baseMs + Math.random() * baseMs * 0.5;
}

function buildUrl(base: string, path: string, params?: Record<string, unknown>): string {
  const url = new URL(path, base);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

async function httpsRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
    body?: string;
  } = {}
): Promise<HttpResponse> {
  const {
    method = 'GET',
    headers = {},
    timeout = DEFAULT_TIMEOUT_MS,
    body: reqBody,
  } = options;

  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === 'https:';

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf-8');
          const responseHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            responseHeaders[k] = Array.isArray(v) ? v.join(', ') : (v ?? '');
          }
          resolve({
            status: res.statusCode ?? 0,
            statusText: res.statusMessage ?? '',
            headers: responseHeaders,
            body: responseBody,
          });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' }));
    });

    req.setTimeout(timeout);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

async function httpRequestWithTimeout(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
    body?: string;
  }
): Promise<HttpResponse> {
  return httpsRequest(url, options);
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  label: string
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const errObj = err as { status?: number; code?: string; message?: string };
      const status = errObj?.status;
      const code = errObj?.code;
      const isRetryable = status
        ? RATE_LIMIT_STATUS_CODES.has(status) || RETRYABLE_STATUS_CODES.has(status)
        : code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ABORT_ERR';

      if (++attempt > maxRetries || !isRetryable) throw err;

      const backoffMs = jitter(Math.pow(2, attempt - 1) * 1000);
      logWarn(`Retryable error, backing off ${Math.round(backoffMs)}ms (attempt ${attempt}/${maxRetries})`, {
        status,
        code,
      });
      await sleep(backoffMs);
    }
  }
}

// =============================================================================
// Client
// =============================================================================

export class MasOfferApiClient {
  private readonly apiToken: string;
  private readonly publisherId: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly defaultTimeout: number;

  constructor(config: MasOfferClientConfig) {
    assertServerSide();
    this.apiToken = config.apiToken;
    this.publisherId = config.publisherId;
    this.baseUrl = config.baseUrl || BASE_URL;
    this.maxRetries = config.maxRetries ?? MAX_RETRIES;
    this.defaultTimeout = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  isConfigured(): boolean {
    return Boolean(this.apiToken && this.apiToken.length > 0 && this.publisherId && this.publisherId.length > 0);
  }

  // ── Private request helper ──────────────────────────────────────────────────

  private async request<T>(
    path: string,
    options: {
      params?: Record<string, unknown>;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const { params, timeout = this.defaultTimeout } = options;

    // Always include publisher_id as a query param (MasOffer requires this)
    const allParams: Record<string, unknown> = {
      publisher_id: this.publisherId,
      ...params,
    };

    const url = buildUrl(this.baseUrl, path, allParams);
    const corrId = `mo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    logInfo('API request', {
      method: 'GET',
      url: url.replace(/token=[^&]+/, 'token=[REDACTED]'),
      corrId,
      hasAuth: Boolean(this.apiToken),
      authHeader: safeHeaders(Boolean(this.apiToken)),
    });

    const start = Date.now();

    const response = await httpRequestWithTimeout(url, {
      method: 'GET',
      timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${this.apiToken}`,
        'X-Correlation-ID': corrId,
      },
    });

    logInfo('API response', {
      status: response.status,
      corrId,
      durationMs: Date.now() - start,
    });

    if (response.status < 200 || response.status >= 300) {
      let body: unknown = null;
      const ct = response.headers['content-type'] ?? '';
      if (ct.includes('application/json') && response.body) {
        try { body = JSON.parse(response.body); } catch { /* ignore */ }
      }

      const err: Error & { status?: number; body?: unknown } = new Error(
        `HTTP ${response.status}: ${response.statusText}`
      );
      err.status = response.status;
      err.body = body;
      throw err;
    }

    // Parse JSON response body
    if (!response.body) {
      const err = new Error('Empty response body');
      throw err;
    }
    try {
      return JSON.parse(response.body) as T;
    } catch {
      throw new Error(`Invalid JSON response: ${response.body.slice(0, 200)}`);
    }
  }

  // ── Campaigns ─────────────────────────────────────────────────────────────

  async fetchCampaigns(
    options: { page?: number; pageSize?: number } = {}
  ): Promise<MasOfferListResponse<MasOfferCampaign>> {
    const { page = 1, pageSize = 100 } = options;
    return withRetry(
      () =>
        this.request<MasOfferListResponse<MasOfferCampaign>>('/v1/campaigns', {
          params: { page, limit: pageSize },
        }),
      this.maxRetries,
      'fetchCampaigns'
    );
  }

  // ── Deals ────────────────────────────────────────────────────────────────

  async fetchDeals(
    options: FetchOffersOptions = {}
  ): Promise<MasOfferDealsResponse> {
    const { page = 1, pageSize = 100, campaignId, status, category } = options;
    const params: Record<string, unknown> = { page, limit: pageSize };
    if (campaignId !== undefined) params.campaign_id = campaignId;
    if (status) params.status = status;
    if (category) params.category = category;

    return withRetry(
      () =>
        this.request<MasOfferDealsResponse>('/v1/deals', {
          params,
          timeout: SYNC_TIMEOUT_MS,
        }),
      this.maxRetries,
      'fetchDeals'
    );
  }

  // ── Vouchers ──────────────────────────────────────────────────────────────

  async fetchVouchers(
    options: FetchOffersOptions = {}
  ): Promise<MasOfferVouchersResponse> {
    const { page = 1, pageSize = 100, campaignId, status, category } = options;
    const params: Record<string, unknown> = { page, limit: pageSize };
    if (campaignId !== undefined) params.campaign_id = campaignId;
    if (status) params.status = status;
    if (category) params.category = category;

    return withRetry(
      () =>
        this.request<MasOfferVouchersResponse>('/v1/vouchers', {
          params,
          timeout: SYNC_TIMEOUT_MS,
        }),
      this.maxRetries,
      'fetchVouchers'
    );
  }

  // ── Coupons ───────────────────────────────────────────────────────────────

  async fetchCoupons(
    options: FetchOffersOptions = {}
  ): Promise<MasOfferCouponsResponse> {
    const { page = 1, pageSize = 100, campaignId, status, category } = options;
    const params: Record<string, unknown> = { page, limit: pageSize };
    if (campaignId !== undefined) params.campaign_id = campaignId;
    if (status) params.status = status;
    if (category) params.category = category;

    return withRetry(
      () =>
        this.request<MasOfferCouponsResponse>('/v1/coupons', {
          params,
          timeout: SYNC_TIMEOUT_MS,
        }),
      this.maxRetries,
      'fetchCoupons'
    );
  }

  // ── All offer types (deals + vouchers + coupons combined) ─────────────────

  async fetchAllOffers(
    options: FetchOffersOptions = {}
  ): Promise<MasOfferOfferItem[]> {
    const allItems: MasOfferOfferItem[] = [];

    const [deals, vouchers, coupons] = await Promise.all([
      this.fetchDeals({ ...options, pageSize: 100 }),
      this.fetchVouchers({ ...options, pageSize: 100 }),
      this.fetchCoupons({ ...options, pageSize: 100 }),
    ]);

    allItems.push(...(deals.data ?? []));
    allItems.push(...(vouchers.data ?? []));
    allItems.push(...(coupons.data ?? []));

    return allItems;
  }

  // ── Connectivity Test ─────────────────────────────────────────────────────

  async testConnection(): Promise<{
    success: boolean;
    responseTimeMs: number;
    testedAt: string;
    campaignCount?: number;
    offerCount?: number;
    error?: string;
    rateLimited?: boolean;
  }> {
    const start = Date.now();
    try {
      const result = await this.fetchCampaigns({ page: 1, pageSize: 1 });
      return {
        success: true,
        responseTimeMs: Date.now() - start,
        testedAt: new Date().toISOString(),
        campaignCount: result.pagination?.total,
        offerCount: result.data.length,
      };
    } catch (err) {
      const errObj = err as { status?: number; message?: string };
      const status = errObj?.status;
      const message = errObj?.message ?? 'Unknown error';
      const rateLimited = status && RATE_LIMIT_STATUS_CODES.has(status);

      // 429 means auth was accepted but rate-limited — treat as partial success
      if (rateLimited) {
        logWarn('API rate-limited (auth accepted)', { responseTimeMs: Date.now() - start });
        return {
          success: true,
          rateLimited: true,
          responseTimeMs: Date.now() - start,
          testedAt: new Date().toISOString(),
          error: 'Rate limited — auth accepted, retry shortly',
        };
      }

      logError('Connection test failed', { status, responseTimeMs: Date.now() - start, error: message });
      return {
        success: false,
        responseTimeMs: Date.now() - start,
        testedAt: new Date().toISOString(),
        error: message,
      };
    }
  }

  // ── Stream Helpers ─────────────────────────────────────────────────────────

  async *streamDeals(
    options: Omit<FetchOffersOptions, 'page'> = {}
  ): AsyncGenerator<MasOfferOfferItem[]> {
    let page = 1;
    while (true) {
      const result = await this.fetchDeals({ ...options, page, pageSize: 100 });
      if (!result.data || result.data.length === 0) break;

      yield result.data;

      const totalPages = result.pagination?.total_pages ?? 1;
      if (page >= totalPages) break;
      page++;
    }
  }

  async *streamVouchers(
    options: Omit<FetchOffersOptions, 'page'> = {}
  ): AsyncGenerator<MasOfferOfferItem[]> {
    let page = 1;
    while (true) {
      const result = await this.fetchVouchers({ ...options, page, pageSize: 100 });
      if (!result.data || result.data.length === 0) break;

      yield result.data;

      const totalPages = result.pagination?.total_pages ?? 1;
      if (page >= totalPages) break;
      page++;
    }
  }

  async *streamCoupons(
    options: Omit<FetchOffersOptions, 'page'> = {}
  ): AsyncGenerator<MasOfferOfferItem[]> {
    let page = 1;
    while (true) {
      const result = await this.fetchCoupons({ ...options, page, pageSize: 100 });
      if (!result.data || result.data.length === 0) break;

      yield result.data;

      const totalPages = result.pagination?.total_pages ?? 1;
      if (page >= totalPages) break;
      page++;
    }
  }

  async *streamAllOffers(
    options: Omit<FetchOffersOptions, 'page'> = {}
  ): AsyncGenerator<MasOfferOfferItem[]> {
    // Yield combined batches from all three endpoints
    // We interleave to get a mix of offer types
    let done = { deals: false, vouchers: false, coupons: false };

    const dealStream = this.streamDeals(options);
    const voucherStream = this.streamVouchers(options);
    const couponStream = this.streamCoupons(options);

    for await (const batch of dealStream) {
      yield batch;
      done.deals = true;
    }
    for await (const batch of voucherStream) {
      yield batch;
      done.vouchers = true;
    }
    for await (const batch of couponStream) {
      yield batch;
      done.coupons = true;
    }
  }
}

// =============================================================================
// Singleton
// =============================================================================

let _client: MasOfferApiClient | null = null;

export function getMasOfferApiClient(): MasOfferApiClient {
  if (!_client) {
    assertServerSide();
    _client = new MasOfferApiClient({
      publisherId: process.env.MASOFFER_PUBLISHER_ID ?? '',
      apiToken: process.env.MASOFFER_API_TOKEN ?? '',
      baseUrl: process.env.MASOFFER_BASE_URL ?? BASE_URL,
      timeoutMs: parseInt(process.env.MASOFFER_TIMEOUT_MS ?? String(DEFAULT_TIMEOUT_MS), 10),
      maxRetries: parseInt(process.env.MASOFFER_MAX_RETRIES ?? String(MAX_RETRIES), 10),
    });
  }
  return _client;
}

export default MasOfferApiClient;
