/**
 * Platform Capability Snapshot Repository
 */

import { getSupabaseClient } from '../../db/supabaseClient.js';
import type { PlatformCapabilitySnapshot, PlatformCapabilityArea, PlatformCapabilityStatus } from '../types.js';

export class PlatformCapabilitySnapshotRepository {
  async findByPlatform(platformKey: string): Promise<PlatformCapabilitySnapshot[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_capability_snapshots')
      .select('*')
      .eq('platform_key', platformKey)
      .order('capability_area');

    if (error) throw error;
    return (data ?? []).map(this.mapToRecord);
  }

  async findLatest(platformKey: string, capabilityArea?: PlatformCapabilityArea): Promise<PlatformCapabilitySnapshot[]> {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('platform_capability_snapshots')
      .select('*')
      .eq('platform_key', platformKey);

    if (capabilityArea) {
      query = query.eq('capability_area', capabilityArea);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(this.mapToRecord);
  }

  async create(params: {
    platformKey: string;
    capabilityArea: PlatformCapabilityArea;
    capabilityStatus: PlatformCapabilityStatus;
    capabilityScore: number | null;
    capabilityPayload: Record<string, unknown>;
  }): Promise<PlatformCapabilitySnapshot> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('platform_capability_snapshots')
      .insert({
        platform_key: params.platformKey,
        capability_area: params.capabilityArea,
        capability_status: params.capabilityStatus,
        capability_score: params.capabilityScore,
        capability_payload: params.capabilityPayload,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToRecord(data);
  }

  private mapToRecord(data: any): PlatformCapabilitySnapshot {
    return {
      id: data.id,
      platformKey: data.platform_key,
      capabilityArea: data.capability_area,
      capabilityStatus: data.capability_status,
      capabilityScore: data.capability_score,
      capabilityPayload: data.capability_payload,
      createdAt: new Date(data.created_at),
    };
  }
}

let repository: PlatformCapabilitySnapshotRepository | null = null;

export function getPlatformCapabilitySnapshotRepository(): PlatformCapabilitySnapshotRepository {
  if (!repository) {
    repository = new PlatformCapabilitySnapshotRepository();
  }
  return repository;
}
