/**
 * TikTok Shop Data API Types
 * DTOs for TikTok Shop data layer APIs
 */

import type {
  TikTokShopDataSource,
  TikTokShopAcquisitionRun,
  TikTokShopProductSnapshot,
  TikTokShopContextEnrichmentRecord,
  TikTokShopDataReadinessSummary,
  TikTokShopDataBacklogItem,
  TikTokShopSourceReadinessResult,
} from '../types.js';

// Data Source DTOs
export interface TikTokShopDataSourceDto {
  id: string;
  sourceKey: string;
  sourceType: string;
  sourceStatus: string;
  sourcePriority: number;
  supportLevel: string;
  healthStatus: string;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt?: string;
}

export function toDataSourceDto(source: TikTokShopDataSource): TikTokShopDataSourceDto {
  return {
    id: source.id,
    sourceKey: source.sourceKey,
    sourceType: source.sourceType,
    sourceStatus: source.sourceStatus,
    sourcePriority: source.sourcePriority,
    supportLevel: source.supportLevel,
    healthStatus: source.healthStatus,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
    lastCheckedAt: source.lastCheckedAt?.toISOString(),
  };
}

// Acquisition Run DTOs
export interface TikTokShopAcquisitionRunDto {
  id: string;
  sourceId: string;
  runType: string;
  runStatus: string;
  itemsSeen: number;
  itemsNormalized: number;
  itemsEnriched: number;
  itemsFailed: number;
  errorSummary?: string;
  startedAt: string;
  finishedAt?: string;
  createdAt: string;
}

export function toAcquisitionRunDto(run: TikTokShopAcquisitionRun): TikTokShopAcquisitionRunDto {
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
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString(),
    createdAt: run.createdAt.toISOString(),
  };
}

// Product Snapshot DTOs
export interface TikTokShopProductSnapshotDto {
  id: string;
  canonicalReferenceKey: string;
  sourceId?: string;
  productPayload: Record<string, unknown>;
  normalizationStatus: string;
  enrichmentStatus: string;
  freshnessStatus: string;
  qualityScore?: number;
  createdAt: string;
  updatedAt: string;
  snapshotTime: string;
}

export function toProductSnapshotDto(snapshot: TikTokShopProductSnapshot): TikTokShopProductSnapshotDto {
  return {
    id: snapshot.id,
    canonicalReferenceKey: snapshot.canonicalReferenceKey,
    sourceId: snapshot.sourceId,
    productPayload: snapshot.productPayload,
    normalizationStatus: snapshot.normalizationStatus,
    enrichmentStatus: snapshot.enrichmentStatus,
    freshnessStatus: snapshot.freshnessStatus,
    qualityScore: snapshot.qualityScore,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
    snapshotTime: snapshot.snapshotTime.toISOString(),
  };
}

// Context Enrichment DTOs
export interface TikTokShopContextEnrichmentDto {
  id: string;
  canonicalReferenceKey: string;
  enrichmentType: string;
  enrichmentStatus: string;
  enrichmentPayload: Record<string, unknown>;
  qualityScore?: number;
  createdAt: string;
}

export function toContextEnrichmentDto(enrichment: TikTokShopContextEnrichmentRecord): TikTokShopContextEnrichmentDto {
  return {
    id: enrichment.id,
    canonicalReferenceKey: enrichment.canonicalReferenceKey,
    enrichmentType: enrichment.enrichmentType,
    enrichmentStatus: enrichment.enrichmentStatus,
    enrichmentPayload: enrichment.enrichmentPayload,
    qualityScore: enrichment.qualityScore,
    createdAt: enrichment.createdAt.toISOString(),
  };
}

// Data Readiness DTOs
export interface TikTokShopDataReadinessDto {
  overallScore: number;
  readinessStatus: string;
  contextScore: number;
  promotionSourceScore: number;
  qualityScore: number;
  freshnessScore: number;
  blockers: Array<{
    blockerId: string;
    message: string;
    severity: string;
  }>;
  warnings: Array<{
    warningId: string;
    message: string;
    severity: string;
  }>;
}

export function toDataReadinessDto(summary: TikTokShopDataReadinessSummary): TikTokShopDataReadinessDto {
  return {
    overallScore: summary.overallScore,
    readinessStatus: summary.readinessStatus,
    contextScore: summary.contextScore,
    promotionSourceScore: summary.promotionSourceScore,
    qualityScore: summary.qualityScore,
    freshnessScore: summary.freshnessScore,
    blockers: [],
    warnings: [],
  };
}

// Data Gap DTOs
export interface TikTokShopDataGapDto {
  id: string;
  backlogType: string;
  backlogStatus: string;
  priority: string;
  backlogPayload: Record<string, unknown>;
  assignedTo?: string;
  dueAt?: string;
  createdAt: string;
  completedAt?: string;
}

export function toDataGapDto(gap: TikTokShopDataBacklogItem): TikTokShopDataGapDto {
  return {
    id: gap.id,
    backlogType: gap.backlogType,
    backlogStatus: gap.backlogStatus,
    priority: gap.priority,
    backlogPayload: gap.backlogPayload,
    assignedTo: gap.assignedTo,
    dueAt: gap.dueAt?.toISOString(),
    createdAt: gap.createdAt.toISOString(),
    completedAt: gap.completedAt?.toISOString(),
  };
}

// Source Readiness DTOs
export interface TikTokShopSourceReadinessDto {
  sourceKey: string;
  readinessStatus: string;
  readinessScore: number;
  blockers: Array<{
    blockerId: string;
    blockerType: string;
    severity: string;
    message: string;
  }>;
  warnings: Array<{
    warningId: string;
    warningType: string;
    severity: string;
    message: string;
  }>;
}

export function toSourceReadinessDto(result: TikTokShopSourceReadinessResult): TikTokShopSourceReadinessDto {
  return {
    sourceKey: result.sourceKey,
    readinessStatus: result.readinessStatus,
    readinessScore: result.readinessScore,
    blockers: result.blockers.map((b) => ({
      blockerId: b.blockerId,
      blockerType: b.blockerType,
      severity: b.severity,
      message: b.message,
    })),
    warnings: result.warnings.map((w) => ({
      warningId: w.warningId,
      warningType: w.warningType,
      severity: w.severity,
      message: w.message,
    })),
  };
}
