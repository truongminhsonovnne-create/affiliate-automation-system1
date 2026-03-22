/**
 * Commercial Governance Service
 *
 * Production-grade commercial governance.
 * Ensures commercial optimization doesn't compromise user usefulness.
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type {
  CommercialGovernanceReview,
  CreateGovernanceReviewInput,
  CommercialDecisionSupport,
  GovernanceReviewType,
  GovernanceReviewStatus,
  CommercialResult,
} from '../types.js';
import { GOVERNANCE_THRESHOLDS } from '../constants.js';
import { logger } from '../../utils/logger.js';

/**
 * Commercial Governance Service
 *
 * Handles governance reviews and decision support.
 */
export class CommercialGovernanceService {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  /**
   * Run commercial governance review
   */
  async runCommercialGovernanceReview(params: {
    reviewType: GovernanceReviewType;
    targetEntityType?: string;
    targetEntityId?: string;
    businessSummary: Record<string, unknown>;
    usefulnessSummary?: Record<string, unknown>;
    createdBy?: string;
  }): Promise<CommercialResult<CommercialGovernanceReview>> {
    try {
      // Create the review
      const reviewResult = await this.buildCommercialGovernanceReview(params);

      if (!reviewResult.success || !reviewResult.data) {
        return reviewResult;
      }

      // Classify risks
      const risks = await this.classifyCommercialGovernanceRisks(reviewResult.data);

      // Build decision support
      const decisionSupport = this.buildCommercialDecisionSupport(reviewResult.data, risks);

      // Update review with decision support
      const { data: updatedReview, error } = await this.supabase
        .from('commercial_governance_reviews')
        .update({
          governance_payload: {
            risks,
            decisionSupport,
            evaluatedAt: new Date().toISOString(),
          },
        })
        .eq('id', reviewResult.data.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.mapDbToGovernanceReview(updatedReview),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ msg: 'Error running commercial governance review', error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Build commercial governance review
   */
  async buildCommercialGovernanceReview(params: {
    reviewType: GovernanceReviewType;
    targetEntityType?: string;
    targetEntityId?: string;
    businessSummary: Record<string, unknown>;
    usefulnessSummary?: Record<string, unknown>;
    createdBy?: string;
  }): Promise<CommercialResult<CommercialGovernanceReview>> {
    try {
      const { data, error } = await this.supabase
        .from('commercial_governance_reviews')
        .insert({
          review_type: params.reviewType,
          review_status: 'pending',
          target_entity_type: params.targetEntityType,
          target_entity_id: params.targetEntityId,
          business_summary: params.businessSummary,
          usefulness_summary: params.usefulnessSummary,
          governance_payload: {},
          created_by: params.createdBy,
        })
        .select()
        .single();

      if (error) {
        logger.error({
          msg: 'Failed to create governance review',
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.mapDbToGovernanceReview(data),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Classify commercial governance risks
   */
  async classifyCommercialGovernanceRisks(
    review: CommercialGovernanceReview
  ): Promise<Array<{
    riskType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    details: Record<string, unknown>;
  }>> {
    const risks: Array<{
      riskType: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      details: Record<string, unknown>;
    }> = [];

    const business = review.businessSummary as Record<string, unknown>;
    const usefulness = review.usefulnessSummary as Record<string, unknown> | null;

    // Check revenue-quality divergence
    const revenue = business.revenue as number ?? 0;
    const qualityScore = usefulness?.balanceScore as number ?? 0.5;

    if (revenue > 0 && qualityScore < GOVERNANCE_THRESHOLDS.AUTO_REVIEW_QUALITY_DROP_PERCENT / 100) {
      risks.push({
        riskType: 'revenue_quality_divergence',
        severity: qualityScore < 0.3 ? 'critical' : 'high',
        description: 'Revenue increased but quality score decreased significantly',
        details: { revenue, qualityScore },
      });
    }

    // Check no-match rate
    const noMatchRate = usefulness?.noMatchRate as number ?? 0;
    if (noMatchRate > 0.4) {
      risks.push({
        riskType: 'high_no_match_rate',
        severity: noMatchRate > 0.6 ? 'critical' : 'high',
        description: 'No-match rate is above acceptable threshold',
        details: { noMatchRate },
      });
    }

    // Check conversion rate decline
    const currentConversionRate = business.conversionRate as number ?? 0;
    const previousConversionRate = business.previousConversionRate as number ?? currentConversionRate;

    if (previousConversionRate > 0) {
      const conversionDecline = (previousConversionRate - currentConversionRate) / previousConversionRate;

      if (conversionDecline > GOVERNANCE_THRESHOLDS.AUTO_REVIEW_CONVERSION_SPIKE_PERCENT / 100) {
        risks.push({
          riskType: 'conversion_decline',
          severity: conversionDecline > 0.5 ? 'critical' : 'high',
          description: 'Conversion rate has declined significantly',
          details: { currentConversionRate, previousConversionRate, decline: conversionDecline },
        });
      }
    }

    return risks;
  }

  /**
   * Build commercial decision support
   */
  buildCommercialDecisionSupport(
    review: CommercialGovernanceReview,
    risks: Array<{ riskType: string; severity: string }>
  ): CommercialDecisionSupport {
    const hasCriticalRisk = risks.some(r => r.severity === 'critical');
    const hasHighRisk = risks.some(r => r.severity === 'high');
    const hasMediumRisk = risks.some(r => r.severity === 'medium');

    let recommendation: CommercialDecisionSupport['recommendation'];
    let confidence: number;
    const riskFactors: string[] = [];

    if (hasCriticalRisk) {
      recommendation = 'reject';
      confidence = 0.9;
      riskFactors.push('Critical risk detected');
    } else if (hasHighRisk) {
      recommendation = 'review';
      confidence = 0.7;
      riskFactors.push('High risk detected - requires review');
    } else if (hasMediumRisk) {
      recommendation = 'investigate';
      confidence = 0.5;
      riskFactors.push('Medium risk - further investigation recommended');
    } else {
      recommendation = 'approve';
      confidence = 0.8;
      riskFactors.push('No significant risks detected');
    }

    const business = review.businessSummary as Record<string, unknown>;
    const revenue = business.revenue as number ?? 0;
    const usefulness = review.usefulnessSummary as Record<string, unknown> | null;
    const qualityScore = usefulness?.balanceScore as number ?? 0.5;

    const supportingMetrics = {
      revenue,
      qualityScore,
      riskCount: risks.length,
      reviewType: review.reviewType,
    };

    const decisionRationale = this.buildDecisionRationale(recommendation, risks, revenue, qualityScore);

    const requiredActions = this.determineRequiredActions(recommendation, risks);

    return {
      recommendation,
      confidence,
      supportingMetrics,
      riskFactors,
      decisionRationale,
      requiredActions,
    };
  }

  /**
   * Build decision rationale
   */
  private buildDecisionRationale(
    recommendation: string,
    risks: Array<{ riskType: string; severity: string }>,
    revenue: number,
    qualityScore: number
  ): string {
    switch (recommendation) {
      case 'approve':
        return `Approved. Revenue: ${revenue}, Quality Score: ${(qualityScore * 100).toFixed(1)}%. No significant risks detected.`;
      case 'reject':
        return `Rejected. Critical risks detected (${risks.length}). Revenue: ${revenue}, Quality Score: ${(qualityScore * 100).toFixed(1)}%. Requires immediate attention.`;
      case 'review':
        return `Requires review. ${risks.length} risk(s) identified. Revenue: ${revenue}, Quality Score: ${(qualityScore * 100).toFixed(1)}%. Manual evaluation needed.`;
      case 'investigate':
        return `Requires investigation. Medium risks present. Revenue: ${revenue}, Quality Score: ${(qualityScore * 100).toFixed(1)}%. Further analysis recommended.`;
      default:
        return 'Decision pending evaluation.';
    }
  }

  /**
   * Determine required actions
   */
  private determineRequiredActions(
    recommendation: string,
    risks: Array<{ riskType: string; severity: string }>
  ): string[] {
    const actions: string[] = [];

    switch (recommendation) {
      case 'reject':
        actions.push('Do not proceed with release/deployment');
        actions.push('Address critical risks immediately');
        break;
      case 'review':
        actions.push('Schedule governance review meeting');
        actions.push('Document risk mitigation plan');
        break;
      case 'investigate':
        actions.push('Conduct deeper analysis');
        actions.push('Monitor metrics closely');
        break;
      case 'approve':
        actions.push('Proceed with normal monitoring');
        actions.push('Continue tracking metrics');
        break;
    }

    // Add risk-specific actions
    for (const risk of risks) {
      if (risk.riskType === 'revenue_quality_divergence') {
        actions.push('Review voucher ranking algorithm');
      } else if (risk.riskType === 'high_no_match_rate') {
        actions.push('Improve resolution matching');
      } else if (risk.riskType === 'conversion_decline') {
        actions.push('Analyze user flow for friction points');
      }
    }

    return actions;
  }

  /**
   * Get governance reviews
   */
  async getGovernanceReviews(params: {
    reviewType?: GovernanceReviewType;
    reviewStatus?: GovernanceReviewStatus;
    targetEntityType?: string;
    targetEntityId?: string;
    limit?: number;
    offset?: number;
  }): Promise<CommercialGovernanceReview[]> {
    let query = this.supabase
      .from('commercial_governance_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (params.reviewType) {
      query = query.eq('review_type', params.reviewType);
    }
    if (params.reviewStatus) {
      query = query.eq('review_status', params.reviewStatus);
    }
    if (params.targetEntityType) {
      query = query.eq('target_entity_type', params.targetEntityType);
    }
    if (params.targetEntityId) {
      query = query.eq('target_entity_id', params.targetEntityId);
    }
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit ?? 10) - 1);
    }

    const { data } = await query;
    return (data ?? []).map(this.mapDbToGovernanceReview);
  }

  /**
   * Update review status
   */
  async updateReviewStatus(
    reviewId: string,
    status: GovernanceReviewStatus,
    resolvedBy?: string
  ): Promise<CommercialResult<CommercialGovernanceReview>> {
    try {
      const updateData: Record<string, unknown> = {
        review_status: status,
      };

      if (status === 'resolved' || status === 'approved' || status === 'rejected') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await this.supabase
        .from('commercial_governance_reviews')
        .update(updateData)
        .eq('id', reviewId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.mapDbToGovernanceReview(data),
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Map database record to GovernanceReview
   */
  private mapDbToGovernanceReview(data: Record<string, unknown>): CommercialGovernanceReview {
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

// ============================================================
// Factory
// ============================================================

let governanceService: CommercialGovernanceService | null = null;

export function getCommercialGovernanceService(): CommercialGovernanceService {
  if (!governanceService) {
    governanceService = new CommercialGovernanceService();
  }
  return governanceService;
}

// ============================================================
// Direct Exports
// ============================================================

export async function runCommercialGovernanceReview(
  params: Parameters<CommercialGovernanceService['runCommercialGovernanceReview']>[0]
): Promise<CommercialResult<CommercialGovernanceReview>> {
  return getCommercialGovernanceService().runCommercialGovernanceReview(params);
}

export async function buildCommercialGovernanceReview(
  params: Parameters<CommercialGovernanceService['buildCommercialGovernanceReview']>[0]
): Promise<CommercialResult<CommercialGovernanceReview>> {
  return getCommercialGovernanceService().buildCommercialGovernanceReview(params);
}

export async function classifyCommercialGovernanceRisks(
  review: CommercialGovernanceReview
): Promise<ReturnType<CommercialGovernanceService['classifyCommercialGovernanceRisks']>> {
  return getCommercialGovernanceService().classifyCommercialGovernanceRisks(review);
}

export function buildCommercialDecisionSupport(
  review: CommercialGovernanceReview,
  risks: Parameters<CommercialGovernanceService['classifyCommercialGovernanceRisks']>[0]
): CommercialDecisionSupport {
  return getCommercialGovernanceService().buildCommercialDecisionSupport(review, risks);
}
