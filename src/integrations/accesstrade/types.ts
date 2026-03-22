/**
 * AccessTrade Integration — Type Definitions
 *
 * Two layers of types:
 *  1. Raw API types  — mirror the AccessTrade Publisher API responses
 *  2. Domain types   — normalised offer model shared across all sources
 *
 * SECURITY: ACCESSTRADE_API_KEY must never appear in browser-accessible code.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// Raw AccessTrade API Types
// =============================================================================

/** AccessTrade campaign status */
export type AccessTradeCampaignStatus = 'active' | 'inactive' | 'pending';

/** Commission model */
export type AccessTradeCommissionType = 'cps' | 'cpl' | 'cpa' | 'cpi';

/** AccessTrade campaign record */
export interface AccessTradeCampaign {
  id: number;
  name: string;
  description?: string;
  commission_type: AccessTradeCommissionType;
  commission_value: number;
  commission_percent?: number;
  cookie_duration: number;
  avg_commission?: number;
  approval_type?: 'instant' | 'manual';
  categories?: string[];
  url?: string;
  status: AccessTradeCampaignStatus;
  commission_cap?: number;
  min_order_value?: number;
  created_at?: string;
  updated_at?: string;
}

/** Deal / voucher type */
export type AccessTradeDealType = 'voucher' | 'promotion' | 'cashback' | 'flash_sale';

/** Deal status */
export type AccessTradeDealStatus = 'active' | 'inactive' | 'expired';

/** AccessTrade deal / voucher record */
export interface AccessTradeDeal {
  id: number;
  campaign_id: number;
  campaign_name: string;
  title: string;
  description?: string;
  type: AccessTradeDealType;
  discount_value: number;
  discount_type: 'percent' | 'fixed';
  code?: string;
  min_order_value?: number;
  max_discount?: number;
  start_date: string;
  end_date: string;
  status: AccessTradeDealStatus;
  tracking_url?: string;
  is_exclusive?: boolean;
  usage_limit?: number;
  uses_remaining?: number;
  updated_at?: string;
}

// =============================================================================
// AccessTrade API Response Wrappers
// =============================================================================

export interface AccessTradePaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AccessTradePaginatedResponse<T> {
  data: T[];
  pagination: AccessTradePaginationMeta;
  meta?: {
    request_id?: string;
    response_time_ms?: number;
  };
}

export interface AccessTradeListResponse<T> {
  data: T[];
  success: boolean;
}

export interface AccessTradeSingleResponse<T> {
  data: T;
  success: boolean;
}

// =============================================================================
// Normalised Domain Types (shared across all offer sources)
// =============================================================================

/** All supported offer sources */
export type OfferSource = 'accesstrade' | 'masoffer' | 'shopee' | 'ecomobi' | 'manual';

/** Sub-type within a source */
export type OfferSourceType = 'campaign' | 'voucher' | 'coupon' | 'deal' | 'promotion';

/** Normalised discount type */
export type NormalisedDiscountType = 'percent' | 'fixed' | 'free_shipping' | 'cashback';

/** Normalised offer status */
export type NormalisedOfferStatus = 'active' | 'inactive' | 'expired' | 'pending';

/** The canonical offer record stored in Supabase */
export interface NormalisedOffer {
  id: string; // UUID, generated on insert
  source: OfferSource;
  source_type: OfferSourceType;
  external_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  merchant_name: string;
  merchant_id: string | null;
  category: string | null;
  destination_url: string | null;
  tracking_url: string | null;
  coupon_code: string | null;
  discount_type: NormalisedDiscountType | null;
  discount_value: number | null;
  max_discount: number | null;
  min_order_value: number | null;
  currency: string;
  start_at: string | null;
  end_at: string | null;
  status: NormalisedOfferStatus;
  terms: string | null;
  image_url: string | null;
  confidence_score: number; // 0.0 – 1.0
  last_seen_at: string;
  first_seen_at: string;
  synced_at: string;
  raw_payload_jsonb: Record<string, unknown>;
  normalized_hash: string; // SHA-256 of key fields for dedupe
  created_at: string;
  updated_at: string;
}

/** Offer source metadata row */
export interface OfferSourceRecord {
  id: string;
  key: string;
  name: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/** Offer snapshot for change tracking */
export interface OfferSnapshotRecord {
  id: string;
  offer_id: string;
  raw_payload_jsonb: Record<string, unknown>;
  captured_at: string;
  checksum: string;
}

/** Sync run status */
export type SyncRunStatus = 'running' | 'completed' | 'failed' | 'cancelled';

/** A single sync job execution log */
export interface SyncRunRecord {
  id: string;
  source: string;
  job_name: string;
  status: SyncRunStatus;
  started_at: string;
  finished_at: string | null;
  records_fetched: number;
  records_inserted: number;
  records_updated: number;
  records_skipped: number;
  error_summary: string | null;
}

/** A single error that occurred during a sync run */
export interface SyncErrorRecord {
  id: string;
  sync_run_id: string | null;
  source: string;
  external_id: string | null;
  stage: 'fetch' | 'normalize' | 'dedupe' | 'upsert' | 'snapshot';
  error_message: string;
  raw_context: Record<string, unknown> | null;
  created_at: string;
}

// =============================================================================
// Client / Service Config
// =============================================================================

export interface AccessTradeClientConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface FetchCampaignsOptions {
  page?: number;
  pageSize?: number;
  status?: AccessTradeCampaignStatus;
}

export interface FetchDealsOptions {
  page?: number;
  pageSize?: number;
  campaignId?: number;
  type?: AccessTradeDealType;
  status?: AccessTradeDealStatus;
}

export interface SyncOptions {
  source: OfferSource;
  jobName: string;
  dryRun?: boolean;
  forceRescan?: boolean;
}

// =============================================================================
// Supabase Repository Interface
// =============================================================================

export interface OfferRepository {
  upsert(offer: Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string; operation: 'insert' | 'update' | 'skip' }>;
  upsertBatch(offers: Omit<NormalisedOffer, 'id' | 'created_at' | 'updated_at'>[]): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
  }>;
  findByExternalId(source: string, externalId: string): Promise<NormalisedOffer | null>;
  takeSnapshot(offerId: string, payload: Record<string, unknown>): Promise<void>;
  getOfferCount(source?: string): Promise<number>;
  getRecentOffers(source: string, limit: number): Promise<NormalisedOffer[]>;
}

export interface SyncRunRepository {
  create(source: string, jobName: string): Promise<SyncRunRecord>;
  complete(runId: string, stats: {
    recordsFetched: number;
    recordsInserted: number;
    recordsUpdated: number;
    recordsSkipped: number;
    errorSummary?: string;
  }): Promise<void>;
  fail(runId: string, errorSummary: string): Promise<void>;
  getLastRun(source: string): Promise<SyncRunRecord | null>;
}

export interface SyncErrorRepository {
  insert(error: Omit<SyncErrorRecord, 'id' | 'created_at'>): Promise<void>;
}
