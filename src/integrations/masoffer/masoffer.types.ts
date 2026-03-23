/**
 * MasOffer Publisher API — Types
 *
 * Raw API DTOs as returned by the MasOffer Publisher API v1.
 * Endpoint: https://publisher-api.masoffer.net/v1/{campaigns|deals|coupons|vouchers}
 * Auth: Bearer token in Authorization header + publisher_id as query param.
 *
 * Source docs: https://publisher-api.masoffer.net/docs
 */

import type { NormalisedOffer, OfferSource } from '../accesstrade/types.js';

// ── Raw API DTOs ─────────────────────────────────────────────────────────────

/** Campaign item from GET /v1/campaigns */
export interface MasOfferCampaign {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  website_url?: string;
  logo_url?: string;
  banner_url?: string;
  category?: string;
  commission_rate?: string;       // e.g. "10%" or "10"
  commission_type?: string;       // e.g. "percentage", "fixed"
  cookie_duration?: number;       // days
  status?: string;               // active | inactive | pending
  created_at?: string;
  updated_at?: string;
}

/** Generic paginated list wrapper used across all MasOffer v1 endpoints */
export interface MasOfferListResponse<T> {
  status: string;
  message?: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  timestamp?: string;
}

/** MasOffer offer type — used by /v1/offer/all, /v1/offer/brand, /v1/offer/pushsale */
export type MasOfferOfferType = 'deal' | 'voucher' | 'coupon' | 'promotion' | 'pushsale' | 'hot_deal' | 'flash_sale';

/** Individual deal/voucher/coupon item from GET /v1/deals | /v1/vouchers | /v1/coupons | /v1/offer/all | /v1/offer/pushsale */
export interface MasOfferOfferItem {
  id: number;
  /** Explicit offer type (present on /v1/offer/all and /v1/offer/pushsale responses) */
  type?: MasOfferOfferType;
  title: string;
  description?: string;
  code?: string;
  discount_type?: string;        // percentage | fixed | free_shipping | other
  discount_value?: string;       // e.g. "20%" or "200000"
  min_purchase?: string;
  max_discount?: string;
  start_date?: string;
  end_date?: string;
  exclusive?: boolean;
  verified?: boolean;
  used_count?: number;
  click_count?: number;
  conversion_count?: number;
  status?: string;               // active | expired | upcoming
  terms?: string;
  link?: string;                 // affiliate/deep link
  image_url?: string;
  logo_url?: string;
  campaign_id?: number;
  campaign_name?: string;
  category?: string;
  tags?: string[];
  /** Brand/merchant name (used by /v1/offer/brand) */
  brand_name?: string;
  created_at?: string;
  updated_at?: string;
}

export type MasOfferDealsResponse     = MasOfferListResponse<MasOfferOfferItem>;
export type MasOfferVouchersResponse  = MasOfferListResponse<MasOfferOfferItem>;
export type MasOfferCouponsResponse   = MasOfferListResponse<MasOfferOfferItem>;
export type MasOfferPromotionsResponse = MasOfferListResponse<MasOfferOfferItem>;
/** Combined endpoint: /v1/offer/all — returns deals, vouchers, coupons in one call */
export type MasOfferOfferAllResponse  = MasOfferListResponse<MasOfferOfferItem>;
/** Pushsale/hot deals endpoint: /v1/offer/pushsale — returns only hot & exclusive deals */
export type MasOfferPushSaleResponse  = MasOfferListResponse<MasOfferOfferItem>;
/** Brand-based offers: /v1/offer/brand — filtered by merchant/brand */
export type MasOfferBrandResponse     = MasOfferListResponse<MasOfferOfferItem>;
export type MasOfferCampaignsResponse = MasOfferListResponse<MasOfferCampaign>;

// ── Client Config ────────────────────────────────────────────────────────────

export interface MasOfferClientConfig {
  /** MasOffer Publisher ID (required) */
  publisherId: string;
  /** MasOffer API Token (required, server-side only) */
  apiToken: string;
  /** Base URL for the MasOffer Publisher API. Defaults to https://publisher-api.masoffer.net */
  baseUrl?: string;
  /** Request timeout in milliseconds. Default 15000. */
  timeoutMs?: number;
  /** Max retry attempts for transient errors (429, 5xx). Default 3. */
  maxRetries?: number;
}

// ── Sync Options ─────────────────────────────────────────────────────────────

export interface FetchOffersOptions {
  page?: number;
  pageSize?: number;
  /** Campaign ID to filter offers by campaign */
  campaignId?: number;
  /** Brand ID to filter offers by brand (used with /v1/offer/brand) */
  brandId?: number;
  /** Status filter: active | expired | upcoming */
  status?: string;
  /** Category filter */
  category?: string;
}

export interface SyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

// ── Domain model (same NormalisedOffer used by AccessTrade) ──────────────────

/** MasOffer offer mapped into the shared domain model. */
export type MasOfferNormalisedOffer = NormalisedOffer;

// The shared schema supports 'masoffer' as a source value.
export type MasOfferSource = Extract<OfferSource, 'masoffer'>;
