/**
 * TikTok Shop Data API Serializers
 * Serializes domain results to DTOs
 */

import type {
  TikTokShopDataSourceDto,
  TikTokShopAcquisitionRunDto,
  TikTokShopProductSnapshotDto,
  TikTokShopContextEnrichmentDto,
  TikTokShopDataReadinessDto,
  TikTokShopDataGapDto,
  TikTokShopSourceReadinessDto,
} from './types.js';

/**
 * Serialize TikTok Shop data source to DTO
 */
export function serializeTikTokShopDataSource(source: any): TikTokShopDataSourceDto {
  return {
    id: source.id,
    sourceKey: source.sourceKey,
    sourceType: source.sourceType,
    sourceStatus: source.sourceStatus,
    sourcePriority: source.sourcePriority,
    supportLevel: source.supportLevel,
    healthStatus: source.healthStatus,
    createdAt: source.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: source.updatedAt?.toISOString() || new Date().toISOString(),
    lastCheckedAt: source.lastCheckedAt?.toISOString(),
  };
}

/**
 * Serialize TikTok Shop acquisition run to DTO
 */
export function serializeTikTokShopAcquisitionRun(run: any): TikTokShopAcquisitionRunDto {
  return {
    id: run.id,
    sourceId: run.sourceId,
    runType: run.runType,
    runStatus: run.runStatus,
    itemsSeen: run.itemsSeen,
    itemsNormalized: run.itemsNormalized,
    itemsEnriched: run.itemsEnriched,
    itemsFailed: run.itemsFailed,
    errorSummary: run.errorSummary,
    startedAt: run.startedAt?.toISOString() || new Date().toISOString(),
    finishedAt: run.finishedAt?.toISOString(),
    createdAt: run.createdAt?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Serialize TikTok Shop product snapshot to DTO
 */
export function serializeTikTokShopProductSnapshot(snapshot: any): TikTokShopProductSnapshotDto {
  return {
    id: snapshot.id,
    canonicalReferenceKey: snapshot.canonicalReferenceKey,
    sourceId: snapshot.sourceId,
    productPayload: snapshot.productPayload,
    normalizationStatus: snapshot.normalizationStatus,
    enrichmentStatus: snapshot.enrichmentStatus,
    freshnessStatus: snapshot.freshnessStatus,
    qualityScore: snapshot.qualityScore,
    createdAt: snapshot.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: snapshot.updatedAt?.toISOString() || new Date().toISOString(),
    snapshotTime: snapshot.snapshotTime?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Serialize TikTok Shop context enrichment to DTO
 */
export function serializeTikTokShopContextEnrichment(enrichment: any): TikTokShopContextEnrichmentDto {
  return {
    id: enrichment.id,
    canonicalReferenceKey: enrichment.canonicalReferenceKey,
    enrichmentType: enrichment.enrichmentType,
    enrichmentStatus: enrichment.enrichmentStatus,
    enrichmentPayload: enrichment.enrichmentPayload,
    qualityScore: enrichment.qualityScore,
    createdAt: enrichment.createdAt?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Serialize TikTok Shop data readiness to DTO
 */
export function serializeTikTokShopDataReadiness(readiness: any): TikTokShopDataReadinessDto {
  return {
    overallScore: readiness.overallScore,
    readinessStatus: readiness.readinessStatus,
    contextScore: readiness.contextScore,
    promotionSourceScore: readiness.promotionSourceScore,
    qualityScore: readiness.qualityScore,
    freshnessScore: readiness.freshnessScore,
    blockers: (readiness.blockers || []).map((b: any) => ({
      blockerId: b.blockerId,
      message: b.message,
      severity: b.severity,
    })),
    warnings: (readiness.warnings || []).map((w: any) => ({
      warningId: w.warningId,
      message: w.message,
      severity: w.severity,
    })),
  };
}

/**
 * Serialize TikTok Shop data gap to DTO
 */
export function serializeTikTokShopDataGap(gap: any): TikTokShopDataGapDto {
  return {
    id: gap.id,
    backlogType: gap.backlogType,
    backlogStatus: gap.backlogStatus,
    priority: gap.priority,
    backlogPayload: gap.backlogPayload,
    assignedTo: gap.assignedTo,
    dueAt: gap.dueAt?.toISOString(),
    createdAt: gap.createdAt?.toISOString() || new Date().toISOString(),
    completedAt: gap.completedAt?.toISOString(),
  };
}

/**
 * Serialize TikTok Shop source readiness to DTO
 */
export function serializeTikTokShopSourceReadiness(result: any): TikTokShopSourceReadinessDto {
  return {
    sourceKey: result.sourceKey,
    readinessStatus: result.readinessStatus,
    readinessScore: result.readinessScore,
    blockers: (result.blockers || []).map((b: any) => ({
      blockerId: b.blockerId,
      blockerType: b.blockerType,
      severity: b.severity,
      message: b.message,
    })),
    warnings: (result.warnings || []).map((w: any) => ({
      warningId: w.warningId,
      warningType: w.warningType,
      severity: w.severity,
      message: w.message,
    })),
  };
}

/**
 * Serialize error response
 */
export function serializeError(error: any, statusCode: number = 500) {
  return {
    error: {
      code: statusCode,
      message: error.message || 'Internal server error',
      details: error.details,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Serialize success response
 */
export function serializeSuccess(data: any, meta?: any) {
  return {
    data,
    meta: meta || {
      timestamp: new Date().toISOString(),
    },
  };
}
