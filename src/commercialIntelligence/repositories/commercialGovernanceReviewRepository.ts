/**
 * Commercial Governance Review Repository
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type { CommercialGovernanceReview, CreateGovernanceReviewInput, GovernanceReviewType, GovernanceReviewStatus, CommercialResult } from '../types.js';

export class CommercialGovernanceReviewRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  async create(input: CreateGovernanceReviewInput): Promise<CommercialResult<CommercialGovernanceReview>> {
    try {
      const { data, error } = await this.supabase
        .from('commercial_governance_reviews')
        .insert({
          review_type: input.reviewType,
          review_status: 'pending',
          target_entity_type: input.targetEntityType,
          target_entity_id: input.targetEntityId,
          business_summary: input.businessSummary,
          usefulness_summary: input.usefulnessSummary,
          governance_payload: input.governancePayload ?? {},
          created_by: input.createdBy,
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data: this.mapToDomain(data) };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async findById(id: string): Promise<CommercialGovernanceReview | null> {
    const { data } = await this.supabase
      .from('commercial_governance_reviews')
      .select('*')
      .eq('id', id)
      .single();
    return data ? this.mapToDomain(data) : null;
  }

  async findByType(reviewType: GovernanceReviewType): Promise<CommercialGovernanceReview[]> {
    const { data } = await this.supabase
      .from('commercial_governance_reviews')
      .select('*')
      .eq('review_type', reviewType)
      .order('created_at', { ascending: false });
    return (data ?? []).map(this.mapToDomain);
  }

  async findByStatus(status: GovernanceReviewStatus): Promise<CommercialGovernanceReview[]> {
    const { data } = await this.supabase
      .from('commercial_governance_reviews')
      .select('*')
      .eq('review_status', status)
      .order('created_at', { ascending: false });
    return (data ?? []).map(this.mapToDomain);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<CommercialGovernanceReview[]> {
    const { data } = await this.supabase
      .from('commercial_governance_reviews')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });
    return (data ?? []).map(this.mapToDomain);
  }

  async updateStatus(id: string, status: GovernanceReviewStatus, resolvedAt?: Date): Promise<CommercialResult<CommercialGovernanceReview>> {
    try {
      const updateData: Record<string, unknown> = { review_status: status };
      if (resolvedAt || status === 'resolved' || status === 'approved' || status === 'rejected') {
        updateData.resolved_at = resolvedAt ?? new Date();
      }

      const { data, error } = await this.supabase
        .from('commercial_governance_reviews')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data: this.mapToDomain(data) };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  private mapToDomain(data: Record<string, unknown>): CommercialGovernanceReview {
    return {
      id: data.id as string,
      reviewType: data.review_type as GovernanceReviewType,
      reviewStatus: data.review_status as GovernanceReviewStatus,
      targetEntityType: data.target_entity_type as string | null,
      targetEntityId: data.target_entity_id as string | null,
      businessSummary: data.business_summary as Record<string, unknown>,
      usefulnessSummary: data.usefulness_summary as Record<string, unknown> | null,
      governancePayload: data.governance_payload as Record<string, unknown> | null,
      createdBy: data.created_by as string | null,
      createdAt: new Date(data.created_at as string),
      resolvedAt: data.resolved_at ? new Date(data.resolved_at as string) : null,
    };
  }
}

let repo: CommercialGovernanceReviewRepository | null = null;
export function getCommercialGovernanceReviewRepository(): CommercialGovernanceReviewRepository {
  if (!repo) repo = new CommercialGovernanceReviewRepository();
  return repo;
}
