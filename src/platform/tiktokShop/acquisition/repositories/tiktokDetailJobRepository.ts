/**
 * TikTok Shop Detail Job Repository
 */

import { getSupabaseClient } from '../../../../db/supabaseClient.js';
import type { TikTokShopDetailJob, TikTokShopDetailJobStatus } from '../types.js';

interface Row {
  id: string;
  canonical_reference_key: string;
  job_status: string;
  acquisition_mode: string;
  extraction_status: string;
  quality_score: number | null;
  error_summary: string | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
}

function map(row: Row): TikTokShopDetailJob {
  return {
    id: row.id,
    canonicalReferenceKey: row.canonical_reference_key,
    jobStatus: row.job_status as TikTokShopDetailJobStatus,
    acquisitionMode: row.acquisition_mode as any,
    extractionStatus: row.extraction_status as any,
    qualityScore: row.quality_score ?? undefined,
    errorSummary: row.error_summary ?? undefined,
    startedAt: new Date(row.started_at),
    finishedAt: row.finished_at ? new Date(row.finished_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export class TikTokDetailJobRepository {
  async findAll() {
    const { data } = await getSupabaseClient()
      .from('tiktok_shop_detail_jobs')
      .select('*')
      .order('created_at', { ascending: false });
    return (data || []).map(map);
  }

  async findById(id: string) {
    const { data } = await getSupabaseClient()
      .from('tiktok_shop_detail_jobs')
      .select('*')
      .eq('id', id)
      .single();
    return data ? map(data as Row) : null;
  }

  async findByReferenceKey(referenceKey: string) {
    const { data } = await getSupabaseClient()
      .from('tiktok_shop_detail_jobs')
      .select('*')
      .eq('canonical_reference_key', referenceKey)
      .order('created_at', { ascending: false });
    return (data || []).map(map);
  }

  async create(job: Omit<TikTokShopDetailJob, 'id' | 'createdAt'>) {
    const { data } = await getSupabaseClient()
      .from('tiktok_shop_detail_jobs')
      .insert({
        canonical_reference_key: job.canonicalReferenceKey,
        job_status: job.jobStatus,
        acquisition_mode: job.acquisitionMode,
        extraction_status: job.extractionStatus,
        quality_score: job.qualityScore ?? null,
        error_summary: job.errorSummary ?? null,
        started_at: job.startedAt.toISOString(),
        finished_at: job.finishedAt?.toISOString() ?? null,
      })
      .select()
      .single();
    return data ? map(data as Row) : null;
  }

  async update(id: string, updates: Partial<TikTokShopDetailJob>) {
    const upd: Record<string, unknown> = {};
    if (updates.jobStatus) upd.job_status = updates.jobStatus;
    if (updates.extractionStatus) upd.extraction_status = updates.extractionStatus;
    if (updates.qualityScore !== undefined) upd.quality_score = updates.qualityScore;
    if (updates.errorSummary) upd.error_summary = updates.errorSummary;
    if (updates.finishedAt) upd.finished_at = updates.finishedAt.toISOString();

    const { data } = await getSupabaseClient()
      .from('tiktok_shop_detail_jobs')
      .update(upd)
      .eq('id', id)
      .select()
      .single();
    return data ? map(data as Row) : null;
  }
}

let repo: TikTokDetailJobRepository | null = null;
export function getTikTokDetailJobRepository() {
  if (!repo) repo = new TikTokDetailJobRepository();
  return repo;
}

export async function saveDetailJob(job: Omit<TikTokShopDetailJob, 'id' | 'createdAt'>) {
  return getTikTokDetailJobRepository().create(job);
}

export async function updateDetailJob(id: string, updates: Partial<TikTokShopDetailJob>) {
  return getTikTokDetailJobRepository().update(id, updates);
}
