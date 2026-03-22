/**
 * TikTok Shop Raw Detail Repository
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { TikTokShopRawDetailRecord } from '../types.js';

interface Row {
  id: string;
  detail_job_id: string | null;
  canonical_reference_key: string;
  raw_payload: Record<string, unknown>;
  extraction_status: string;
  extraction_version: string;
  evidence_payload: Record<string, unknown> | null;
  created_at: string;
}

function map(row: Row): TikTokShopRawDetailRecord {
  return {
    id: row.id,
    detailJobId: row.detail_job_id ?? undefined,
    canonicalReferenceKey: row.canonical_reference_key,
    rawPayload: row.raw_payload,
    extractionStatus: row.extraction_status as any,
    extractionVersion: row.extraction_version,
    evidencePayload: row.evidence_payload ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

export class TikTokRawDetailRepository {
  async findAll() {
    const { data } = await getSupabaseClient()
      .from('tiktok_shop_raw_detail_records')
      .select('*')
      .order('created_at', { ascending: false });
    return (data || []).map(map);
  }

  async findByReferenceKey(referenceKey: string) {
    const { data } = await getSupabaseClient()
      .from('tiktok_shop_raw_detail_records')
      .select('*')
      .eq('canonical_reference_key', referenceKey)
      .order('created_at', { ascending: false });
    return (data || []).map(map);
  }

  async create(record: Omit<TikTokShopRawDetailRecord, 'id' | 'createdAt'>) {
    const { data } = await getSupabaseClient()
      .from('tiktok_shop_raw_detail_records')
      .insert({
        detail_job_id: record.detailJobId ?? null,
        canonical_reference_key: record.canonicalReferenceKey,
        raw_payload: record.rawPayload,
        extraction_status: record.extractionStatus,
        extraction_version: record.extractionVersion,
        evidence_payload: record.evidencePayload ?? null,
      })
      .select()
      .single();
    return data ? map(data as Row) : null;
  }
}

let repo: TikTokRawDetailRepository | null = null;
export function getTikTokRawDetailRepository() {
  if (!repo) repo = new TikTokRawDetailRepository();
  return repo;
}

export async function saveRawDetailRecord(record: Omit<TikTokShopRawDetailRecord, 'id' | 'createdAt'>) {
  return getTikTokRawDetailRepository().create(record);
}
