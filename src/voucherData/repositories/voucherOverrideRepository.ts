// =============================================================================
// Voucher Override Repository
// Production-grade repository for voucher rule overrides
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { VoucherOverrideRecord, VoucherOverrideType, VoucherOverrideStatus } from '../types.js';
import { logger } from '../../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLE_NAME = 'voucher_rule_overrides';

/**
 * Voucher Override Repository
 */
export const voucherOverrideRepository = {
  /**
   * Find override by ID
   */
  async findById(id: string): Promise<VoucherOverrideRecord | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error({ id, error }, 'Failed to find voucher override');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Find overrides by voucher ID
   */
  async findByVoucherId(voucherId: string): Promise<VoucherOverrideRecord[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('voucher_id', voucherId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ voucherId, error }, 'Failed to find voucher overrides');
      throw error;
    }

    return data.map(mapToDomain);
  },

  /**
   * Find active overrides by voucher ID
   */
  async findActiveByVoucherId(voucherId: string): Promise<VoucherOverrideRecord[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('voucher_id', voucherId)
      .eq('override_status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ voucherId, error }, 'Failed to find active voucher overrides');
      throw error;
    }

    return data.map(mapToDomain);
  },

  /**
   * Find expired overrides
   */
  async findExpired(asOf: Date): Promise<VoucherOverrideRecord[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('override_status', 'active')
      .lt('expires_at', asOf.toISOString());

    if (error) {
      logger.error({ asOf, error }, 'Failed to find expired voucher overrides');
      throw error;
    }

    return data.map(mapToDomain);
  },

  /**
   * Find all overrides with pagination
   */
  async findAll(options?: {
    voucherId?: string;
    overrideType?: VoucherOverrideType;
    overrideStatus?: VoucherOverrideStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ overrides: VoucherOverrideRecord[]; total: number }> {
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact' });

    if (options?.voucherId) {
      query = query.eq('voucher_id', options.voucherId);
    }

    if (options?.overrideType) {
      query = query.eq('override_type', options.overrideType);
    }

    if (options?.overrideStatus) {
      query = query.eq('override_status', options.overrideStatus);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error({ options, error }, 'Failed to find all voucher overrides');
      throw error;
    }

    return {
      overrides: data.map(mapToDomain),
      total: count || 0,
    };
  },

  /**
   * Create a new override
   */
  async create(override: VoucherOverrideRecord): Promise<VoucherOverrideRecord> {
    const dbOverride = mapToDb(override);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(dbOverride)
      .select()
      .single();

    if (error) {
      logger.error({ override, error }, 'Failed to create voucher override');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Update an override
   */
  async update(id: string, updates: Partial<VoucherOverrideRecord>): Promise<VoucherOverrideRecord> {
    const dbUpdates = mapToDb(updates);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ id, updates, error }, 'Failed to update voucher override');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Delete an override
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      logger.error({ id, error }, 'Failed to delete voucher override');
      throw error;
    }
  },

  /**
   * Delete overrides older than a date
   */
  async deleteOlderThan(date: Date): Promise<number> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .lt('created_at', date.toISOString())
      .select('id');

    if (error) {
      logger.error({ date, error }, 'Failed to delete old voucher overrides');
      throw error;
    }

    return data?.length || 0;
  },
};

// =============================================================================
// Mapping Functions
// =============================================================================

function mapToDomain(data: Record<string, unknown>): VoucherOverrideRecord {
  return {
    id: data.id as string,
    voucherId: data.voucher_id as string,
    overrideType: data.override_type as VoucherOverrideType,
    overridePayload: data.override_payload as Record<string, unknown>,
    overrideStatus: data.override_status as VoucherOverrideStatus,
    createdBy: data.created_by as string | null,
    expiresAt: data.expires_at ? new Date(data.expires_at as string) : null,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}

function mapToDb(override: Partial<VoucherOverrideRecord>): Record<string, unknown> {
  return {
    voucher_id: override.voucherId,
    override_type: override.overrideType,
    override_payload: override.overridePayload,
    override_status: override.overrideStatus,
    created_by: override.createdBy,
    expires_at: override.expiresAt?.toISOString(),
  };
}
