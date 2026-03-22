/**
 * Platform Parity API Serializers
 * Serialize domain results to DTOs
 */

import type {
  PlatformParitySnapshot,
  PlatformParityGap,
  PlatformParityLevel,
  PlatformParityScope,
  CrossPlatformComparisonResult,
  ParityHardeningDecisionSupport,
  ParitySummary,
} from '../types.js';

import {
  PlatformParitySnapshotDto,
  PlatformParityGapDto,
  CrossPlatformComparisonDto,
  ParityDecisionSupportDto,
  ParitySummaryResponse,
  PlatformParitySnapshotDto as SnapshotDto,
  GapsListResponse,
} from './types.js';

/**
 * Serialize platform parity snapshot to DTO
 */
export function serializeSnapshot(snapshot: PlatformParitySnapshot): SnapshotDto {
  return {
    id: snapshot.id,
    snapshotWindowStart: snapshot.snapshotWindowStart.toISOString(),
    snapshotWindowEnd: snapshot.snapshotWindowEnd.toISOString(),
    parityScope: snapshot.parityScope,
    parityPayload: snapshot.parityPayload,
    createdAt: snapshot.createdAt.toISOString(),
  };
}

/**
 * Serialize platform parity gap to DTO
 */
export function serializeGap(gap: PlatformParityGap): PlatformParityGapDto {
  return {
    id: gap.id,
    platformKey: gap.platformKey,
    gapArea: gap.gapArea,
    gapStatus: gap.gapStatus,
    severity: gap.severity,
    gapPayload: gap.gapPayload,
    createdAt: gap.createdAt.toISOString(),
    resolvedAt: gap.resolvedAt?.toISOString() ?? null,
  };
}

/**
 * Serialize array of gaps
 */
export function serializeGaps(gaps: PlatformParityGap[], total: number, limit: number, offset: number) {
  return {
    gaps: gaps.map(serializeGap),
    total,
    limit,
    offset,
  };
}

/**
 * Serialize cross-platform comparison to DTO
 */
export function serializeComparison(comparison: CrossPlatformComparisonResult): typeof CrossPlatformComparisonDto {
  return {
    comparisonId: comparison.comparisonId,
    comparisonScope: comparison.comparisonScope,
    comparisonTimestamp: comparison.comparisonTimestamp.toISOString(),
    metrics: comparison.metrics.map((m) => ({
      metricKey: m.metricKey,
      metricLabel: m.metricLabel,
      shopeeValue: m.shopeeValue,
      tiktokValue: m.tiktokValue,
      difference: m.difference,
      differencePercent: m.differencePercent,
      isDrift: m.isDrift,
      driftThreshold: m.driftThreshold,
    })),
    overallParityLevel: comparison.overallParityLevel as PlatformParityLevel,
    significantDrifts: comparison.significantDrifts.map((m) => ({
      metricKey: m.metricKey,
      metricLabel: m.metricLabel,
      shopeeValue: m.shopeeValue,
      tiktokValue: m.tiktokValue,
      difference: m.difference,
      differencePercent: m.differencePercent,
      isDrift: m.isDrift,
      driftThreshold: m.driftThreshold,
    })),
    summary: comparison.summary,
  };
}

/**
 * Serialize decision support to DTO
 */
export function serializeDecisionSupport(decisionSupport: ParityHardeningDecisionSupport): typeof ParityDecisionSupportDto {
  return {
    reportId: decisionSupport.reportId,
    generatedAt: decisionSupport.generatedAt.toISOString(),
    snapshotWindow: {
      start: decisionSupport.snapshotWindow.start.toISOString(),
      end: decisionSupport.snapshotWindow.end.toISOString(),
    },
    currentParityState: decisionSupport.currentParityState,
    recommendations: decisionSupport.recommendations.map((r) => ({
      id: r.id,
      recommendationType: r.recommendationType,
      priorityScore: r.priorityScore,
      title: r.title,
      description: r.description,
      affectedScopes: r.affectedScopes,
      affectedPlatforms: r.affectedPlatforms,
      estimatedEffort: r.estimatedEffort,
      riskIfIgnored: r.riskIfIgnored,
      successMetrics: r.successMetrics,
      createdAt: r.createdAt.toISOString(),
    })),
    gapPriorities: decisionSupport.gapPriorities.map((g) => ({
      gapId: g.gapId,
      gapArea: g.gapArea,
      severity: g.severity,
      priorityScore: g.priorityScore,
    })),
    unificationVsExceptionDecisions: decisionSupport.unificationVsExceptionDecisions.map((d) => ({
      area: d.area,
      recommendation: d.recommendation,
      rationale: d.rationale,
    })),
    riskSummary: decisionSupport.riskSummary,
  };
}

/**
 * Serialize parity summary to DTO
 */
export function serializeParitySummary(summary: ParitySummary): typeof ParitySummaryResponse {
  return {
    overallParityLevel: summary.overallLevel,
    scopeSummaries: Object.fromEntries(
      Object.entries(summary.scopeSummaries).map(([scope, data]) => [
        scope,
        {
          level: data.level,
          isAcceptable: data.isAcceptable,
          gapCount: data.gapCount,
          exceptionCount: data.exceptionCount,
        },
      ])
    ),
    totalGaps: summary.totalGaps,
    totalExceptions: summary.totalExceptions,
    criticalGaps: summary.criticalGaps,
  };
}

/**
 * Serialize error to API response format
 */
export function serializeError(code: string, message: string, details?: unknown) {
  return {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}
