/**
 * Voucher Intelligence Constants
 *
 * Centralized constants for the voucher intelligence improvement loop
 */

import { Platform, VoucherOutcomeEventType, VoucherOptimizationSeverity, NoMatchRootCause } from '../types/index.js';

// ============================================================================
// Event Windows & Aggregation
// ============================================================================

export const INTELLIGENCE_WINDOWS = {
  // Short window for real-time analysis
  SHORT_HOURS: 24,

  // Medium window for trend analysis
  MEDIUM_DAYS: 7,

  // Long window for historical analysis
  LONG_DAYS: 30,

  // Very long for strategic analysis
  STRATEGIC_DAYS: 90,
} as const;

// ============================================================================
// Aggregation Windows
// ============================================================================

export const AGGREGATION_WINDOWS = {
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const;

// ============================================================================
// Ranking Signal Thresholds
// ============================================================================

export const RANKING_THRESHOLDS = {
  // Minimum sample size for statistical significance
  MIN_SAMPLE_SIZE: 30,

  // Minimum copy rate to consider a voucher as "selected"
  MIN_COPY_RATE: 0.05,

  // Divergence threshold: when candidate is significantly better than best
  BEST_VS_CANDIDATE_DIVERGENCE: 0.3,

  // Underperformance threshold: best voucher selected less than this
  BEST_VOUCHER_UNDERPERFORMANCE: 0.2,

  // High divergence threshold
  HIGH_DIVERGENCE: 0.5,

  // Confidence threshold for suggestions
  HIGH_CONFIDENCE: 0.8,
  MEDIUM_CONFIDENCE: 0.5,
  LOW_CONFIDENCE: 0.3,
} as const;

// ============================================================================
// Copy/Open Conversion Thresholds
// ============================================================================

export const CONVERSION_THRESHOLDS = {
  // Good copy success rate
  GOOD_COPY_SUCCESS_RATE: 0.9,

  // Acceptable copy success rate
  ACCEPTABLE_COPY_SUCCESS_RATE: 0.7,

  // Poor copy success rate (needs investigation)
  POOR_COPY_SUCCESS_RATE: 0.5,

  // Good open Shopee click rate
  GOOD_OPEN_RATE: 0.3,

  // Minimum open rate to consider useful
  MIN_OPEN_RATE: 0.1,

  // High copy failure rate (needs investigation)
  HIGH_COPY_FAILURE_RATE: 0.3,
} as const;

// ============================================================================
// No-Match Escalation Thresholds
// ============================================================================

export const NO_MATCH_THRESHOLDS = {
  // No-match rate threshold for escalation
  ESCALATION_RATE: 0.15,

  // High no-match rate
  HIGH_RATE: 0.2,

  // Medium no-match rate
  MEDIUM_RATE: 0.1,

  // Minimum no-match occurrences for pattern detection
  MIN_OCCURRENCES: 5,

  // Fallback click rate threshold
  FALLBACK_CLICK_RATE: 0.5,
} as const;

// ============================================================================
// Best-vs-Candidate Divergence Thresholds
// ============================================================================

export const DIVERGENCE_THRESHOLDS = {
  // Significant divergence (investigate)
  SIGNIFICANT: 0.3,

  // Major divergence (action required)
  MAJOR: 0.5,

  // Complete divergence (best never selected)
  COMPLETE: 0.8,
} as const;

// ============================================================================
// Insight Severity Thresholds
// ============================================================================

export const SEVERITY_THRESHOLDS = {
  // Critical: immediate action required
  CRITICAL_COPY_FAILURE_RATE: 0.5,
  CRITICAL_NO_MATCH_RATE: 0.3,
  CRITICAL_DIVERGENCE: 0.7,

  // High: should be addressed soon
  HIGH_COPY_FAILURE_RATE: 0.3,
  HIGH_NO_MATCH_RATE: 0.2,
  HIGH_DIVERGENCE: 0.5,

  // Medium: worth investigating
  MEDIUM_COPY_FAILURE_RATE: 0.2,
  MEDIUM_NO_MATCH_RATE: 0.1,
  MEDIUM_DIVERGENCE: 0.3,

  // Low: minor improvement
  LOW_COPY_FAILURE_RATE: 0.1,
  LOW_NO_MATCH_RATE: 0.05,
  LOW_DIVERGENCE: 0.15,
} as const;

// ============================================================================
// Snapshot Retention
// ============================================================================

export const SNAPSHOT_RETENTION = {
  // Keep detailed snapshots for 90 days
  DETAILED_DAYS: 90,

  // Keep summary data for 1 year
  SUMMARY_DAYS: 365,

  // Keep raw events for 30 days
  RAW_EVENTS_DAYS: 30,
} as const;

// ============================================================================
// Event Type Priorities (for weighting)
// ============================================================================

export const EVENT_TYPE_WEIGHTS: Record<VoucherOutcomeEventType, number> = {
  [VoucherOutcomeEventType.RESOLUTION_VIEWED]: 0.1,
  [VoucherOutcomeEventType.BEST_VOUCHER_VIEWED]: 0.15,
  [VoucherOutcomeEventType.CANDIDATE_VIEWED]: 0.1,
  [VoucherOutcomeEventType.VOUCHER_COPIED]: 1.0,
  [VoucherOutcomeEventType.VOUCHER_COPY_FAILED]: 0.8,
  [VoucherOutcomeEventType.OPEN_SHOPEE_CLICKED]: 0.5,
  [VoucherOutcomeEventType.NO_MATCH_VIEWED]: 0.2,
  [VoucherOutcomeEventType.FALLBACK_CLICKED]: 0.3,
  [VoucherOutcomeEventType.EXACT_MATCH_CONFIRMED]: 1.5,
} as const;

// ============================================================================
// Platform Configuration
// ============================================================================

export const PLATFORM_CONFIG: Record<Platform, {
  name: string;
  supported: boolean;
  defaultConfidenceWeight: number;
}> = {
  [Platform.SHOPEE]: {
    name: 'Shopee',
    supported: true,
    defaultConfidenceWeight: 1.0,
  },
  [Platform.TIKTOK]: {
    name: 'TikTok Shop',
    supported: true,
    defaultConfidenceWeight: 0.8,
  },
  [Platform.LAZADA]: {
    name: 'Lazada',
    supported: true,
    defaultConfidenceWeight: 0.8,
  },
} as const;

// ============================================================================
// No-Match Root Cause Configuration
// ============================================================================

export const NO_MATCH_ROOT_CAUSE_CONFIG: Record<NoMatchRootCause, {
  description: string;
  autoDetectable: boolean;
  requiresReview: boolean;
}> = {
  [NoMatchRootCause.INVALID_URL]: {
    description: 'URL format is invalid or not recognized',
    autoDetectable: true,
    requiresReview: false,
  },
  [NoMatchRootCause.PARSER_WEAKNESS]: {
    description: 'Parser failed to extract product information',
    autoDetectable: true,
    requiresReview: true,
  },
  [NoMatchRootCause.CONTEXT_WEAKNESS]: {
    description: 'Insufficient product context for matching',
    autoDetectable: true,
    requiresReview: true,
  },
  [NoMatchRootCause.CATALOG_COVERAGE]: {
    description: 'No vouchers available for this product/category',
    autoDetectable: true,
    requiresReview: true,
  },
  [NoMatchRootCause.RULE_TOO_STRICT]: {
    description: 'Voucher rules are too restrictive',
    autoDetectable: false,
    requiresReview: true,
  },
  [NoMatchRootCause.RANKING_FALLBACK_POOR]: {
    description: 'Fallback ranking not helpful for user',
    autoDetectable: true,
    requiresReview: true,
  },
  [NoMatchRootCause.UNKNOWN]: {
    description: 'Root cause could not be determined',
    autoDetectable: false,
    requiresReview: true,
  },
} as const;

// ============================================================================
// Insight Type Configuration
// ============================================================================

export const INSIGHT_TYPE_CONFIG: Record<string, {
  description: string;
  defaultSeverity: VoucherOptimizationSeverity;
  autoGeneratable: boolean;
}> = {
  'best_voucher_underperformance': {
    description: 'Best voucher is not being selected by users',
    defaultSeverity: VoucherOptimizationSeverity.HIGH,
    autoGeneratable: true,
  },
  'candidate_outperforming_best': {
    description: 'Candidate vouchers outperform the best voucher',
    defaultSeverity: VoucherOptimizationSeverity.HIGH,
    autoGeneratable: true,
  },
  'no_match_coverage_gap': {
    description: 'No-match due to catalog coverage issues',
    defaultSeverity: VoucherOptimizationSeverity.MEDIUM,
    autoGeneratable: true,
  },
  'ranking_divergence': {
    description: 'Large gap between ranked positions',
    defaultSeverity: VoucherOptimizationSeverity.MEDIUM,
    autoGeneratable: true,
  },
  'copy_failure_pattern': {
    description: 'High copy failure rate detected',
    defaultSeverity: VoucherOptimizationSeverity.CRITICAL,
    autoGeneratable: true,
  },
  'low_confidence_resolution': {
    description: 'Resolutions with consistently low confidence',
    defaultSeverity: VoucherOptimizationSeverity.MEDIUM,
    autoGeneratable: true,
  },
  'explanation_weakness': {
    description: 'User explanations not helping conversion',
    defaultSeverity: VoucherOptimizationSeverity.LOW,
    autoGeneratable: false,
  },
  'fallback_handling': {
    description: 'Fallback options need improvement',
    defaultSeverity: VoucherOptimizationSeverity.MEDIUM,
    autoGeneratable: true,
  },
} as const;

// ============================================================================
// Analysis Configuration
// ============================================================================

export const ANALYSIS_CONFIG = {
  // Run frequency
  DEFAULT_ANALYSIS_INTERVAL_HOURS: 6,

  // Batch size for processing
  BATCH_SIZE: 1000,

  // Maximum insights to generate per run
  MAX_INSIGHTS_PER_RUN: 50,

  // Minimum priority score for auto-escalation
  AUTO_ESCALATE_PRIORITY: 0.8,

  // Enable/disable features
  ENABLE_BEHAVIOR_PATTERNS: true,
  ENABLE_AUTOMATED_INSIGHTS: true,
  ENABLE_NO_MATCH_ANALYSIS: true,
  ENABLE_EXPLAINABILITY: true,
} as const;

// ============================================================================
// Quality Scoring
// ============================================================================

export const QUALITY_SCORING = {
  // Weight factors for outcome quality
  COPY_SUCCESS_WEIGHT: 0.4,
  OPEN_CLICK_WEIGHT: 0.2,
  BEST_SELECTION_WEIGHT: 0.3,
  NO_FALLBACK_NEEDED_WEIGHT: 0.1,

  // Minimum quality score for "good"
  GOOD_QUALITY_THRESHOLD: 0.7,

  // Quality score for "needs improvement"
  NEEDS_IMPROVEMENT_THRESHOLD: 0.4,
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  INVALID_EVENT_TYPE: 'Invalid event type',
  INVALID_OUTCOME_ID: 'Invalid outcome ID',
  INVALID_PLATFORM: 'Invalid platform',
  AGGREGATION_FAILED: 'Failed to aggregate signals',
  ANALYSIS_FAILED: 'Failed to run analysis',
  INSIGHT_GENERATION_FAILED: 'Failed to generate insights',
  NO_DATA_IN_WINDOW: 'No data in specified time window',
  INSUFFICIENT_SAMPLE_SIZE: 'Insufficient sample size for analysis',
  INVALID_TIME_WINDOW: 'Invalid time window specified',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const SUCCESS_MESSAGES = {
  EVENT_RECORDED: 'Event recorded successfully',
  OUTCOME_SAVED: 'Outcome saved successfully',
  ANALYSIS_COMPLETE: 'Analysis completed successfully',
  INSIGHTS_GENERATED: 'Insights generated successfully',
  REPORT_GENERATED: 'Report generated successfully',
} as const;

// ============================================================================
// Configuration Export
// ============================================================================

export const VOUCHER_INTELLIGENCE_CONFIG = {
  // Feature flags
  ENABLE_INTELLIGENCE_LOOP: true,
  ENABLE_AUTOMATED_OPTIMIZATION: false, // Disabled - requires manual review
  ENABLE_REAL_TIME_ANALYSIS: false, // Disabled - batch only for now

  // Preview mode
  PREVIEW_MODE: process.env.NODE_ENV === 'development',

  // Database
  TABLE_PREFIX: 'voucher_',

  // Attribution
  ENABLE_GROWTH_ATTRIBUTION: true,

  // Analysis
  DEFAULT_ANALYSIS_WINDOW_HOURS: INTELLIGENCE_WINDOWS.SHORT_HOURS,
  MAX_ANALYSIS_WINDOW_DAYS: INTELLIGENCE_WINDOWS.LONG_DAYS,
} as const;
