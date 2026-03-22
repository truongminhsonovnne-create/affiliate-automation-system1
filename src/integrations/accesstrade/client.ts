/**
 * AccessTrade Publisher API Client — SERVER-SIDE ONLY
 *
 * Uses Node.js native `fetch` (available since Node 18) to avoid adding axios
 * as a dependency to the root package.
 *
 * Features:
 *  - Token auth via Authorization header
 *  - Exponential backoff + jitter for transient errors
 *  - Correlation IDs for request tracing
 *  - Safe logging (API key NEVER appears in logs)
 *  - Full TypeScript type safety
 *
 * SECURITY:
 *  - This module MUST NOT be imported in browser code.
 *  - ACCESSTRADE_API_KEY is a server-side secret.
 *  - Authorization header is set here and never exposed.
 *  - Never log raw API key or Authorization header value.
 *
 * AccessTrade Publisher API docs: https://docs.accesstrade.vn/
 */

import type {
  AccessTradeCampaign,
  AccessTradeDeal,
  AccessTradePaginatedResponse,
  AccessTradeClientConfig,
  FetchCampaignsOptions,
  FetchDealsOptions,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TIMEOUT_MS = 15_000;
const SYNC_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const BASE_URL = 'https://api.accesstrade.vn';

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

// =============================================================================
// Safe Logging
// =============================================================================

function maskKey(key: string): string {
  if (!key || key.length <= 6) return '***';
  return `${key.slice(0, 3)}...${key.slice(-3)}`;
}

function safeHeaders(hasKey: boolean): string {
  return hasKey ? 'Authorization: Token <masked>' : 'Authorization: NONE';
}

function logInfo(msg: string, meta?: Record<string, unknown>): void {
  const safe: Record<string, unknown> = {};
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      const lo = k.toLowerCase();
      safe[k] =
        lo.includes('key') || lo.includes('token') || lo.includes('auth') || lo.includes('secret')
          ? '[REDACTED]'
          : v;
    }
  }
  console.info(`[AccessTrade] ${msg}`, safe);
}

function logWarn(msg: string, meta?: Record<string, unknown>): void {
  const safe: Record<string, unknown> = {};
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      const lo = k.toLowerCase();
      safe[k] =
        lo.includes('key') || lo.includes('token') || lo.includes('auth') || lo.includes('secret')
          ? '[REDACTED]'
          : v;
    }
  }
  console.warn(`[AccessTrade] ${msg}`, safe);
}

function logError(msg: string, meta?: Record<string, unknown>): void {
  const safe: Record<string, unknown> = {};
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      const lo = k.toLowerCase();
      safe[k] =
        lo.includes('key') || lo.includes('token') || lo.includes('auth') || lo.includes('secret')
          ? '[REDACTED]'
          : v;
    }
  }
  console.error(`[AccessTrade] ${msg}`, safe);
}

// =============================================================================
// Server-Side Guard
// =============================================================================

function assertServerSide(): void {
  // Check that we're not in a browser environment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (globalThis as any).window !== 'undefined') {
    throw new Error(
      '[AccessTrade] SECURITY: accesstrade client must not be imported in browser code. ' +
        'Use the /api/admin/accesstrade/ route handler instead.'
    );
  }
}

// =============================================================================
// HTTP Utilities
// =============================================================================

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

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal as AbortSignal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
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
      const errObj = err as { response?: { status: number }; code?: string; message?: string };
      const status = errObj?.response?.status;
      const code = errObj?.code;
      const isRetryable = status
        ? RETRYABLE_STATUS_CODES.has(status)
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

