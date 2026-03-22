/**
 * Platform Parity Hardening Layer - Type Definitions
 * Production-grade types for multi-platform parity management
 */

import { z } from 'zod';

// =============================================================================
// Platform Key Enums
// =============================================================================

export const PlatformKey = {
  SHOPEE: 'shopee',
  TIKTOK: 'tiktok_shop',
} as const;

export type PlatformKey = (typeof PlatformKey)[keyof typeof PlatformKey];

export const AllPlatformKeys: PlatformKey[] = [PlatformKey.SHOPEE, PlatformKey.TIKTOK];

// =============================================================================
// Parity Scope & Level
// =============================================================================

export const PlatformParityScope = {
  OPERATIONAL: 'operational',
  COMMERCIAL: 'commercial',
  TECHNICAL: 'technical',
  GOVERNANCE: 'governance',
  PRODUCT_OPS: 'product_ops',
  BI_ANALYTICS: 'bi_analytics',
  CONSUMER_EXPERIENCE: 'consumer_experience',
  PUBLISHING: 'publishing',
  DISCOVERY: 'discovery',
  DETAIL: 'detail',
  ENRICHMENT: 'enrichment',
} as const;

export type PlatformParityScope = (typeof PlatformParityScope)[keyof typeof PlatformParityScope];

export const PlatformParityLevel = {
  FULL_PARITY: 'full_parity',
  OPERATIONAL_PARITY: 'operational_parity',
  REPORTING_PARITY: 'reporting_parity',
  GOVERNANCE_PARITY: 'governance_parity',
  PARTIAL_PARITY: 'partial_parity',
  PLATFORM_SPECIFIC: 'platform_specific',
  EXCEPTION_ALLOWED: 'exception_allowed',
  HARDENING_REQUIRED: 'hardening_required',
  UNKNOWN: 'unknown',
} as const;

export type PlatformParityLevel =
  (typeof PlatformParityLevel)[keyof typeof PlatformParityLevel];

// =============================================================================
// Gap Area & Severity
// =============================================================================

export const PlatformParityGapArea = {
  CRAWLER_INFRASTRUCTURE: 'crawler_infrastructure',
  PRODUCT_DISCOVERY: 'product_discovery',
  PRODUCT_DETAIL_EXTRACTION: 'product_detail_extraction',
  AI_ENRICHMENT: 'ai_enrichment',
  DATA_QUALITY: 'data_quality',
  PUBLISHING_WORKFLOW: 'publishing_workflow',
  CONSUMER_FLOW: 'consumer_flow',
  PUBLIC_LINK_RESOLUTION: 'public_link_resolution',
  CONVERSION_TRACKING: 'conversion_tracking',
  PLATFORM_POLICIES: 'platform_policies',
  GOVERNANCE_PROCESS: 'governance_process',
  RELEASE_READINESS: 'release_readiness',
  ENABLEMENT_DECISION: 'enablement_decision',
  COMMERCIAL_ATTRIBUTION: 'commercial_attribution',
  GROWTH_ANALYTICS: 'growth_analytics',
  FOUNDER_COCKPIT: 'founder_cockpit',
  EXECUTIVE_REPORTING: 'executive_reporting',
  OPERATOR_DASHBOARD: 'operator_dashboard',
  BACKLOG_MANAGEMENT: 'backlog_management',
  QUALITY_GATE: 'quality_gate',
  ERROR_HANDLING: 'error_handling',
  OBSERVABILITY: 'observability',
  SECURITY: 'security',
} as const;

export type PlatformParityGapArea =
  (typeof PlatformParityGapArea)[keyof typeof PlatformParityGapArea];

export const PlatformParityGapSeverity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
} as const;

export type PlatformParityGapSeverity =
  (typeof PlatformParityGapSeverity)[keyof typeof PlatformParityGapSeverity];

export const PlatformParityGapStatus = {
  OPEN: 'open',
  INVESTIGATING: 'investigating',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  ACCEPTED_EXCEPTION: 'accepted_exception',
  WONT_FIX: 'wont_fix',
} as const;

export type PlatformParityGapStatus =
  (typeof PlatformParityGapStatus)[keyof typeof PlatformParityGapStatus];

// =============================================================================
// Exception Status
// =============================================================================

export const PlatformExceptionStatus = {
  ACTIVE: 'active',
  UNDER_REVIEW: 'under_review',
  DEPRECATED: 'deprecated',
  RESOLVED: 'resolved',
} as const;

export type PlatformExceptionStatus =
  (typeof PlatformExceptionStatus)[keyof typeof PlatformExceptionStatus];

// =============================================================================
// Domain Models - Platform Parity
// =============================================================================

export interface PlatformParitySnapshot {
  id: string;
  snapshotWindowStart: Date;
  snapshotWindowEnd: Date;
  parityScope: PlatformParityScope;
  parityPayload: Record<string, unknown>;
  createdAt: Date;
}

