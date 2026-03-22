/**
 * Ecomobi Integration — Types
 *
 * Raw API DTO types for Ecomobi Publisher API.
 * All interfaces are marked PENDING — will be filled once
 * Ecomobi API documentation and/or sandbox access is available.
 *
 * Expected API base: https://api.ecomobi.com (TBD — pending confirmation)
 * Auth method: Bearer token (TBD)
 *
 * Reference: masoffer and accesstrade integration types for schema patterns.
 */

import type { NormalisedOffer } from '@/lib/api/supabase-write';

// ── Raw API DTOs (PENDING — replace with real shapes from Ecomobi docs) ───────

/**
 * @ts-expect-error PENDING: awaiting Ecomobi API documentation.
 * Ecomobi API paginated response wrapper — structure TBD.
 */
export interface EcomobiPaginatedResponse<T> {
  // TODO: fill once Ecomobi API docs are available
}

/**
 * @ts-expect-error PENDING: awaiting Ecomobi API documentation.
 * Raw offer / campaign / voucher item from Ecomobi API.
 * Field names and structure are placeholders.
 */
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

/**
 * @ts-expect-error PENDING: awaiting Ecomobi API documentation.
 * Ecomobi deals/campaigns list response.
 */
export interface EcomobiOffersResponse {
  // TODO: fill once Ecomobi API docs are available
  // Expected:
  // data: EcomobiRawItem[]
  // pagination?: { page: number; per_page: number; total: number }
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
 * Result of mapping a raw Ecomobi item to the shared NormalisedOffer schema.
 * All fields except source are inherited from NormalisedOffer.
 */
export type EcomobiMappedOffer = Omit<
  NormalisedOffer,
  'id' | 'created_at' | 'updated_at'
> & { source: SourceKey };

// ── Configuration ──────────────────────────────────────────────────────────────

export interface EcomobiConfig {
  apiKey: string;
  publisherId: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

export const ECOMOBI_DEFAULT_CONFIG: Pick<
  EcomobiConfig,
  'timeoutMs' | 'maxRetries'
> = {
  timeoutMs: 15_000,
  maxRetries: 3,
};
