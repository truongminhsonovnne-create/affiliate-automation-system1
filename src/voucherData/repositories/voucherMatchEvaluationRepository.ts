// =============================================================================
// Voucher Match Evaluation Repository
// Production-grade repository for voucher match evaluations
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { VoucherMatchEvaluationResult, VoucherPlatform, VoucherEvaluationStatus } from '../types.js';
import { logger } from '../../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLE_NAME = 'voucher_match_evaluations';

/**
 * Voucher Match Evaluation Repository
 */
export const voucherMatchEvaluationRepository = {
  /**
   * Find evaluation by ID
   */
  async findById(id: string): Promise<VoucherMatchEvaluationResult | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error({ id, error }, 'Failed to find voucher match evaluation');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Find evaluations by platform
   */
  async findByPlatform(platform: VoucherPlatform, options?: {
    limit?: number;
    offset?: number;
  }): Promise<VoucherMatchEvaluationResult[]> {
    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('platform', platform)
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ platform, error }, 'Failed to find voucher match evaluations by platform');
      throw error;
    }

    return data.map(mapToDomain);
  },

  /**
   * Find evaluations by status
   */
  async findByStatus(status: VoucherEvaluationStatus, options?: {
    limit?: number;
    offset?: number;
  }): Promise<VoucherMatchEvaluationResult[]> {
    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('evaluation_status', status)
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ status, error }, 'Failed to find voucher match evaluations by status');
      throw error;
    }

    return data.map(mapToDomain);
  },

  /**
   * Find all evaluations with pagination
   */
  async findAll(options?: {
    platform?: VoucherPlatform;
    status?: VoucherEvaluationStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ evaluations: VoucherMatchEvaluationResult[]; total: number }> {
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact' });

    if (options?.platform) {
      query = query.eq('platform', options.platform);
    }

    if (options?.status) {
      query = query.eq('evaluation_status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error({ options, error }, 'Failed to find all voucher match evaluations');
      throw error;
    }

    return {
      evaluations: data.map(mapToDomain),
      total: count || 0,
    };
  },

  /**
   * Create a new evaluation
   */
  async create(evaluation: VoucherMatchEvaluationResult): Promise<VoucherMatchEvaluationResult> {
    const dbEvaluation = mapToDb(evaluation);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(dbEvaluation)
      .select()
      .single();

    if (error) {
      logger.error({ evaluation, error }, 'Failed to create voucher match evaluation');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Update an evaluation
   */
  async update(id: string, updates: Partial<VoucherMatchEvaluationResult>): Promise<VoucherMatchEvaluationResult> {
    const dbUpdates = mapToDb(updates);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ id, updates, error }, 'Failed to update voucher match evaluation');
      throw error;
    }

    return mapToDomain(data);
  },

  /**
   * Delete evaluations older than a date
   */
  async deleteOlderThan(date: Date): Promise<number> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .lt('created_at', date.toISOString())
      .select('id');

    if (error) {
      logger.error({ date, error }, 'Failed to delete old voucher match evaluations');
      throw error;
    }

    return data?.length || 0;
  },

  /**
   * Get quality score statistics
   */
  async getQualityScoreStats(platform?: VoucherPlatform): Promise<{
    avgScore: number;
    minScore: number;
    maxScore: number;
    totalEvaluations: number;
    successfulEvaluations: number;
  }> {
    let query = supabase
      .from(TABLE_NAME)
      .select('quality_score, evaluation_status');

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ platform, error }, 'Failed to get quality score statistics');
      throw error;
    }

    const scores = data
      .filter((d) => d.quality_score !== null)
      .map((d) => d.quality_score as number);

    return {
      avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      minScore: scores.length > 0 ? Math.min(...scores) : 0,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
      totalEvaluations: data.length,
      successfulEvaluations: data.filter((d) => d.evaluation_status === 'success').length,
    };
  },

  /**
   * Find evaluations by voucher ID
   */
  async findByVoucherId(voucherId: string, options?: {
    limit?: number;
  }): Promise<VoucherMatchEvaluationResult[]> {
    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .contains('resolved_voucher_ids', [voucherId])
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ voucherId, error }, 'Failed to find evaluations by voucher ID');
      throw error;
    }

    return data.map(mapToDomain);
  },
};

// =============================================================================
// Mapping Functions
// =============================================================================

function mapToDomain(data: Record<string, unknown>): VoucherMatchEvaluationResult {
  return {
    id: data.id as string,
    platform: data.platform as VoucherPlatform,
    requestInput: data.request_input as VoucherMatchEvaluationResult['requestInput'],
    expectedVoucherIds: data.expected_voucher_ids as string[] | null,
    resolvedVoucherIds: data.resolved_voucher_ids as string[],
    bestResolvedVoucherId: data.best_resolved_voucher_id as string | null,
    evaluationStatus: data.evaluation_status as VoucherEvaluationStatus,
    qualityScore: data.quality_score as number | null,
    qualityMetrics: data.quality_metrics as VoucherMatchEvaluationResult['qualityMetrics'],
    errorSummary: data.error_summary as string | null,
    rankingTrace: data.ranking_trace as VoucherMatchEvaluationResult['rankingTrace'],
    createdAt: new Date(data.created_at as string),
  };
}

function mapToDb(evaluation: Partial<VoucherMatchEvaluationResult>): Record<string, unknown> {
  return {
    platform: evaluation.platform,
    request_input: evaluation.requestInput,
    expected_voucher_ids: evaluation.expectedVoucherIds,
    resolved_voucher_ids: evaluation.resolvedVoucherIds,
    best_resolved_voucher_id: evaluation.bestResolvedVoucherId,
    evaluation_status: evaluation.evaluationStatus,
    quality_score: evaluation.qualityScore,
    quality_metrics: evaluation.qualityMetrics,
    error_summary: evaluation.errorSummary,
    ranking_trace: evaluation.rankingTrace,
  };
}
