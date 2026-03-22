/**
 * TikTok Shop Discovery Candidate Repository
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { TikTokShopDiscoveryCandidate } from '../types.js';

interface Row {
  id: string;
  discovery_job_id: string | null;
  candidate_key: string;
  raw_reference_payload: Record<string, unknown>;
  canonical_reference_key: string | null;
  candidate_status: string;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

function map(row: Row): TikTokShopDiscoveryCandidate {
  return {
    id: row.id,
    discoveryJobId: row.discovery_job_id ?? undefined,
    candidateKey: row.candidate_key,
    rawReferencePayload: row.raw_reference_payload,
    canonicalReferenceKey: row.canonical_reference_key ?? undefined,
    candidateStatus: row.candidate_status as any,
    confidenceScore: row.confidence_score ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class TikTokDiscoveryCandidateRepository {
  async findAll() {
    const { data } = await getSupabaseClient()
      .from('tiktok_shop_discovery_candidates')
      .select('*')
      .order('created_at', { ascending: false });
    return (data || []).map(map);
  }

  async findByKey(candidateKey: string) {
    const { data } = await getSupabaseClient()
      .from('tiktok_shop_discovery_candidates')
      .select('*')
      .eq('candidate_key', candidateKey)
      .single();
    return data ? map(data as Row) : null;
  }

  async create(candidate: Omit<TikTokShopDiscoveryCandidate, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data } = await getSupabaseClient()
      .from('tiktok_shop_discovery_candidates')
      .insert({
        discovery_job_id: candidate.discoveryJobId ?? null,
        candidate_key: candidate.candidateKey,
        raw_reference_payload: candidate.rawReferencePayload,
        canonical_reference_key: candidate.canonicalReferenceKey ?? null,
        candidate_status: candidate.candidateStatus,
        confidence_score: candidate.confidenceScore ?? null,
      })
      .select()
      .single();
    return data ? map(data as Row) : null;
  }

  async createMany(candidates: Omit<TikTokShopDiscoveryCandidate, 'id' | 'createdAt' | 'updatedAt'>[]) {
    const { data, error } = await getSupabaseClient()
      .from('tiktok_shop_discovery_candidates')
      .insert(candidates.map(c => ({
        discovery_job_id: c.discoveryJobId ?? null,
        candidate_key: c.candidateKey,
        raw_reference_payload: c.rawReferencePayload,
        canonical_reference_key: c.canonicalReferenceKey ?? null,
        candidate_status: c.candidateStatus,
        confidence_score: c.confidenceScore ?? null,
      })))
      .select();
    if (error) throw new Error(error.message);
    return (data || []).map(map);
  }
}

let repo: TikTokDiscoveryCandidateRepository | null = null;
export function getTikTokDiscoveryCandidateRepository() {
  if (!repo) repo = new TikTokDiscoveryCandidateRepository();
  return repo;
}

export async function saveDiscoveryCandidates(candidates: Omit<TikTokShopDiscoveryCandidate, 'id' | 'createdAt' | 'updatedAt'>[]) {
  return getTikTokDiscoveryCandidateRepository().createMany(candidates);
}
