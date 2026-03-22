/**
 * Launch Readiness Review Repository
 */

import supabase from '../../db/supabaseClient.js';
import type { LaunchReadinessReview, LaunchReadinessReviewInput } from '../types.js';

export interface ReviewFilter {
  launchKey?: string;
  reviewStatus?: string;
  readinessStatus?: string;
}

export async function createLaunchReadinessReview(input: LaunchReadinessReviewInput): Promise<LaunchReadinessReview> {
  const { data, error } = await supabase
    .from('launch_readiness_reviews')
    .insert({
      launch_key: input.launchKey,
      review_payload: input.reviewPayload,
      created_by: input.createdBy ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create review: ${error.message}`);
  return mapToReview(data);
}

export async function getLaunchReadinessReviews(filter: ReviewFilter = {}): Promise<LaunchReadinessReview[]> {
  let query = supabase.from('launch_readiness_reviews').select('*').order('created_at', { ascending: false });
  if (filter.launchKey) query = query.eq('launch_key', filter.launchKey);
  if (filter.reviewStatus) query = query.eq('review_status', filter.reviewStatus);
  if (filter.readinessStatus) query = query.eq('readiness_status', filter.readinessStatus);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to get reviews: ${error.message}`);
  return (data ?? []).map(mapToReview);
}

export async function getLaunchReadinessReviewById(id: string): Promise<LaunchReadinessReview | null> {
  const { data, error } = await supabase.from('launch_readiness_reviews').select('*').eq('id', id).single();
  if (error) { if (error.code === 'PGRST116') return null; throw new Error(`Failed to get review: ${error.message}`); }
  return mapToReview(data);
}

export async function updateLaunchReadinessReview(id: string, updates: Partial<LaunchReadinessReview>): Promise<LaunchReadinessReview | null> {
  const update: Record<string, unknown> = {};
  if (updates.reviewStatus) update.review_status = updates.reviewStatus;
  if (updates.readinessStatus) update.readiness_status = updates.readinessStatus;
  if (updates.readinessScore !== undefined) update.readiness_score = updates.readinessScore;
  if (updates.blockerCount !== undefined) update.blocker_count = updates.blockerCount;
  if (updates.warningCount !== undefined) update.warning_count = updates.warningCount;
  if (updates.finalizedAt) update.finalized_at = updates.finalizedAt.toISOString();

  const { data, error } = await supabase.from('launch_readiness_reviews').update(update).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update review: ${error.message}`);
  return data ? mapToReview(data) : null;
}

function mapToReview(row: Record<string, unknown>): LaunchReadinessReview {
  return {
    id: row.id as string,
    launchKey: row.launch_key as string,
    reviewStatus: row.review_status as any,
    readinessStatus: row.readiness_status as any,
    readinessScore: row.readiness_score as number | undefined,
    blockerCount: row.blocker_count as number,
    warningCount: row.warning_count as number,
    reviewPayload: row.review_payload as Record<string, unknown>,
    createdBy: row.created_by as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    finalizedAt: row.finalized_at ? new Date(row.finalized_at as string) : undefined,
  };
}
