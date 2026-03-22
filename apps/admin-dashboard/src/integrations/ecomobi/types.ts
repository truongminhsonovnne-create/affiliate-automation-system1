/**
 * Ecomobi Integration — Types
 *
 * Raw API DTO types for Ecomobi Publisher API.
 * All interfaces are placeholders — will be replaced with real shapes
 * once Ecomobi API documentation and/or sandbox access is available.
 *
 * Expected API base: https://api.ecomobi.com (TBD — pending confirmation)
 * Auth method: Bearer token (TBD)
 *
 * Reference: masoffer and accesstrade integration types for schema patterns.
 */

// ── Raw API DTOs (PENDING — replace with real shapes from Ecomobi docs) ───────

// @ts-expect-error PENDING: awaiting Ecomobi API documentation.
export interface EcomobiPaginatedResponse<T> {
  // TODO: fill once Ecomobi API docs are available
  data?: T[];
  pagination?: EcomobiPaginationMeta;
}

// @ts-expect-error PENDING: awaiting Ecomobi API documentation.
export interface EcomobiRawItem {
  // TODO: fill once Ecomobi API docs are available
  // Expected fields (TBD based on Ecomobi API):
  // - id: string | number
  // - title: string
  // - description?: string
  // - code?: string          // coupon/voucher code
  // - discount?: string      // e.g. "10%" or "10.000đ"
  // - discount_type?: string  // "percent" | "fixed" | "free_shipping"
  // - min_purchase?: string
  // - max_discount?: string
  // - start_date?: string
  // - end_date?: string
  // - link?: string
  // - image_url?: string
  // - merchant_name?: string
  // - merchant_id?: string | number
  // - category?: string
  // - status?: string
  // - exclusive?: boolean
  // - verified?: boolean
}

// @ts-expect-error PENDING: awaiting Ecomobi API documentation.
export interface EcomobiOffersResponse {
  // TODO: fill once Ecomobi API docs are available
  data?: EcomobiRawItem[];
}

// ── Domain types ───────────────────────────────────────────────────────────────

/** Source key constant */
export const SOURCE_KEY = 'ecomobi' as const;
export type SourceKey = typeof SOURCE_KEY;

/** Ecomobi-specific deal subtypes */
export type EcomobiDealType =
  | 'coupon'     // Voucher/coupon code
  | 'deal'       // Deal/discount offer
  | 'campaign'   // Promotional campaign
  | 'flash_sale'  // Time-limited flash sale
  | 'pushsale';  // Pushsale/promotion

/** Ecomobi API status values (TBD) */
export type EcomobiStatus = 'active' | 'inactive' | 'expired' | 'pending' | string;

// ── Mapped domain types (mirror NormalisedOffer shape) ────────────────────────

/**
 * Ecomobi mapped offer — mirrors the fields returned by mapEcomobiItemToOffer.
 * Copied here rather than importing NormalisedOffer (which is not exported
 * from supabase-write in this workspace).
 */
export interface EcomobiMappedOffer {
  source: SourceKey;
  source_type: string;
  external_id: string;
  title: string;
  slug: string;
  description: string | null;
  merchant_name: string;
  merchant_id: string | null;
  category: string | null;
  destination_url: string | null;
  tracking_url: string | null;
  coupon_code: string | null;
  discount_type: string | null;
  discount_value: number | null;
  max_discount: number | null;
  min_order_value: number | null;
  currency: string;
  start_at: string | null;
  end_at: string | null;
  status: string;
  terms: string | null;
  image_url: string | null;
  confidence_score: number;
  last_seen_at: string;
  first_seen_at: string;
  synced_at: string;
  raw_payload_jsonb: Record<string, unknown>;
  normalized_hash: string;
}

// ── Configuration ──────────────────────────────────────────────────────────────

export interface EcomobiConfig {
  apiKey: string;
  publisherId: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface EcomobiPaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export const ECOMOBI_DEFAULT_CONFIG: Pick<
  EcomobiConfig,
  'timeoutMs' | 'maxRetries'
> = {
  timeoutMs: 15_000,
  maxRetries: 3,
};
