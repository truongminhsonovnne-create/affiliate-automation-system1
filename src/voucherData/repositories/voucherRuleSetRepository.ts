// =============================================================================
// Voucher Rule Set Repository
// Production-grade repository for voucher rule sets
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { VoucherRuleSet, VoucherRuleStatus, VoucherRuleValidationStatus } from '../types.js';
import { logger } from '../../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLE_NAME = 'voucher_rule_sets';

/**
 * Voucher Rule Set Repository
 */
export const voucherRuleSetRepository = {
  /**
   * Find rule set by ID
   */
  async findById(id: string): Promise<VoucherRuleSet | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error({ id, error }, 'Failed to find voucher rule set');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Find rule sets by voucher ID
   */
  async findByVoucherId(voucherId: string): Promise<VoucherRuleSet[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('voucher_id', voucherId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ voucherId, error }, 'Failed to find voucher rule sets by voucher ID');
      throw error;
    }

    return data.map(mapToDomain);
  },

  /**
   * Find active rule for a voucher
   */
  async findActiveByVoucherId(voucherId: string): Promise<VoucherRuleSet | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('voucher_id', voucherId)
      .eq('rule_status', 'active')
      .order('activated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error({ voucherId, error }, 'Failed to find active voucher rule');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Find rule sets with filters
   */
  async findWithFilters(options?: {
    voucherId?: string;
    ruleStatus?: VoucherRuleStatus;
    validationStatus?: VoucherRuleValidationStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ ruleSets: VoucherRuleSet[]; total: number }> {
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact' });

    if (options?.voucherId) {
      query = query.eq('voucher_id', options.voucherId);
    }

    if (options?.ruleStatus) {
      query = query.eq('rule_status', options.ruleStatus);
    }

    if (options?.validationStatus) {
      query = query.eq('validation_status', options.validationStatus);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error({ options, error }, 'Failed to find voucher rule sets with filters');
      throw error;
    }

    return {
      ruleSets: data.map(mapToDomain),
      total: count || 0,
    };
  },

  /**
   * Create a new rule set
   */
  async create(ruleSet: VoucherRuleSet): Promise<VoucherRuleSet> {
    const dbRuleSet = mapToDb(ruleSet);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(dbRuleSet)
      .select()
      .single();

    if (error) {
      logger.error({ ruleSet, error }, 'Failed to create voucher rule set');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Update a rule set
   */
  async update(id: string, updates: Partial<VoucherRuleSet>): Promise<VoucherRuleSet> {
    const dbUpdates = mapToDb(updates);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ id, updates, error }, 'Failed to update voucher rule set');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Delete a rule set
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      logger.error({ id, error }, 'Failed to delete voucher rule set');
      throw error;
    }
  },

  /**
   * Count rule sets
   */
  async count(options?: {
    voucherId?: string;
    ruleStatus?: VoucherRuleStatus;
    validationStatus?: VoucherRuleValidationStatus;
  }): Promise<number> {
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true });

    if (options?.voucherId) {
      query = query.eq('voucher_id', options.voucherId);
    }

    if (options?.ruleStatus) {
      query = query.eq('rule_status', options.ruleStatus);
    }

    if (options?.validationStatus) {
      query = query.eq('validation_status', options.validationStatus);
    }

    const { count, error } = await query;

    if (error) {
      logger.error({ options, error }, 'Failed to count voucher rule sets');
      throw error;
    }

    return count || 0;
  },

  /**
   * Find rules by status
   */
  async findByStatus(status: VoucherRuleStatus, options?: {
    limit?: number;
    offset?: number;
  }): Promise<VoucherRuleSet[]> {
    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('rule_status', status)
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ status, error }, 'Failed to find voucher rule sets by status');
      throw error;
    }

    return data.map(mapToDomain);
  },
};

// =============================================================================
// Mapping Functions
// =============================================================================

function mapToDomain(data: Record<string, unknown>): VoucherRuleSet {
  return {
    id: data.id as string,
    voucherId: data.voucher_id as string,
    ruleVersion: data.rule_version as string,
    ruleStatus: data.rule_status as VoucherRuleStatus,
    rulePayload: data.rule_payload as VoucherRuleSet['rulePayload'],
    validationStatus: data.validation_status as VoucherRuleValidationStatus,
    validationErrors: data.validation_errors as VoucherRuleSet['validationErrors'],
    createdBy: data.created_by as string | null,
    activatedAt: data.activated_at ? new Date(data.activated_at as string) : null,
    deactivatedAt: data.deactivated_at ? new Date(data.deactivated_at as string) : null,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}

function mapToDb(ruleSet: Partial<VoucherRuleSet>): Record<string, unknown> {
  return {
    voucher_id: ruleSet.voucherId,
    rule_version: ruleSet.ruleVersion,
    rule_status: ruleSet.ruleStatus,
    rule_payload: ruleSet.rulePayload,
    validation_status: ruleSet.validationStatus,
    validation_errors: ruleSet.validationErrors,
    created_by: ruleSet.createdBy,
    activated_at: ruleSet.activatedAt?.toISOString(),
    deactivated_at: ruleSet.deactivatedAt?.toISOString(),
  };
}
