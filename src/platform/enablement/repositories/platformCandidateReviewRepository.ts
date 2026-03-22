/**
 * Platform Candidate Review Repository
 *
 * Repository for managing production candidate reviews.
 */

import { getSupabaseClient } from '../../../db/supabaseClient.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PlatformProductionCandidateReview,
  PlatformCandidateReviewStatus,
  PlatformCandidateStatus,
  PlatformProductionCandidateScore,
} from '../types/index.js';
import logger from '../../../utils/logger.js';

export class PlatformCandidateReviewRepository {
  private get client(): SupabaseClient {
    return getSupabaseClient();
  }

  /**
   * Create a new review
   */
  async createReview(input: {
    platformKey: string;
    reviewStatus?: PlatformCandidateReviewStatus;
    candidateStatus?: PlatformCandidateStatus;
    readinessScore?: PlatformProductionCandidateScore;
    reviewPayload?: Record<string, unknown>;
    evidenceSources?: string[];
    createdBy?: string;
  }): Promise<PlatformProductionCandidateReview> {
    const { data, error } = await this.client
      .from('platform_production_candidate_reviews')
      .insert({
        platform_key: input.platformKey,
        review_status: input.reviewStatus || 'pending',
        candidate_status: input.candidateStatus || 'not_ready',
        readiness_score: input.readinessScore?.overall ?? null,
        domain_maturity_score: input.readinessScore?.domainMaturity ?? null,
        data_foundational_score: input.readinessScore?.dataFoundational ?? null,
        acquisition_stability_score: input.readinessScore?.acquisitionStability ?? null,
        sandbox_quality_score: input.readinessScore?.sandboxQuality ?? null,
        preview_usefulness_score: input.readinessScore?.previewUsefulness ?? null,
        preview_stability_score: input.readinessScore?.previewStability ?? null,
        commercial_readiness_score: input.readinessScore?.commercialReadiness ?? null,
        governance_safety_score: input.readinessScore?.governanceSafety ?? null,
        remediation_load_score: input.readinessScore?.remediationLoad ?? null,
        operator_readiness_score: input.readinessScore?.operatorReadiness ?? null,
        review_payload: input.reviewPayload || {},
        evidence_sources: input.evidenceSources || [],
        created_by: input.createdBy || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ msg: 'Failed to create review', error: error.message });
      throw new Error(`Failed to create review: ${error.message}`);
    }

    return this.mapToReview(data);
  }

  /**
   * Get review by ID
   */
  async getReviewById(id: string): Promise<PlatformProductionCandidateReview | null> {
    const { data, error } = await this.client
      .from('platform_production_candidate_reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;

    return data ? this.mapToReview(data) : null;
  }

  /**
   * Get latest review for platform
   */
  async getLatestReview(platformKey: string): Promise<PlatformProductionCandidateReview | null> {
    const { data, error } = await this.client
      .from('platform_production_candidate_reviews')
      .select('*')
      .eq('platform_key', platformKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;

    return data ? this.mapToReview(data) : null;
  }

  /**
   * Get reviews by platform
   */
  async getReviewsByPlatform(
    platformKey: string,
    limit: number = 10
  ): Promise<PlatformProductionCandidateReview[]> {
    const { data, error } = await this.client
      .from('platform_production_candidate_reviews')
      .select('*')
      .eq('platform_key', platformKey)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(this.mapToReview);
  }

  /**
   * Update review status
   */
  async updateReviewStatus(
    id: string,
    status: PlatformCandidateReviewStatus,
    candidateStatus?: PlatformCandidateStatus
  ): Promise<PlatformProductionCandidateReview | null> {
    const updateData: Record<string, unknown> = {
      review_status: status,
      updated_at: new Date().toISOString(),
    };

    if (candidateStatus) {
      updateData.candidate_status = candidateStatus;
    }

    if (status === 'completed') {
      updateData.finalized_at = new Date().toISOString();
    }

    const { data, error } = await this.client
      .from('platform_production_candidate_reviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data ? this.mapToReview(data) : null;
  }

  /**
   * Update review with scores
   */
  async updateReviewScores(
    id: string,
    scores: PlatformProductionCandidateScore,
    blockerCount: number,
    warningCount: number,
    conditionCount: number
  ): Promise<PlatformProductionCandidateReview | null> {
    const { data, error } = await this.client
      .from('platform_production_candidate_reviews')
      .update({
        readiness_score: scores.overall,
        domain_maturity_score: scores.domainMaturity,
        data_foundational_score: scores.dataFoundational,
        acquisition_stability_score: scores.acquisitionStability,
        sandbox_quality_score: scores.sandboxQuality,
        preview_usefulness_score: scores.previewUsefulness,
        preview_stability_score: scores.previewStability,
        commercial_readiness_score: scores.commercialReadiness,
        governance_safety_score: scores.governanceSafety,
        remediation_load_score: scores.remediationLoad,
        operator_readiness_score: scores.operatorReadiness,
        blocker_count: blockerCount,
        warning_count: warningCount,
        condition_count: conditionCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data ? this.mapToReview(data) : null;
  }

  /**
   * Map database row to review
   */
  private mapToReview(row: Record<string, unknown>): PlatformProductionCandidateReview {
    return {
      id: row.id as string,
      platformKey: row.platform_key as string,
      reviewStatus: row.review_status as PlatformCandidateReviewStatus,
      candidateStatus: row.candidate_status as PlatformCandidateStatus,
      readinessScore: {
        overall: row.readiness_score as number | null,
        domainMaturity: row.domain_maturity_score as number | null,
        dataFoundational: row.data_foundational_score as number | null,
        acquisitionStability: row.acquisition_stability_score as number | null,
        sandboxQuality: row.sandbox_quality_score as number | null,
        previewUsefulness: row.preview_usefulness_score as number | null,
        previewStability: row.preview_stability_score as number | null,
        commercialReadiness: row.commercial_readiness_score as number | null,
        governanceSafety: row.governance_safety_score as number | null,
        remediationLoad: row.remediation_load_score as number | null,
        operatorReadiness: row.operator_readiness_score as number | null,
        dimensions: [],
      },
      blockerCount: row.blocker_count as number,
      warningCount: row.warning_count as number,
      conditionCount: row.condition_count as number,
      reviewPayload: row.review_payload as Record<string, unknown>,
      evidenceSources: row.evidence_sources as string[],
      reviewSummary: row.review_summary as string | null,
      nextReviewAt: row.next_review_at ? new Date(row.next_review_at as string) : null,
      createdBy: row.created_by as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      finalizedAt: row.finalized_at ? new Date(row.finalized_at as string) : null,
    };
  }
}

export const platformCandidateReviewRepository = new PlatformCandidateReviewRepository();
