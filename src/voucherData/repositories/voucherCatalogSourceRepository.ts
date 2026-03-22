// =============================================================================
// Voucher Catalog Source Repository
// Production-grade repository for voucher catalog sources
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { VoucherCatalogSource, VoucherSourceType, VoucherPlatform } from '../types.js';
import { logger } from '../../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLE_NAME = 'voucher_catalog_sources';

/**
 * Voucher Catalog Source Repository
 */
export const voucherCatalogSourceRepository = {
  /**
   * Find source by ID
   */
  async findById(id: string): Promise<VoucherCatalogSource | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error({ id, error }, 'Failed to find voucher catalog source');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Find source by name
   */
  async findByName(sourceName: string): Promise<VoucherCatalogSource | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('source_name', sourceName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error({ sourceName, error }, 'Failed to find voucher catalog source by name');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Find all active sources
   */
  async findActive(): Promise<VoucherCatalogSource[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('is_active', true)
      .order('source_name');

    if (error) {
      logger.error({ error }, 'Failed to find active voucher catalog sources');
      throw error;
    }

    return data.map(mapToDomain);
  },

  /**
   * Find sources by platform
   */
  async findByPlatform(platform: VoucherPlatform): Promise<VoucherCatalogSource[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('platform', platform)
      .eq('is_active', true)
      .order('source_name');

    if (error) {
      logger.error({ platform, error }, 'Failed to find voucher catalog sources by platform');
      throw error;
    }

    return data.map(mapToDomain);
  },

  /**
   * Find all sources
   */
  async findAll(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ sources: VoucherCatalogSource[]; total: number }> {
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact' });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query.order('source_name');

    if (error) {
      logger.error({ error }, 'Failed to find all voucher catalog sources');
      throw error;
    }

    return {
      sources: data.map(mapToDomain),
      total: count || 0,
    };
  },

  /**
   * Create a new source
   */
  async create(source: Partial<VoucherCatalogSource>): Promise<VoucherCatalogSource> {
    const dbSource = mapToDb(source);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(dbSource)
      .select()
      .single();

    if (error) {
      logger.error({ source, error }, 'Failed to create voucher catalog source');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Update a source
   */
  async update(id: string, updates: Partial<VoucherCatalogSource>): Promise<VoucherCatalogSource> {
    const dbUpdates = mapToDb(updates);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ id, updates, error }, 'Failed to update voucher catalog source');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Update last synced timestamp
   */
  async updateLastSynced(id: string, timestamp: Date): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ last_synced_at: timestamp.toISOString() })
      .eq('id', id);

    if (error) {
      logger.error({ id, timestamp, error }, 'Failed to update last synced timestamp');
      throw error;
    }
  },

  /**
   * Deactivate a source
   */
  async deactivate(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      logger.error({ id, error }, 'Failed to deactivate voucher catalog source');
      throw error;
    }
  },

  /**
   * Delete a source
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      logger.error({ id, error }, 'Failed to delete voucher catalog source');
      throw error;
    }
  },
};

// =============================================================================
// Mapping Functions
// =============================================================================

function mapToDomain(data: Record<string, unknown>): VoucherCatalogSource {
  return {
    id: data.id as string,
    sourceName: data.source_name as string,
    sourceType: data.source_type as VoucherSourceType,
    platform: data.platform as VoucherPlatform,
    sourceConfig: data.source_config as VoucherCatalogSource['sourceConfig'],
    isActive: data.is_active as boolean,
    lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at as string) : null,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}

function mapToDb(source: Partial<VoucherCatalogSource>): Record<string, unknown> {
  return {
    source_name: source.sourceName,
    source_type: source.sourceType,
    platform: source.platform,
    source_config: source.sourceConfig,
    is_active: source.isActive,
  };
}
