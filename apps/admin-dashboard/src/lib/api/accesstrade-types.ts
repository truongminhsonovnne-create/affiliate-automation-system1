/**
 * AccessTrade API — Type Definitions (admin-dashboard copy)
 *
 * Updated to match real API docs:
 * https://developers.accesstrade.vn/api-publisher-vietnamese
 * https://developers.accesstrade.vn/api-accesstrade-tai-lieu-tich-hop/get-promotional-information
 * https://developers.accesstrade.vn/api-accesstrade-tai-lieu-tich-hop/get-the-campaigns-list
 *
 * SECURITY: Never expose ACCESSTRADE_API_KEY to the browser.
 */

// =============================================================================
// Offers (unified endpoint: /v1/offers_informations)
// =============================================================================

/**
 * Real AccessTrade API response from GET /v1/offers_informations
 * Docs: developers.accesstrade.vn — "Lấy thông tin vouchers / coupons / deals"
 */
export interface AccessTradeOffer {
  id: string;
  name: string;
  content?: string;
  domain?: string;
  merchant?: string;
  link?: string;
  aff_link?: string;
  image?: string;
  banners?: Array<{ link: string; width: string; height: string }>;
  start_time?: string;
  end_time?: string;
  categories?: string[];
  /** Coupon codes as string array, e.g. ["ABC123", "XYZ789"] */
  coupons?: string[];
  /** Flat code fallback */
  code?: string;
}

/** /v1/offers_informations response — NO pagination wrapper */
export interface AccessTradeOffersResponse {
  data: AccessTradeOffer[];
}

// =============================================================================
// Campaigns (endpoint: /v1/campaigns)
// =============================================================================

/**
 * Real AccessTrade campaign record from GET /v1/campaigns
 * Docs: developers.accesstrade.vn — "Lấy danh sách campaigns"
 */
export interface AccessTradeCampaign {
  id: string;
  name: string;
  approval?: 'Unregistered' | 'Pending' | 'Successful';
  status?: number;
  merchant?: string;
  conversion_policy?: string;
  cookie_duration?: number;
  cookie_policy?: string;
  description?: {
    action_point?: string;
    commission_policy?: string;
    introduction?: string;
    other_notice?: string;
    rejected_reason?: string;
    traffic_building_policy?: string;
  };
  start_time?: string;
  end_time?: string | null;
  category?: string;
  sub_category?: string;
  type?: number;
  url?: string;
  logo?: string;
  scope?: string;
}

/** /v1/campaigns response */
export interface AccessTradeCampaignsResponse {
  data: AccessTradeCampaign[];
}

// =============================================================================
// Legacy types (kept for reference, DO NOT use)
// =============================================================================

/** @deprecated — /v1/deals does not exist. Use AccessTradeOffer. */
export type AccessTradeDeal = Record<string, never>;
/** @deprecated */
export type AccessTradeDealType = never;
/** @deprecated */
export type AccessTradeDealStatus = never;
/** @deprecated */
export type AccessTradeVoucherType = never;
/** @deprecated */
export type AccessTradeCommissionType = never;
/** @deprecated */
export type AccessTradeCampaignStatus = never;

/** @deprecated */
export interface AccessTradePaginatedResponse<T> {
  data: T[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
  meta?: { request_id?: string; response_time_ms?: number };
}
/** @deprecated */
export interface AccessTradeListResponse<T> { data: T[]; success: boolean }
/** @deprecated */
export interface AccessTradeSingleResponse<T> { data: T; success: boolean }
/** @deprecated */
export interface NormalizedAccessTradeVoucher {}

// =============================================================================
// Connection Test
// =============================================================================

export interface AccessTradeConnectionTest {
  success: boolean;
  offer_count?: number;
  response_time_ms: number;
  tested_at: string;
  error?: string;
}
