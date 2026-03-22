/**
 * Platform Parity Hardening Layer - Constants
 * Default values, thresholds, and configuration for parity management
 */

import {
  PlatformParityGapSeverity,
  PlatformParityLevel,
  PlatformParityScope,
} from './types.js';

// =============================================================================
// Parity Thresholds
// =============================================================================

/** Minimum acceptable parity percentage to consider full parity */
export const FULL_PARITY_THRESHOLD = 0.95; // 95%

/** Minimum acceptable parity percentage for operational parity */
export const OPERATIONAL_PARITY_THRESHOLD = 0.80; // 80%

/** Minimum acceptable parity percentage for reporting parity */
export const REPORTING_PARITY_THRESHOLD = 0.75; // 75%

/** Minimum acceptable parity percentage for governance parity */
export const GOVERNANCE_PARITY_THRESHOLD = 0.70; // 70%

/** Threshold below which partial parity is declared */
export const PARTIAL_PARITY_THRESHOLD = 0.50; // 50%

// =============================================================================
// Gap Severity Thresholds
// =============================================================================

/** Time in ms to auto-escalate critical gaps if unresolved */
export const CRITICAL_GAP_ESCALATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Time in ms to auto-escalate high severity gaps if unresolved */
export const HIGH_GAP_ESCALATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/** Time in ms to auto-escalate medium severity gaps if unresolved */
export const MEDIUM_GAP_ESCALATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Time in ms to auto-escalate low severity gaps if unresolved */
export const LOW_GAP_ESCALATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// =============================================================================
// Comparison Windows
// =============================================================================

/** Default window for cross-platform metric comparisons */
export const DEFAULT_COMPARISON_WINDOW_HOURS = 24;

/** Minimum window for snapshot retention */
export const SNAPSHOT_RETENTION_DAYS = 90;

/** Maximum window for a single snapshot */
export const MAX_SNAPSHOT_WINDOW_HOURS = 168; // 7 days

// =============================================================================
// Unified Card Limits
// =============================================================================

/** Maximum number of items to display per unified ops card */
export const UNIFIED_OPS_CARD_LIMIT = 50;

/** Maximum number of metrics per BI surface */
export const BI_SURFACE_METRIC_LIMIT = 100;

/** Maximum number of recommendations per decision support report */
export const RECOMMENDATION_LIMIT = 20;

/** Maximum number of gap priorities to display */
export const GAP_PRIORITY_LIMIT = 30;

// =============================================================================
// Exception Review Windows
// =============================================================================

/** Time in ms before exception needs review */
export const EXCEPTION_REVIEW_WINDOW_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/** Time in ms before deprecated exception is auto-resolved */
export const EXCEPTION_DEPRECATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// =============================================================================
// Parity Backlog Priority Thresholds
// =============================================================================

/** Priority score threshold for critical backlog items */
export const BACKLOG_CRITICAL_THRESHOLD = 90;

/** Priority score threshold for high priority backlog items */
export const BACKLOG_HIGH_THRESHOLD = 75;

/** Priority score threshold for medium priority backlog items */
export const BACKLOG_MEDIUM_THRESHOLD = 50;

/** Priority score threshold for low priority backlog items */
export const BACKLOG_LOW_THRESHOLD = 25;

// =============================================================================
// Cross-Platform Drift Thresholds
// =============================================================================

/** Maximum acceptable drift percentage for quality metrics */
export const QUALITY_DRIFT_THRESHOLD = 0.15; // 15%

/** Maximum acceptable drift percentage for commercial metrics */
export const COMMERCIAL_DRIFT_THRESHOLD = 0.25; // 25%

/** Maximum acceptable drift percentage for operational metrics */
export const OPS_DRIFT_THRESHOLD = 0.20; // 20%

/** Maximum acceptable drift percentage for governance metrics */
export const GOVERNANCE_DRIFT_THRESHOLD = 0.30; // 30%

// =============================================================================
// Severity to Priority Score Mapping
// =============================================================================

export const SEVERITY_TO_PRIORITY_SCORE: Record<PlatformParityGapSeverity, number> = {
  [PlatformParityGapSeverity.CRITICAL]: 100,
  [PlatformParityGapSeverity.HIGH]: 80,
  [PlatformParityGapSeverity.MEDIUM]: 60,
  [PlatformParityGapSeverity.LOW]: 40,
  [PlatformParityGapSeverity.INFO]: 20,
};

