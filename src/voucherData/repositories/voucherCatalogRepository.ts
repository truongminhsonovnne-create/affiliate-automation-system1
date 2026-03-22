// =============================================================================
// Voucher Catalog Repository
// Production-grade repository for voucher catalog
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { VoucherNormalizedRecord, VoucherFreshnessStatus, VoucherPlatform } from '../types.js';
import { logger } from '../../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLE_NAME = 'voucher_catalog';

/**
 * Voucher Catalog Repository
 */
export const voucherCatalogRepository = {
  /**
   * Find voucher by ID
   */
  async findById(id: string): Promise<VoucherNormalizedRecord | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error({ id, error }, 'Failed to find voucher');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Find voucher by external ID and source
   */
  async findByExternalId(externalId: string, sourceId: string): Promise<VoucherNormalizedRecord | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('external_id', externalId)
      .eq('source_id', sourceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error({ externalId, sourceId, error }, 'Failed to find voucher by external ID');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Find all vouchers with filters
   */
  async findAll(options?: {
    platform?: VoucherPlatform;
    isActive?: boolean;
    freshnessStatus?: VoucherFreshnessStatus;
    sourceId?: string;
    limit?: number;
    offset?: number;
  }): Promise<VoucherNormalizedRecord[]> {
    let query = supabase.from(TABLE_NAME).select('*');

    if (options?.platform) {
      query = query.eq('platform', options.platform);
    }

    if (options?.isActive !== undefined) {
      query = query.eq('is_active', options.isActive);
    }

    if (options?.freshnessStatus) {
      query = query.eq('freshness_status', options.freshnessStatus);
    }

    if (options?.sourceId) {
      query = query.eq('source_id', options.sourceId);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error({ options, error }, 'Failed to find vouchers');
      throw error;
    }

    return data.map(mapToDomain);
  },

  /**
   * Find active vouchers for platform
   */
  async findActiveForPlatform(platform: VoucherPlatform, limit?: number): Promise<VoucherNormalizedRecord[]> {
    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('platform', platform)
      .eq('is_active', true)
      .eq('freshness_status', 'fresh');

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error({ platform, limit, error }, 'Failed to find active vouchers for platform');
      throw error;
    }

    return data.map(mapToDomain);
  },

  /**
   * Create a new voucher
   */
  async create(voucher: VoucherNormalizedRecord): Promise<VoucherNormalizedRecord> {
    const dbVoucher = mapToDb(voucher);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(dbVoucher)
      .select()
      .single();

    if (error) {
      logger.error({ voucher, error }, 'Failed to create voucher');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Update a voucher
   */
  async update(id: string, updates: Partial<VoucherNormalizedRecord>): Promise<VoucherNormalizedRecord> {
    const dbUpdates = mapToDb(updates);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ id, updates, error }, 'Failed to update voucher');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Update freshness status
   */
  async updateFreshnessStatus(id: string, status: VoucherFreshnessStatus): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({
        freshness_status: status,
        last_validated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      logger.error({ id, status, error }, 'Failed to update freshness status');
      throw error;
    }
  },

  /**
   * Deactivate a voucher
   */
  async deactivate(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      logger.error({ id, error }, 'Failed to deactivate voucher');
      throw error;
    }
  },

  /**
   * Delete a voucher
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      logger.error({ id, error }, 'Failed to delete voucher');
      throw error;
    }
  },

  /**
   * Count vouchers
   */
  async count(options?: {
    platform?: VoucherPlatform;
    isActive?: boolean;
    freshnessStatus?: VoucherFreshnessStatus;
  }): Promise<number> {
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true });

    if (options?.platform) {
      query = query.eq('platform', options.platform);
    }

    if (options?.isActive !== undefined) {
      query = query.eq('is_active', options.isActive);
    }

    if (options?.freshnessStatus) {
      query = query.eq('freshness_status', options.freshnessStatus);
    }

    const { count, error } = await query;

    if (error) {
      logger.error({ options, error }, 'Failed to count vouchers');
      throw error;
    }

    return count || 0;
  },

  /**
   * Search vouchers by code or title
   */
  async search(query: string, platform?: VoucherPlatform, limit?: number): Promise<VoucherNormalizedRecord[]> {
    let supabaseQuery = supabase
      .from(TABLE_NAME)
      .select('*')
      .or(`code.ilike.%${query}%,title.ilike.%${query}%`)
      .eq('is_active', true);

    if (platform) {
      supabaseQuery = supabaseQuery.eq('platform', platform);
    }

    if (limit) {
      supabaseQuery = supabaseQuery.limit(limit);
    }

    const { data, error } = await supabaseQuery.order('created_at', { ascending: false });

    if (error) {
      logger.error({ query, platform, limit, error }, 'Failed to search vouchers');
      throw error;
    }

    return data.map(mapToDomain);
  },
};

// =============================================================================
// Mapping Functions
// =============================================================================

function mapToDomain(data: Record<string, unknown>): VoucherNormalizedRecord {
  return {
    id: data.id as string,
    externalId: data.external_id as string,
    sourceId: data.source_id as string,
    code: data.code as string,
    title: data.title as string,
    description: data.description as string | null,
    platform: data.platform as VoucherPlatform,
    discountType: data.discount_type as VoucherNormalizedRecord['discountType'],
    discountValue: data.discount_value as number,
    minSpend: data.min_spend as number | null,
    maxDiscount: data.max_discount as number | null,
    startDate: new Date(data.start_date as string),
    endDate: new Date(data.end_date as string),
    isActive: data.is_active as boolean,
    scope: data.scope as VoucherNormalizedRecord['scope'],
    applicableShopIds: (data.applicable_shop_ids as string[]) || [],
    applicableCategoryIds: (data.applicable_category_ids as string[]) || [],
    applicableProductIds: (data.applicable_product_ids as string[]) || [],
    constraints: (data.constraints as VoucherNormalizedRecord['constraints']) || [],
    campaignName: data.campaign_name as string | null,
    campaignMetadata: data.campaign_metadata as Record<string, unknown> | null,
    sourceRawData: (data.source_raw_data as Record<string, unknown>) || {},
    freshnessStatus: (data.freshness_status as VoucherFreshnessStatus) || 'unknown',
    lastValidatedAt: data.last_validated_at ? new Date(data.last_validated_at as string) : null,
    qualityScore: data.quality_score as number | null,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}

function mapToDb(voucher: Partial<VoucherNormalizedRecord>): Record<string, unknown> {
  return {
    external_id: voucher.externalId,
    source_id: voucher.sourceId,
    code: voucher.code,
    title: voucher.title,
    description: voucher.description,
    platform: voucher.platform,
    discount_type: voucher.discountType,
    discount_value: voucher.discountValue,
    min_spend: voucher.minSpend,
    max_discount: voucher.maxDiscount,
    start_date: voucher.startDate?.toISOString(),
    end_date: voucher.endDate?.toISOString(),
    is_active: voucher.isActive,
    scope: voucher.scope,
    applicable_shop_ids: voucher.applicableShopIds,
    applicable_category_ids: voucher.applicableCategoryIds,
    applicable_product_ids: voucher.applicableProductIds,
    constraints: voucher.constraints,
    campaign_name: voucher.campaignName,
    campaign_metadata: voucher.campaignMetadata,
    source_raw_data: voucher.sourceRawData,
    freshness_status: voucher.freshnessStatus,
    last_validated_at: voucher.lastValidatedAt?.toISOString(),
    quality_score: voucher.qualityScore,
  };
}
