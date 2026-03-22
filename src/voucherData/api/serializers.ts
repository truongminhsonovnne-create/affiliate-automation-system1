// =============================================================================
// Voucher Data API Serializers
// Production-grade serializers for domain results to API DTOs
// =============================================================================

import {
  VoucherNormalizedRecord,
  VoucherIngestionRun,
  VoucherRuleSet,
  VoucherCatalogSource,
  VoucherOverrideRecord,
  VoucherMatchEvaluationResult,
} from '../types.js';
import { VoucherCatalogEntry, IngestionRunResponse, RuleResponse, SourceResponse, OverrideResponse, EvaluateVoucherResponse } from './types.js';

/**
 * Serialize voucher catalog entry to API response
 */
export function serializeVoucherCatalogEntry(voucher: VoucherNormalizedRecord): VoucherCatalogEntry {
  return {
    id: voucher.id!,
    externalId: voucher.externalId,
    sourceId: voucher.sourceId,
    code: voucher.code,
    title: voucher.title,
    description: voucher.description,
    platform: voucher.platform,
    discountType: voucher.discountType,
    discountValue: voucher.discountValue,
    minSpend: voucher.minSpend,
    maxDiscount: voucher.maxDiscount,
    startDate: voucher.startDate.toISOString(),
    endDate: voucher.endDate.toISOString(),
    isActive: voucher.isActive,
    scope: voucher.scope,
    applicableShopIds: voucher.applicableShopIds,
    applicableCategoryIds: voucher.applicableCategoryIds,
    applicableProductIds: voucher.applicableProductIds,
    freshnessStatus: voucher.freshnessStatus,
    qualityScore: voucher.qualityScore,
    createdAt: voucher.createdAt.toISOString(),
    updatedAt: voucher.updatedAt.toISOString(),
  };
}

/**
 * Serialize voucher catalog entries
 */
export function serializeVoucherCatalogEntries(vouchers: VoucherNormalizedRecord[]): VoucherCatalogEntry[] {
  return vouchers.map(serializeVoucherCatalogEntry);
}

/**
 * Serialize ingestion run to API response
 */
export function serializeIngestionRun(run: VoucherIngestionRun): IngestionRunResponse {
  return {
    id: run.id,
    sourceId: run.sourceId,
    runStatus: run.runStatus,
    itemsSeen: run.itemsSeen,
    itemsInserted: run.itemsInserted,
    itemsUpdated: run.itemsUpdated,
    itemsSkipped: run.itemsSkipped,
    itemsFailed: run.itemsFailed,
    errorSummary: run.errorSummary,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() || null,
    createdAt: run.createdAt.toISOString(),
  };
}

/**
 * Serialize rule set to API response
 */
export function serializeRuleSet(ruleSet: VoucherRuleSet): RuleResponse {
  return {
    id: ruleSet.id,
    voucherId: ruleSet.voucherId,
    ruleVersion: ruleSet.ruleVersion,
    ruleStatus: ruleSet.ruleStatus,
    rulePayload: ruleSet.rulePayload as unknown as Record<string, unknown>,
    validationStatus: ruleSet.validationStatus,
    validationErrors: ruleSet.validationErrors,
    createdBy: ruleSet.createdBy,
    activatedAt: ruleSet.activatedAt?.toISOString() || null,
    createdAt: ruleSet.createdAt.toISOString(),
    updatedAt: ruleSet.updatedAt.toISOString(),
  };
}

/**
 * Serialize source to API response
 */
export function serializeSource(source: VoucherCatalogSource): SourceResponse {
  return {
    id: source.id,
    sourceName: source.sourceName,
    sourceType: source.sourceType,
    platform: source.platform,
    sourceConfig: source.sourceConfig,
    isActive: source.isActive,
    lastSyncedAt: source.lastSyncedAt?.toISOString() || null,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  };
}

/**
 * Serialize override to API response
 */
export function serializeOverride(override: VoucherOverrideRecord): OverrideResponse {
  return {
    id: override.id,
    voucherId: override.voucherId,
    overrideType: override.overrideType,
    overridePayload: override.overridePayload,
    overrideStatus: override.overrideStatus,
    createdBy: override.createdBy,
    expiresAt: override.expiresAt?.toISOString() || null,
    createdAt: override.createdAt.toISOString(),
    updatedAt: override.updatedAt.toISOString(),
  };
}

/**
 * Serialize evaluation result to API response
 */
export function serializeEvaluationResult(evaluation: VoucherMatchEvaluationResult): EvaluateVoucherResponse {
  return {
    id: evaluation.id,
    platform: evaluation.platform,
    evaluationStatus: evaluation.evaluationStatus,
    qualityScore: evaluation.qualityScore,
    qualityMetrics: evaluation.qualityMetrics
      ? {
          bestMatchAccuracy: evaluation.qualityMetrics.bestMatchAccuracy,
          topKRecall: evaluation.qualityMetrics.topKRecall,
          topKPrecision: evaluation.qualityMetrics.topKPrecision,
          rankingDiscount: evaluation.qualityMetrics.rankingDiscount,
          rankingCorrelation: evaluation.qualityMetrics.rankingCorrelation,
          falsePositiveHints: evaluation.qualityMetrics.falsePositiveHints,
          falseNegativeHints: evaluation.qualityMetrics.falseNegativeHints,
          coverageScore: evaluation.qualityMetrics.coverageScore,
          confidenceScore: evaluation.qualityMetrics.confidenceScore,
        }
      : null,
    createdAt: evaluation.createdAt.toISOString(),
  };
}

/**
 * Serialize pagination response
 */
export function serializePaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
} {
  return {
    data,
    total,
    limit,
    offset,
    hasMore: offset + data.length < total,
  };
}
