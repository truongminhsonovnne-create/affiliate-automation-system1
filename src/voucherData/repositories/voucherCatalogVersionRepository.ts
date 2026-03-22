// =============================================================================
// Voucher Catalog Version Repository
// Production-grade repository for voucher catalog version history
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { VoucherCatalogVersion } from '../types.js';
import { logger } from '../../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLE_NAME = 'voucher_catalog_versions';

/**
 * Voucher Catalog Version Repository
 */
export const voucherCatalogVersionRepository = {
  /**
   * Find version by ID
   */
  async findById(id: string): Promise<VoucherCatalogVersion | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error({ id, error }, 'Failed to find voucher catalog version');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Find versions by voucher ID
   */
  async findByVoucherId(voucherId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<VoucherCatalogVersion[]> {
    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('voucher_id', voucherId)
      .order('version_number', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ voucherId, error }, 'Failed to find voucher catalog versions');
      throw error;
    }

    return data.map(mapToDomain);
  },

  /**
   * Find latest version for a voucher
   */
  async findLatestByVoucherId(voucherId: string): Promise<VoucherCatalogVersion | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('voucher_id', voucherId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error({ voucherId, error }, 'Failed to find latest voucher catalog version');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Create a new version
   */
  async create(version: VoucherCatalogVersion): Promise<VoucherCatalogVersion> {
    const dbVersion = mapToDb(version);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(dbVersion)
      .select()
      .single();

    if (error) {
      logger.error({ version, error }, 'Failed to create voucher catalog version');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Delete versions older than a date
   */
  async deleteOlderThan(voucherId: string, date: Date): Promise<number> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('voucher_id', voucherId)
      .lt('created_at', date.toISOString())
      .select('id');

    if (error) {
      logger.error({ voucherId, date, error }, 'Failed to delete old voucher catalog versions');
      throw error;
    }

    return data?.length || 0;
  },

  /**
   * Count versions for a voucher
   */
  async countByVoucherId(voucherId: string): Promise<number> {
    const { count, error } = await supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true })
      .eq('voucher_id', voucherId);

    if (error) {
      logger.error({ voucherId, error }, 'Failed to count voucher catalog versions');
      throw error;
    }

    return count || 0;
  },
};

// =============================================================================
// Mapping Functions
// =============================================================================

function mapToDomain(data: Record<string, unknown>): VoucherCatalogVersion {
  return {
    id: data.id as string,
    voucherId: data.voucher_id as string,
    versionNumber: data.version_number as number,
    snapshotPayload: data.snapshot_payload as Record<string, unknown>,
    changeReason: data.change_reason as string | null,
    changedBy: data.changed_by as string | null,
    createdAt: new Date(data.created_at as string),
  };
}

function mapToDb(version: Partial<VoucherCatalogVersion>): Record<string, unknown> {
  return {
    voucher_id: version.voucherId,
    version_number: version.versionNumber,
    snapshot_payload: version.snapshotPayload,
    change_reason: version.changeReason,
    changed_by: version.changedBy,
  };
}
