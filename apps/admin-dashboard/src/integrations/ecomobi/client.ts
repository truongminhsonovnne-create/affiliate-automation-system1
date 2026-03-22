/**
 * Ecomobi API Client — Server-side only
 *
 * Typed client skeleton for the Ecomobi Publisher API.
 *
 * PENDING: Replace placeholder fetch implementations with real Ecomobi API
 * calls once documentation and/or sandbox credentials are available.
 *
 * Auth: Bearer token (TBD — pending Ecomobi docs)
 * Base URL: ECOMOBI_BASE_URL env var, default https://api.ecomobi.com (TBD)
 *
 * Reference patterns: MasOfferApiClient, AccessTradeClient in this codebase.
 */

import type {
  EcomobiPaginatedResponse,
  EcomobiRawItem,
  EcomobiOffersResponse,
} from './types';

// ── Auth helpers ────────────────────────────────────────────────────────────────

function getConfig() {
  const apiKey = process.env.ECOMOBI_API_KEY;
  const publisherId = process.env.ECOMOBI_PUBLISHER_ID;
  const baseUrl =
    process.env.ECOMOBI_BASE_URL?.replace(/\/$/, '') ??
    'https://api.ecomobi.com'; // TBD — pending confirmation

  if (!apiKey) {
    throw new Error(
      '[Ecomobi] ECOMOBI_API_KEY is not set. ' +
        'Set it in .env.local (never expose to browser).'
    );
  }

  return { apiKey, publisherId: publisherId ?? '', baseUrl };
}

// ── Logging helpers ─────────────────────────────────────────────────────────────

function logInfo(msg: string, meta?: Record<string, unknown>) {
  console.info(`[Ecomobi] ${msg}`, meta ?? {});
}

function logWarn(msg: string, meta?: Record<string, unknown>) {
  console.warn(`[Ecomobi] ${msg}`, meta ?? {});
}

function logError(msg: string, meta?: Record<string, unknown>) {
  console.error(`[Ecomobi] ${msg}`, meta ?? {});
}

// ── Retry logic ─────────────────────────────────────────────────────────────────

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit & { timeoutMs?: number },
  retries = 3
): Promise<T> {
  const { timeoutMs = 15_000, ...fetchOptions } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${getConfig().apiKey}`,
          ...fetchOptions.headers,
        },
      });

      clearTimeout(timer);

      if (response.ok) {
        return response.json() as Promise<T>;
      }

      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === retries) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `[Ecomobi] HTTP ${response.status} on ${url}: ${body}`.slice(0, 300)
        );
      }

      // Exponential backoff
      const backoffMs = Math.min(1000 * 2 ** attempt, 10_000);
      logWarn(`Retryable ${response.status}, waiting ${backoffMs}ms (attempt ${attempt + 1})`);
      await new Promise((r) => setTimeout(r, backoffMs));
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) throw err;
      const backoffMs = Math.min(1000 * 2 ** attempt, 10_000);
      logWarn(`Fetch error, retrying in ${backoffMs}ms`, {
        error: err instanceof Error ? err.message : String(err),
      });
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  // Satisfy TS — unreachable but keeps function happy
  throw new Error('[Ecomobi] fetchWithRetry: unexpected exit');
}

// ── Client ─────────────────────────────────────────────────────────────────────

export interface EcomobiPaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface EcomobiOffersResult {
  data: EcomobiRawItem[];
  pagination: EcomobiPaginationMeta;
}

class EcomobiApiClientImpl {
  private baseUrl = '';
  private apiKey = '';
  private timeoutMs = 15_000;
  private maxRetries = 3;

  constructor() {
    const cfg = getConfig();
    this.baseUrl = cfg.baseUrl;
    this.apiKey = cfg.apiKey;
  }

  /**
   * GET /offers — Fetch active offers/campaigns.
   *
   * PENDING: Replace with real Ecomobi endpoint path once docs are available.
   * Expected params: page, limit, status (active/expired), category, etc.
   */
  async getOffers(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<EcomobiOffersResult> {
    const { page = 1, limit = 100, status = 'active' } = params ?? {};

    // TODO: Replace with real Ecomobi endpoint
    // e.g. `${this.baseUrl}/v1/offers?page=${page}&limit=${limit}&status=${status}`
    const url = `${this.baseUrl}/v1/offers?page=${page}&limit=${limit}&status=${status}`;

    logInfo('Fetching offers', { page, limit, status });

    try {
      const raw = await fetchWithRetry<EcomobiPaginatedResponse<EcomobiRawItem>>(
        url,
        { method: 'GET', timeoutMs: this.timeoutMs },
        this.maxRetries
      );

      // TODO: Replace with real Ecomobi response shape once docs are available.
      // Expected: { data: EcomobiRawItem[], pagination: { page, per_page, total, total_pages } }
      const data: EcomobiRawItem[] = raw?.data ?? [];
      const pagination: EcomobiPaginationMeta = raw?.pagination ?? {
        page, per_page: limit, total: 0, total_pages: 0,
      };

      return { data, pagination };
    } catch (err) {
      logError('getOffers failed', {
        error: err instanceof Error ? err.message : String(err),
        page,
      });
      throw err;
    }
  }

  /**
   * GET /campaigns — Fetch promotional campaigns.
   *
   * PENDING: Replace with real Ecomobi endpoint path once docs are available.
   */
  async getCampaigns?(params?: {
    page?: number;
    limit?: number;
  }): Promise<EcomobiPaginatedResponse<EcomobiRawItem>> {
    const { page = 1, limit = 100 } = params ?? {};

    // TODO: Replace with real Ecomobi endpoint
    // e.g. `${this.baseUrl}/v1/campaigns?page=${page}&limit=${limit}`
    const url = `${this.baseUrl}/v1/campaigns?page=${page}&limit=${limit}`;

    logInfo('Fetching campaigns', { page, limit });

    try {
      return await fetchWithRetry<EcomobiPaginatedResponse<EcomobiRawItem>>(
        url,
        { method: 'GET', timeoutMs: this.timeoutMs },
        this.maxRetries
      );
    } catch (err) {
      logError('getCampaigns failed', {
        error: err instanceof Error ? err.message : String(err),
        page,
      });
      throw err;
    }
  }

  /**
   * Health check — verify API key and connectivity.
   *
   * PENDING: Replace with real Ecomobi endpoint once docs are available.
   * Common patterns: GET /me, GET /account, GET /ping
   */
  async healthCheck(): Promise<{
    connected: boolean;
    apiKeyConfigured: boolean;
    publisherId?: string;
    error?: string;
  }> {
    try {
      if (!this.apiKey) {
        return { connected: false, apiKeyConfigured: false };
      }

      // TODO: Replace with real Ecomobi endpoint
      // e.g. `${this.baseUrl}/v1/account` or `${this.baseUrl}/me`
      const url = `${this.baseUrl}/v1/me`;
      const raw = await fetchWithRetry<Record<string, unknown>>(
        url,
        { method: 'GET', timeoutMs: 10_000 },
        1 // single attempt for health check
      );

      return {
        connected: true,
        apiKeyConfigured: true,
        // publisher_id field name confirmed once Ecomobi docs are available
        publisherId: (raw?.publisher_id as string | undefined) ?? getConfig().publisherId ?? undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('healthCheck failed', { error: message });
      return { connected: false, apiKeyConfigured: true, error: message };
    }
  }
}

// ── Singleton export ───────────────────────────────────────────────────────────

let _client: EcomobiApiClientImpl | null = null;

export function getEcomobiApiClient(): EcomobiApiClientImpl {
  if (!_client) _client = new EcomobiApiClientImpl();
  return _client;
}
