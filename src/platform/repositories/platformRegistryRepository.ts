/**
 * Platform Registry Repository
 */

import { getSupabaseClient } from '../../db/supabaseClient.js';
import type { PlatformRegistryRecord, PlatformStatus, PlatformSupportLevel, PlatformGovernanceConfig } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export class PlatformRegistryRepository {
  async findAll(): Promise<PlatformRegistryRecord[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_registry')
      .select('*')
      .order('platform_name');

    if (error) throw error;
    return (data ?? []).map(this.mapToRecord);
  }

  async findByKey(platformKey: string): Promise<PlatformRegistryRecord | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_registry')
      .select('*')
      .eq('platform_key', platformKey)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.mapToRecord(data) : null;
  }

  async findByStatus(status: PlatformStatus): Promise<PlatformRegistryRecord[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_registry')
      .select('*')
      .eq('platform_status', status);

    if (error) throw error;
    return (data ?? []).map(this.mapToRecord);
  }

  async create(params: {
    platformKey: string;
    platformName: string;
    platformStatus: PlatformStatus;
    supportLevel: PlatformSupportLevel;
    platformType?: string;
    capabilityPayload?: Record<string, unknown>;
    governanceConfig?: PlatformGovernanceConfig | null;
  }): Promise<PlatformRegistryRecord> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_registry')
      .insert({
        platform_key: params.platformKey,
        platform_name: params.platformName,
        platform_status: params.platformStatus,
        support_level: params.supportLevel,
        platform_type: params.platformType || 'marketplace',
        capability_payload: params.capabilityPayload || {},
        governance_payload: params.governanceConfig || null,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToRecord(data);
  }

  async updateStatus(platformKey: string, status: PlatformStatus): Promise<PlatformRegistryRecord> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_registry')
      .update({ platform_status: status })
      .eq('platform_key', platformKey)
      .select()
      .single();

    if (error) throw error;
    return this.mapToRecord(data);
  }

  async updateSupportLevel(platformKey: string, supportLevel: PlatformSupportLevel): Promise<PlatformRegistryRecord> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_registry')
      .update({ support_level: supportLevel })
      .eq('platform_key', platformKey)
      .select()
      .single();

    if (error) throw error;
    return this.mapToRecord(data);
  }

  async updateCapabilities(platformKey: string, capabilities: Record<string, unknown>): Promise<PlatformRegistryRecord> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_registry')
      .update({ capability_payload: capabilities })
      .eq('platform_key', platformKey)
      .select()
      .single();

    if (error) throw error;
    return this.mapToRecord(data);
  }

  async updateGovernance(platformKey: string, governance: PlatformGovernanceConfig): Promise<PlatformRegistryRecord> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_registry')
      .update({ governance_payload: governance })
      .eq('platform_key', platformKey)
      .select()
      .single();

    if (error) throw error;
    return this.mapToRecord(data);
  }

  private mapToRecord(data: any): PlatformRegistryRecord {
    return {
      id: data.id,
      platformKey: data.platform_key,
      platformName: data.platform_name,
      platformStatus: data.platform_status,
      supportLevel: data.support_level,
      platformType: data.platform_type,
      capabilityPayload: data.capability_payload,
      governanceConfig: data.governance_payload,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}

// Singleton instance
let repository: PlatformRegistryRepository | null = null;

export function getPlatformRegistryRepository(): PlatformRegistryRepository {
  if (!repository) {
    repository = new PlatformRegistryRepository();
  }
  return repository;
}
