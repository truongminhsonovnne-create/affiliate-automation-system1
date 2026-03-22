/**
 * MasOffer API Types — shared with admin dashboard Next.js routes
 */

// Raw API types (as returned by MasOffer Publisher API)
export interface MasOfferCampaign {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  website_url?: string;
  logo_url?: string;
  banner_url?: string;
  category?: string;
  commission_rate?: string;
  commission_type?: string;
  cookie_duration?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MasOfferOfferItem {
  id: number;
  title: string;
  description?: string;
  code?: string;
  discount_type?: string;
  discount_value?: string;
  min_purchase?: string;
  max_discount?: string;
  start_date?: string;
  end_date?: string;
  exclusive?: boolean;
  verified?: boolean;
  used_count?: number;
  click_count?: number;
  conversion_count?: number;
  status?: string;
  terms?: string;
  link?: string;
  image_url?: string;
  logo_url?: string;
  campaign_id?: number;
  campaign_name?: string;
  category?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface MasOfferPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface MasOfferListResponse<T> {
  status: string;
  message?: string;
  data: T[];
  pagination: MasOfferPagination;
  timestamp?: string;
}

export type MasOfferDealsResponse    = MasOfferListResponse<MasOfferOfferItem>;
export type MasOfferVouchersResponse = MasOfferListResponse<MasOfferOfferItem>;
export type MasOfferCouponsResponse  = MasOfferListResponse<MasOfferOfferItem>;
export type MasOfferCampaignsResponse = MasOfferListResponse<MasOfferCampaign>;

export interface MasOfferConnectionTest {
  success: boolean;
  response_time_ms: number;
  tested_at: string;
  campaign_count?: number;
  offer_count?: number;
  error?: string;
}
