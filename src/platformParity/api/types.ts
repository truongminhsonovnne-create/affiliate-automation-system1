/**
 * Platform Parity API Types
 * DTO/Contracts for API layer
 */

import { z } from 'zod';

// =============================================================================
// Enums (mirrored from domain types)
// =============================================================================

export const ApiPlatformKey = z.enum(['shopee', 'tiktok_shop']);

export const ApiPlatformParityScope = z.enum([
  'operational',
  'commercial',
  'technical',
  'governance',
  'product_ops',
  'bi_analytics',
  'consumer_experience',
  'publishing',
  'discovery',
  'detail',
  'enrichment',
]);

export const ApiPlatformParityLevel = z.enum([
  'full_parity',
  'operational_parity',
  'reporting_parity',
  'governance_parity',
  'partial_parity',
  'platform_specific',
  'exception_allowed',
  'hardening_required',
  'unknown',
]);

export const ApiPlatformParityGapSeverity = z.enum(['critical', 'high', 'medium', 'low', 'info']);

export const ApiPlatformParityGapStatus = z.enum([
  'open',
  'investigating',
  'in_progress',
  'resolved',
  'accepted_exception',
  'wont_fix',
]);

export const ApiPlatformExceptionStatus = z.enum(['active', 'under_review', 'deprecated', 'resolved']);

// =============================================================================
// DTOs
// =============================================================================

export const PlatformParitySnapshotDto = z.object({
  id: z.string().uuid(),
  snapshotWindowStart: z.string().datetime(),
  snapshotWindowEnd: z.string().datetime(),
  parityScope: ApiPlatformParityScope,
  parityPayload: z.record(z.unknown()),
  createdAt: z.string().datetime(),
});

export type PlatformParitySnapshotDto = z.infer<typeof PlatformParitySnapshotDto>;

export const PlatformParityGapDto = z.object({
  id: z.string().uuid(),
  platformKey: ApiPlatformKey,
  gapArea: z.string(),
  gapStatus: ApiPlatformParityGapStatus,
  severity: ApiPlatformParityGapSeverity,
  gapPayload: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
});

export type PlatformParityGapDto = z.infer<typeof PlatformParityGapDto>;

export const UnifiedOpsViewDto = z.object({
  id: z.string().uuid(),
  viewKey: z.string(),
  viewScope: z.string(),
  viewStatus: z.enum(['active', 'deprecated', 'disabled']),
  configurationPayload: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UnifiedOpsViewDto = z.infer<typeof UnifiedOpsViewDto>;

export const CrossPlatformComparisonDto = z.object({
  comparisonId: z.string(),
  comparisonScope: ApiPlatformParityScope,
  comparisonTimestamp: z.string().datetime(),
  metrics: z.array(z.object({
    metricKey: z.string(),
    metricLabel: z.string(),
    shopeeValue: z.number(),
    tiktokValue: z.number(),
    difference: z.number(),
    differencePercent: z.number(),
    isDrift: z.boolean(),
    driftThreshold: z.number(),
  })),
  overallParityLevel: ApiPlatformParityLevel,
  significantDrifts: z.array(z.object({
    metricKey: z.string(),
    metricLabel: z.string(),
    shopeeValue: z.number(),
    tiktokValue: z.number(),
    difference: z.number(),
    differencePercent: z.number(),
    isDrift: z.boolean(),
    driftThreshold: z.number(),
  })),
  summary: z.string(),
});

export type CrossPlatformComparisonDto = z.infer<typeof CrossPlatformComparisonDto>;

export const ParityDecisionSupportDto = z.object({
  reportId: z.string(),
  generatedAt: z.string().datetime(),
  snapshotWindow: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  currentParityState: ApiPlatformParityLevel,
  recommendations: z.array(z.object({
    id: z.string(),
    recommendationType: z.enum(['abstraction', 'platform_specific', 'gap_remediation', 'exception_approval', 'surface_unification']),
    priorityScore: z.number(),
    title: z.string(),
    description: z.string(),
    affectedScopes: z.array(ApiPlatformParityScope),
    affectedPlatforms: z.array(ApiPlatformKey),
    estimatedEffort: z.enum(['small', 'medium', 'large']),
    riskIfIgnored: ApiPlatformParityGapSeverity,
    successMetrics: z.array(z.string()),
    createdAt: z.string().datetime(),
  })),
  gapPriorities: z.array(z.object({
    gapId: z.string(),
    gapArea: z.string(),
    severity: ApiPlatformParityGapSeverity,
    priorityScore: z.number(),
  })),
  unificationVsExceptionDecisions: z.array(z.object({
    area: z.string(),
    recommendation: z.enum(['unify', 'maintain_exception', 'evaluate_further']),
    rationale: z.string(),
  })),
  riskSummary: z.object({
    criticalGaps: z.number(),
    highGaps: z.number(),
    mediumGaps: z.number(),
    lowGaps: z.number(),
  }),
});

export type ParityDecisionSupportDto = z.infer<typeof ParityDecisionSupportDto>;

// =============================================================================
// Request Types
// =============================================================================

export const RunHardeningCycleRequest = z.object({
  shopeeMetrics: z.record(z.number()),
  tiktokMetrics: z.record(z.number()),
  snapshotWindowStart: z.string().datetime().optional(),
  snapshotWindowEnd: z.string().datetime().optional(),
});

export type RunHardeningCycleRequest = z.infer<typeof RunHardeningCycleRequest>;

export const GetGapsRequest = z.object({
  platformKey: ApiPlatformKey.optional(),
  gapArea: z.string().optional(),
  gapStatus: ApiPlatformParityGapStatus.optional(),
  severity: ApiPlatformParityGapSeverity.optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

export type GetGapsRequest = z.infer<typeof GetGapsRequest>;

// =============================================================================
// Response Types
// =============================================================================

export const ParitySummaryResponse = z.object({
  overallParityLevel: ApiPlatformParityLevel,
  scopeSummaries: z.record(z.object({
    level: ApiPlatformParityLevel,
    isAcceptable: z.boolean(),
    gapCount: z.number(),
    exceptionCount: z.number(),
  })),
  totalGaps: z.number(),
  totalExceptions: z.number(),
  criticalGaps: z.number(),
});

export type ParitySummaryResponse = z.infer<typeof ParitySummaryResponse>;

export const GapsListResponse = z.object({
  gaps: z.array(PlatformParityGapDto),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type GapsListResponse = z.infer<typeof GapsListResponse>;

export const ComparisonResponse = z.object({
  comparison: CrossPlatformComparisonDto,
});

export type ComparisonResponse = z.infer<typeof ComparisonResponse>;

export const HardeningCycleResponse = z.object({
  parityModel: z.object({
    modelId: z.string(),
    overallParityLevel: ApiPlatformParityLevel,
    generatedAt: z.string().datetime(),
  }),
  decisionSupport: ParityDecisionSupportDto,
  snapshotId: z.string().uuid(),
  gapsDetected: z.number(),
  backlogCreated: z.number(),
});

export type HardeningCycleResponse = z.infer<typeof HardeningCycleResponse>;

export const UnifiedOpsOverviewResponse = z.object({
  overview: z.object({
    totalProducts: z.record(z.number()),
    activeProducts: z.record(z.number()),
    errorRates: z.record(z.number()),
    lastSyncTimes: z.record(z.string().datetime()),
  }),
  summary: z.string(),
  healthStatus: z.enum(['healthy', 'warning', 'critical']),
});

export type UnifiedOpsOverviewResponse = z.infer<typeof UnifiedOpsOverviewResponse>;

export const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponse>;