// =============================================================================
// Parity Level to Threshold Mapping
// =============================================================================

export const PARITY_LEVEL_THRESHOLDS: Record<PlatformParityLevel, number> = {
  full_parity: FULL_PARITY_THRESHOLD,
  operational_parity: OPERATIONAL_PARITY_THRESHOLD,
  reporting_parity: REPORTING_PARITY_THRESHOLD,
  governance_parity: GOVERNANCE_PARITY_THRESHOLD,
  partial_parity: PARTIAL_PARITY_THRESHOLD,
  platform_specific: 0,
  exception_allowed: 0,
  hardening_required: 0,
  unknown: 0,
};

// =============================================================================
// Scope to Default Drift Threshold Mapping
// =============================================================================

export const SCOPE_TO_DRIFT_THRESHOLD: Record<PlatformParityScope, number> = {
  operational: OPS_DRIFT_THRESHOLD,
  commercial: COMMERCIAL_DRIFT_THRESHOLD,
  technical: QUALITY_DRIFT_THRESHOLD,
  governance: GOVERNANCE_DRIFT_THRESHOLD,
  product_ops: OPS_DRIFT_THRESHOLD,
  bi_analytics: REPORTING_PARITY_THRESHOLD,
  consumer_experience: QUALITY_DRIFT_THRESHOLD,
  publishing: OPS_DRIFT_THRESHOLD,
  discovery: QUALITY_DRIFT_THRESHOLD,
  detail: QUALITY_DRIFT_THRESHOLD,
  enrichment: QUALITY_DRIFT_THRESHOLD,
};

// =============================================================================
// Default Gap Detection Config
// =============================================================================

export const DEFAULT_GAP_DETECTION_CONFIG = {
  minSeverityForAlert: PlatformParityGapSeverity.MEDIUM,
  requireExceptionForGap: true,
  allowPlatformSpecificInScopes: [PlatformParityScope.CONSUMER_EXPERIENCE],
  snapshotWindowHours: DEFAULT_COMPARISON_WINDOW_HOURS,
  enableAutoEscalation: true,
  enableAutoBacklogCreation: true,
};

// =============================================================================
// Default Surface Build Config
// =============================================================================

export const DEFAULT_SURFACE_BUILD_CONFIG = {
  includeHistoricalComparison: true,
  includeDriftAnalysis: true,
  includeRecommendationGeneration: true,
  maxAgeForFreshData: 15 * 60 * 1000, // 15 minutes
  cacheEnabled: true,
};

// =============================================================================
// Platform Capability Defaults
// =============================================================================

export const PLATFORM_CAPABILITY_DEFAULTS: Record<string, Record<PlatformParityScope, PlatformParityLevel>> = {
  shopee: {
    operational: PlatformParityLevel.FULL_PARITY,
    commercial: PlatformParityLevel.FULL_PARITY,
    technical: PlatformParityLevel.FULL_PARITY,
    governance: PlatformParityLevel.FULL_PARITY,
    product_ops: PlatformParityLevel.FULL_PARITY,
    bi_analytics: PlatformParityLevel.FULL_PARITY,
    consumer_experience: PlatformParityLevel.FULL_PARITY,
    publishing: PlatformParityLevel.FULL_PARITY,
    discovery: PlatformParityLevel.FULL_PARITY,
    detail: PlatformParityLevel.FULL_PARITY,
    enrichment: PlatformParityLevel.FULL_PARITY,
  },
  tiktok_shop: {
    operational: PlatformParityLevel.OPERATIONAL_PARITY,
    commercial: PlatformParityLevel.OPERATIONAL_PARITY,
    technical: PlatformParityLevel.OPERATIONAL_PARITY,
    governance: PlatformParityLevel.REPORTING_PARITY,
    product_ops: PlatformParityLevel.OPERATIONAL_PARITY,
    bi_analytics: PlatformParityLevel.REPORTING_PARITY,
    consumer_experience: PlatformParityLevel.PARTIAL_PARITY,
    publishing: PlatformParityLevel.PARTIAL_PARITY,
    discovery: PlatformParityLevel.OPERATIONAL_PARITY,
    detail: PlatformParityLevel.OPERATIONAL_PARITY,
    enrichment: PlatformParityLevel.PARTIAL_PARITY,
  },
};

