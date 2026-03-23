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

/**
 * MasOffer /v1/promotions response item.
 * Real API fields as observed from https://publisher-api.masoffer.net/v1/promotions
 */
export interface MasOfferPromotionsItem {
  offer_id: string;
  started_date: string;           // e.g. "29-06-2021 00:00:00"
  expired_date: string;           // e.g. "30-11-2030 21:55:59"
  title: string;
  slug: string;
  content: string;                // HTML description
  status: number;               // 1 = active
  type: string;                 // e.g. "coupon"
  coupon_code: string;
  discount_type: string;         // e.g. "fixed"
  discount: string;             // e.g. "5000"
  external_links: string[];
  id: string;                   // e.g. "60a93a4fd79bb50f950b5a24"
  started_time: number;          // Unix ms timestamp
  expired_time: number;         // Unix ms timestamp
  aff_link: string;             // affiliate tracking URL
}

/**
 * MasOffer /offer/all response item (merchant-level, not deal-level).
 * Real API fields: name, domain, offer_id, address, product_type, commission_rate, etc.
 */
export interface MasOfferMerchantItem {
  name: string;
  domain: string;
  offer_id: string;
  address?: string;
  product_type?: string;
  commission_rate?: string;
  commission_rule?: string;
  cookie_rule?: string;
  about?: string;
  avatar?: string;
  cover?: string;
}

/** Individual deal/voucher/coupon item from GET /v1/deals | /v1/vouchers | /v1/coupons | /v1/offer/all | /v1/offer/pushsale */
export interface MasOfferOfferItem {
  id: number | string;
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
  status?: string | number;               // active | expired | upcoming | 1 | 0
  terms?: string;
  link?: string;                 // affiliate/deep link
  image_url?: string;
  logo_url?: string;
  campaign_id?: number | string;
  campaign_name?: string;
  category?: string;
  tags?: string[];
  /** MasOffer /v1/promotions specific */
  content?: string;
  discount?: string;
  external_links?: string[];
  aff_link?: string;
  started_time?: number;
  expired_time?: number;
  started_date?: string;
  expired_date?: string;
  offer_id?: string;
  slug?: string;
  /** Brand/merchant name (used by /v1/offer/brand) */
  brand_name?: string;
  created_at?: string;
  updated_at?: string;
}

export type MasOfferDealsResponse     = MasOfferListResponse<MasOfferOfferItem>;
export type MasOfferVouchersResponse  = MasOfferListResponse<MasOfferOfferItem>;
export type MasOfferCouponsResponse   = MasOfferListResponse<MasOfferOfferItem>;
export type MasOfferPromotionsResponse = MasOfferListResponse<MasOfferPromotionsItem>;
/** Combined endpoint: /offer/all — returns merchant info (not deals) */
export type MasOfferOfferAllResponse  = MasOfferListResponse<MasOfferMerchantItem>;
/** Pushsale/hot deals endpoint: /offer/pushsale — returns only hot & exclusive deals */
export type MasOfferPushSaleResponse  = MasOfferListResponse<MasOfferOfferItem>;
/** Brand-based offers: /offer/brand — filtered by merchant/brand */
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