export interface PlatformParityGap {
  id: string;
  platformKey: PlatformKey;
  gapArea: PlatformParityGapArea;
  gapStatus: PlatformParityGapStatus;
  severity: PlatformParityGapSeverity;
  gapPayload: Record<string, unknown>;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface PlatformExceptionRecord {
  id: string;
  platformKey: PlatformKey;
  exceptionArea: PlatformParityGapArea;
  exceptionStatus: PlatformExceptionStatus;
  exceptionPayload: Record<string, unknown>;
  rationale?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface UnifiedOpsView {
  id: string;
  viewKey: string;
  viewScope: string;
  viewStatus: 'active' | 'deprecated' | 'disabled';
  configurationPayload?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Cross-Platform Comparison
// =============================================================================

export interface CrossPlatformMetricComparison {
  metricKey: string;
  metricLabel: string;
  shopeeValue: number;
  tiktokValue: number;
  difference: number;
  differencePercent: number;
  isDrift: boolean;
  driftThreshold: number;
}

export interface CrossPlatformComparisonResult {
  comparisonId: string;
  comparisonScope: PlatformParityScope;
  comparisonTimestamp: Date;
  metrics: CrossPlatformMetricComparison[];
  overallParityLevel: PlatformParityLevel;
  significantDrifts: CrossPlatformMetricComparison[];
  summary: string;
}

// =============================================================================
// Parity Decision Support
// =============================================================================

export interface ParityHardeningRecommendation {
  id: string;
  recommendationType: 'abstraction' | 'platform_specific' | 'gap_remediation' | 'exception_approval' | 'surface_unification';
  priorityScore: number;
  title: string;
  description: string;
  affectedScopes: PlatformParityScope[];
  affectedPlatforms: PlatformKey[];
  estimatedEffort: 'small' | 'medium' | 'large';
  riskIfIgnored: PlatformParityGapSeverity;
  successMetrics: string[];
  createdAt: Date;
}

export interface ParityHardeningDecisionSupport {
  reportId: string;
  generatedAt: Date;
  snapshotWindow: {
    start: Date;
    end: Date;
  };
  currentParityState: PlatformParityLevel;
  recommendations: ParityHardeningRecommendation[];
  gapPriorities: Array<{
    gapId: string;
    gapArea: PlatformParityGapArea;
    severity: PlatformParityGapSeverity;
    priorityScore: number;
  }>;
  unificationVsExceptionDecisions: Array<{
    area: PlatformParityGapArea;
    recommendation: 'unify' | 'maintain_exception' | 'evaluate_further';
    rationale: string;
  }>;
  riskSummary: {
    criticalGaps: number;
    highGaps: number;
    mediumGaps: number;
    lowGaps: number;
  };
}

// =============================================================================
// Parity Warning & Error
// =============================================================================

export interface PlatformParityWarning {
  warningCode: string;
  warningMessage: string;
  affectedPlatforms: PlatformKey[];
  affectedScopes: PlatformParityScope[];
  suggestedAction?: string;
  createdAt: Date;
}

export interface PlatformParityError {
  errorCode: string;
  errorMessage: string;
  affectedPlatforms: PlatformKey[];
  affectedScopes: PlatformParityScope[];
  severity: PlatformParityGapSeverity;
  createdAt: Date;
}

// =============================================================================
// Unified Surface Models
// =============================================================================

export interface UnifiedBiSurface {
  surfaceKey: string;
  surfaceType: 'executive' | 'operator' | 'founder' | 'comparison';
  platformData: Record<PlatformKey, Record<string, unknown>>;
  crossPlatformMetrics: CrossPlatformMetricComparison[];
  generatedAt: Date;
}

export interface UnifiedGovernanceSurface {
  surfaceKey: string;
  surfaceType: 'overview' | 'release_readiness' | 'enablement_risk' | 'backlog_pressure';
  releaseReadinessData: Record<PlatformKey, Record<string, unknown>>;
  enablementRiskData: Record<PlatformKey, Record<string, unknown>>;
  backlogPressureData: Record<PlatformKey, Record<string, unknown>>;
  governanceMetrics: Record<string, unknown>;
  generatedAt: Date;
}

export interface UnifiedOpsViewData {
  overview: {
    totalProducts: Record<PlatformKey, number>;
    activeProducts: Record<PlatformKey, number>;
    errorRates: Record<PlatformKey, number>;
    lastSyncTimes: Record<PlatformKey, Date>;
  };
  productOps: {
    discoveryStatus: Record<PlatformKey, Record<string, unknown>>;
    detailStatus: Record<PlatformKey, Record<string, unknown>>;
    enrichmentStatus: Record<PlatformKey, Record<string, unknown>>;
  };
  commercial: {
    revenue: Record<PlatformKey, number>;
    conversions: Record<PlatformKey, number>;
    attributionStatus: Record<PlatformKey, Record<string, unknown>>;
  };
  growth: {
    newProducts: Record<PlatformKey, number>;
    trendingProducts: Record<PlatformKey, number>;
    growthRates: Record<PlatformKey, number>;
  };
  release: {
    readinessScores: Record<PlatformKey, number>;
    pendingReleases: Record<PlatformKey, number>;
    failedReleases: Record<PlatformKey, number>;
  };
}

// =============================================================================
// Backlog Models
// =============================================================================

export interface ParityBacklogItem {
  id: string;
  gapId?: string;
  backlogType: 'gap_remediation' | 'exception_review' | 'surface_unification' | 'abstraction_work' | 'governance_action';
  priorityScore: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// =============================================================================
// Zod Schemas for Validation
// =============================================================================

export const PlatformKeySchema = z.enum([PlatformKey.SHOPEE, PlatformKey.TIKTOK]);

export const PlatformParityScopeSchema = z.enum(Object.values(PlatformParityScope) as [string, ...string[]]);

export const PlatformParityLevelSchema = z.enum(Object.values(PlatformParityLevel) as [string, ...string[]]);

export const PlatformParityGapAreaSchema = z.enum(
  Object.values(PlatformParityGapArea) as [string, ...string[]]
);

export const PlatformParityGapSeveritySchema = z.enum(
  Object.values(PlatformParityGapSeverity) as [string, ...string[]]
);

export const PlatformParityGapStatusSchema = z.enum(
  Object.values(PlatformParityGapStatus) as [string, ...string[]]
);

export const PlatformExceptionStatusSchema = z.enum(
  Object.values(PlatformExceptionStatus) as [string, ...string[]]
);

export const PlatformParitySnapshotSchema = z.object({
  id: z.string().uuid(),
  snapshotWindowStart: z.date(),
  snapshotWindowEnd: z.date(),
  parityScope: PlatformParityScopeSchema,
  parityPayload: z.record(z.unknown()),
  createdAt: z.date(),
});

export const PlatformParityGapSchema = z.object({
  id: z.string().uuid(),
  platformKey: PlatformKeySchema,
  gapArea: PlatformParityGapAreaSchema,
  gapStatus: PlatformParityGapStatusSchema,
  severity: PlatformParityGapSeveritySchema,
  gapPayload: z.record(z.unknown()),
  createdAt: z.date(),
  resolvedAt: z.date().optional(),
});

export const PlatformExceptionRecordSchema = z.object({
  id: z.string().uuid(),
  platformKey: PlatformKeySchema,
  exceptionArea: PlatformParityGapAreaSchema,
  exceptionStatus: PlatformExceptionStatusSchema,
  exceptionPayload: z.record(z.unknown()),
  rationale: z.string().optional(),
  createdAt: z.date(),
  resolvedAt: z.date().optional(),
});

// =============================================================================
// Input Types for Services
// =============================================================================

export interface PlatformParitySnapshotInput {
  snapshotWindowStart: Date;
  snapshotWindowEnd: Date;
  parityScope: PlatformParityScope;
  parityPayload: Record<string, unknown>;
}

export interface PlatformParityGapInput {
  platformKey: PlatformKey;
  gapArea: PlatformParityGapArea;
  gapStatus?: PlatformParityGapStatus;
  severity: PlatformParityGapSeverity;
  gapPayload: Record<string, unknown>;
}

export interface PlatformExceptionInput {
  platformKey: PlatformKey;
  exceptionArea: PlatformParityGapArea;
  exceptionPayload: Record<string, unknown>;
  rationale?: string;
}

export interface CrossPlatformComparisonInput {
  comparisonScope: PlatformParityScope;
  shopeeMetrics: Record<string, number>;
  tiktokMetrics: Record<string, number>;
  driftThresholds: Record<string, number>;
}

export interface UnifiedOpsViewInput {
  viewKey: string;
  viewScope: string;
  viewStatus?: 'active' | 'deprecated' | 'disabled';
  configurationPayload?: Record<string, unknown>;
}

export interface ParityBacklogItemInput {
  gapId?: string;
  backlogType: ParityBacklogItem['backlogType'];
  title: string;
  description?: string;
  priorityScore: number;
  assignedTo?: string;
  dueDate?: Date;
}

// =============================================================================
// Utility Types
// =============================================================================

export type ParityLevelCategory = 'parity' | 'exception' | 'gap';

export interface ParitySummary {
  overallLevel: PlatformParityLevel;
  scopeSummaries: Record<
    PlatformParityScope,
    {
      level: PlatformParityLevel;
      isAcceptable: boolean;
      gapCount: number;
      exceptionCount: number;
    }
  >;
  totalGaps: number;
  totalExceptions: number;
  criticalGaps: number;
}

export interface PlatformCapabilityMatrix {
  platform: PlatformKey;
  capabilities: Record<PlatformParityScope, PlatformParityLevel>;
  lastUpdated: Date;
}