export class AccessTradeApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly defaultTimeout: number;

  constructor(config: AccessTradeClientConfig) {
    assertServerSide();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || BASE_URL;
    this.maxRetries = config.maxRetries ?? MAX_RETRIES;
    this.defaultTimeout = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
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
    const url = buildUrl(this.baseUrl, path, params);
    const corrId = `at_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    logInfo('API request', {
      method: 'GET',
      url,
      corrId,
      hasAuth: Boolean(this.apiKey),
      authHeader: safeHeaders(Boolean(this.apiKey)),
    });

    const start = Date.now();

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Token ${this.apiKey}`,
        'X-Correlation-ID': corrId,
      },
    });

    logInfo('API response', {
      status: response.status,
      corrId,
      durationMs: Date.now() - start,
    });

    if (!response.ok) {
      let body: unknown;
      try {
        const clone = response.clone();
        body = await clone.json();
      } catch {
        body = null;
      }

      const err: Error & { response?: { status: number }; body?: unknown } = new Error(
        `HTTP ${response.status}: ${response.statusText}`
      );
      err.response = { status: response.status };
      err.body = body;
      throw err;
    }

    return response.json() as Promise<T>;
  }

  // ── Campaigns ─────────────────────────────────────────────────────────────

  async fetchCampaigns(
    options: FetchCampaignsOptions = {}
  ): Promise<AccessTradePaginatedResponse<AccessTradeCampaign>> {
    const { page = 1, pageSize = 100, status } = options;
    const params: Record<string, unknown> = { page, page_size: pageSize };
    if (status) params.status = status;

    return withRetry(
      () => this.request<AccessTradePaginatedResponse<AccessTradeCampaign>>('/v1/campaigns', { params }),
      this.maxRetries,
      'fetchCampaigns'
    );
  }

  async fetchCampaign(campaignId: number): Promise<AccessTradeCampaign> {
    const result = await withRetry(
      () => this.request<{ data: AccessTradeCampaign; success: boolean }>(`/v1/campaigns/${campaignId}`),
      this.maxRetries,
      'fetchCampaign'
    );
    return result.data;
  }

  // ── Deals / Vouchers ───────────────────────────────────────────────────────

  async fetchDeals(
    options: FetchDealsOptions = {}
  ): Promise<AccessTradePaginatedResponse<AccessTradeDeal>> {
    const { page = 1, pageSize = 100, campaignId, type, status } = options;
    const params: Record<string, unknown> = { page, page_size: pageSize };
    if (campaignId !== undefined) params.campaign_id = campaignId;
    if (type) params.type = type;
    if (status) params.status = status;

    return withRetry(
      () =>
        this.request<AccessTradePaginatedResponse<AccessTradeDeal>>('/v1/deals', {
          params,
          timeout: SYNC_TIMEOUT_MS,
        }),
      this.maxRetries,
      'fetchDeals'
    );
  }

  async fetchCampaignDeals(campaignId: number): Promise<AccessTradeDeal[]> {
    const result = await withRetry(
      () => this.request<{ data: AccessTradeDeal[]; success: boolean }>(`/v1/campaigns/${campaignId}/deals`),
      this.maxRetries,
      'fetchCampaignDeals'
    );
    return result.data ?? [];
  }

  // ── Connectivity Test ─────────────────────────────────────────────────────

  async testConnection(): Promise<{
    success: boolean;
    responseTimeMs: number;
    testedAt: string;
    campaignCount?: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const result = await this.fetchCampaigns({ page: 1, pageSize: 1 });
      return {
        success: true,
        responseTimeMs: Date.now() - start,
        testedAt: new Date().toISOString(),
        campaignCount: result.pagination?.total,
      };
    } catch (err) {
      const errObj = err as Error & { response?: { status: number } };
      const error = errObj?.message ?? 'Unknown error';
      logError('Connection test failed', { responseTimeMs: Date.now() - start, error });
      return {
        success: false,
        responseTimeMs: Date.now() - start,
        testedAt: new Date().toISOString(),
        error,
      };
    }
  }

  // ── Stream Helpers ─────────────────────────────────────────────────────────

  async *streamDeals(
    options: Omit<FetchDealsOptions, 'page'> = {}
  ): AsyncGenerator<AccessTradeDeal[]> {
    let page = 1;

    while (true) {
      const result = await this.fetchDeals({ ...options, page, pageSize: 100 });
      if (result.data.length === 0) break;

      yield result.data;

      const totalPages = result.pagination?.total_pages ?? 1;
      if (page >= totalPages) break;
      page++;
    }
  }

  async *streamCampaigns(
    options: Omit<FetchCampaignsOptions, 'page'> = {}
  ): AsyncGenerator<AccessTradeCampaign[]> {
    let page = 1;

    while (true) {
      const result = await this.fetchCampaigns({ ...options, page, pageSize: 100 });
      if (result.data.length === 0) break;

      yield result.data;

      const totalPages = result.pagination?.total_pages ?? 1;
      if (page >= totalPages) break;
      page++;
    }
  }
}

// =============================================================================
// Singleton
// =============================================================================

let _client: AccessTradeApiClient | null = null;

export function getAccessTradeApiClient(): AccessTradeApiClient {
  if (!_client) {
    assertServerSide();
    _client = new AccessTradeApiClient({
      apiKey: process.env.ACCESSTRADE_API_KEY ?? '',
      baseUrl: process.env.ACCESSTRADE_BASE_URL ?? BASE_URL,
      timeoutMs: parseInt(process.env.ACCESSTRADE_TIMEOUT_MS ?? String(DEFAULT_TIMEOUT_MS), 10),
      maxRetries: parseInt(process.env.ACCESSTRADE_MAX_RETRIES ?? String(MAX_RETRIES), 10),
    });
  }
  return _client;
}

export default AccessTradeApiClient;