// =============================================================================
// Metric Definitions
// =============================================================================

export const CROSS_PLATFORM_METRICS = {
  // Operational Metrics
  totalProducts: { label: 'Total Products', scope: 'operational', lowerIsBetter: false },
  activeProducts: { label: 'Active Products', scope: 'operational', lowerIsBetter: false },
  errorRate: { label: 'Error Rate', scope: 'operational', lowerIsBetter: true },
  crawlSuccessRate: { label: 'Crawl Success Rate', scope: 'operational', lowerIsBetter: true },
  avgResponseTime: { label: 'Avg Response Time (ms)', scope: 'operational', lowerIsBetter: true },
  dataQualityScore: { label: 'Data Quality Score', scope: 'operational', lowerIsBetter: false },

  // Commercial Metrics
  totalRevenue: { label: 'Total Revenue', scope: 'commercial', lowerIsBetter: false },
  conversionRate: { label: 'Conversion Rate', scope: 'commercial', lowerIsBetter: false },
  avgOrderValue: { label: 'Avg Order Value', scope: 'commercial', lowerIsBetter: false },
  attributedSales: { label: 'Attributed Sales', scope: 'commercial', lowerIsBetter: false },

  // Discovery Metrics
  discoveredProducts: { label: 'Discovered Products', scope: 'discovery', lowerIsBetter: false },
  discoverySuccessRate: { label: 'Discovery Success Rate', scope: 'discovery', lowerIsBetter: false },
  uniqueProductsFound: { label: 'Unique Products Found', scope: 'discovery', lowerIsBetter: false },

  // Detail Metrics
  detailExtractionSuccess: { label: 'Detail Extraction Success', scope: 'detail', lowerIsBetter: false },
  mediaQualityScore: { label: 'Media Quality Score', scope: 'detail', lowerIsBetter: false },
  attributeCompleteness: { label: 'Attribute Completeness', scope: 'detail', lowerIsBetter: false },

  // Enrichment Metrics
  enrichmentSuccessRate: { label: 'Enrichment Success Rate', scope: 'enrichment', lowerIsBetter: false },
  aiProcessingTime: { label: 'AI Processing Time (ms)', scope: 'enrichment', lowerIsBetter: true },
  enrichmentQualityScore: { label: 'Enrichment Quality Score', scope: 'enrichment', lowerIsBetter: false },

  // Governance Metrics
  releaseReadinessScore: { label: 'Release Readiness Score', scope: 'governance', lowerIsBetter: false },
  enablementRiskScore: { label: 'Enablement Risk Score', scope: 'governance', lowerIsBetter: true },
  backlogCount: { label: 'Backlog Item Count', scope: 'governance', lowerIsBetter: true },
  governanceCompliance: { label: 'Governance Compliance %', scope: 'governance', lowerIsBetter: false },
};

// =============================================================================
// Audit Action Types
// =============================================================================

export const AUDIT_ACTIONS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  ACTIVATED: 'activated',
  DEACTIVATED: 'deactivated',
  GAP_DETECTED: 'gap_detected',
  GAP_RESOLVED: 'gap_resolved',
  EXCEPTION_REGISTERED: 'exception_registered',
  EXCEPTION_RESOLVED: 'exception_resolved',
} as const;

// =============================================================================
// Retry & Timeout Config
// =============================================================================

export const PARITY_SERVICE_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 1000,
  operationTimeoutMs: 30000,
  bulkOperationChunkSize: 100,
};

// =============================================================================
// Logging & Metrics
// =============================================================================

export const PARITY_LOG_CONTEXT = {
  service: 'platform-parity-hardening',
  version: '1.0.0',
};

export const METRIC_NAMES = {
  SNAPSHOT_CREATED: 'parity_snapshot_created',
  GAP_DETECTED: 'parity_gap_detected',
  GAP_RESOLVED: 'parity_gap_resolved',
  EXCEPTION_REGISTERED: 'parity_exception_registered',
  COMPARISON_BUILT: 'parity_comparison_built',
  SURFACE_BUILT: 'parity_surface_built',
  DECISION_SUPPORT_GENERATED: 'parity_decision_support_generated',
  BACKLOG_ITEM_CREATED: 'parity_backlog_item_created',
} as const;
