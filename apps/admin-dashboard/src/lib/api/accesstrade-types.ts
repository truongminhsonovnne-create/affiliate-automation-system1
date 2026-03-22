/**
 * AccessTrade API — Type Definitions
 *
 * Source: AccessTrade Affiliate Network API
 * Docs: https://docs.accesstrade.vn/
 *
 * SECURITY: These types represent external API responses.
 * Never expose ACCESSTRADE_API_KEY to the browser.
 */

// =============================================================================
// Campaign Types
// =============================================================================

/** AccessTrade campaign status */
export type AccessTradeCampaignStatus = 'active' | 'inactive' | 'pending';

/** Commission type */
export type AccessTradeCommissionType = 'cps' | 'cpl' | 'cpa' | 'cpi';

/** Campaign record from AccessTrade */
export interface AccessTradeCampaign {
  id: number;
  name: string;
  description?: string;
  /** Commission type: CPS (per sale), CPL, CPA, CPI */
  commission_type: AccessTradeCommissionType;
  /** Commission value (percentage for CPS, fixed for others) */
  commission_value: number;
  /** Commission value in percent */
  commission_percent?: number;
  /** Cookie duration in days */
  cookie_duration: number;
  /** Average commission (historical) */
  avg_commission?: number;
  /** Approval type: instant | manual */
  approval_type?: 'instant' | 'manual';
  /** Categories this campaign belongs to */
  categories?: string[];
  /** Landing page URL */
  url?: string;
  /** Status */
  status: AccessTradeCampaignStatus;
  /** Commission cap (if any) */
  commission_cap?: number;
  /** Minimum order value */
  min_order_value?: number;
  /** Created / updated */
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// Deal / Voucher Types
// =============================================================================

/** AccessTrade deal type */
export type AccessTradeDealType = 'voucher' | 'promotion' | 'cashback' | 'flash_sale';

/** AccessTrade deal status */
export type AccessTradeDealStatus = 'active' | 'inactive' | 'expired';

/** Deal / voucher from AccessTrade */
export interface AccessTradeDeal {
  id: number;
  campaign_id: number;
  campaign_name: string;
  /** Deal title */
  title: string;
  /** Deal description */
  description?: string;
  /** Deal type */
  type: AccessTradeDealType;
  /** Discount value (percentage or fixed) */
  discount_value: number;
  /** Discount type: percent | fixed */
  discount_type: 'percent' | 'fixed';
  /** Promo / voucher code */
  code?: string;
  /** Minimum order value to apply deal */
  min_order_value?: number;
  /** Maximum discount amount (cap) */
  max_discount?: number;
  /** Start date ISO */
  start_date: string;
  /** End date ISO */
  end_date: string;
  /** Status */
  status: AccessTradeDealStatus;
  /** Tracking URL */
  tracking_url?: string;
  /** Whether deal is exclusive to AccessTrade */
  is_exclusive?: boolean;
  /** Number of uses / limit */
  usage_limit?: number;
  /** Number of uses remaining */
  uses_remaining?: number;
  /** Updated at */
  updated_at?: string;
}

// =============================================================================
// API Response Wrappers
// =============================================================================

/** Standard paginated AccessTrade API response */
export interface AccessTradePaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  /** API metadata */
  meta?: {
    request_id?: string;
    response_time_ms?: number;
  };
}

/** Simple list response */
export interface AccessTradeListResponse<T> {
  data: T[];
  success: boolean;
}

/** Single item response */
export interface AccessTradeSingleResponse<T> {
  data: T;
  success: boolean;
}

// =============================================================================
// Sync / Ingestion Types (for future DB sync)
// =============================================================================

/** Normalized voucher record for DB ingestion */
export interface NormalizedAccessTradeVoucher {
  /** External ID from AccessTrade */
  external_id: string;
  campaign_id: number;
  campaign_name: string;
  title: string;
  description: string | null;
  deal_type: AccessTradeDealType;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_discount: number | null;
  min_order_value: number | null;
  code: string | null;
  start_date: string;
  end_date: string;
  tracking_url: string | null;
  is_exclusive: boolean;
  status: 'active' | 'inactive' | 'expired';
  /** Platform identifier (e.g. 'shopee') */
  platform: string;
  /** Raw source data snapshot (JSON) */
  raw_data: AccessTradeDeal;
  /** When this record was synced */
  synced_at: string;
}

// =============================================================================
// Connection Test
// =============================================================================

/** Test endpoint response */
export interface AccessTradeConnectionTest {
  success: boolean;
  api_version?: string;
  account_info?: {
    username?: string;
    email?: string;
  };
  campaign_count?: number;
  deal_count?: number;
  response_time_ms: number;
  tested_at: string;
}
