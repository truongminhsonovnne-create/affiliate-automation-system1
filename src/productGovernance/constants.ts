/**
 * Product Governance Constants
 *
 * Centralized configuration for governance, release readiness, and continuous improvement.
 */

// ============================================================================
// Readiness Score Thresholds
// ============================================================================

export const READINESS_SCORE_CONFIG = {
  // Score ranges (0-100)
  EXCELLENT_THRESHOLD: 90,
  GOOD_THRESHOLD: 75,
  ACCEPTABLE_THRESHOLD: 60,
  POOR_THRESHOLD: 40,

  // Blocking thresholds
  BLOCKING_CRITICAL_MAX: 0,
  BLOCKING_HIGH_MAX: 0,
  BLOCKING_SCORE_THRESHOLD: 50,

  // Warning thresholds
  WARNING_CRITICAL_MAX: 2,
  WARNING_HIGH_MAX: 5,
  WARNING_SCORE_THRESHOLD: 70,

  // Component weights for score calculation
  COMPONENT_WEIGHTS: {
    productQuality: 0.30,
    experiments: 0.20,
    operations: 0.25,
    qaVerification: 0.15,
    releaseReadiness: 0.10,
  },
} as const;

// ============================================================================
// Blocking vs Warning Logic
// ============================================================================

export const BLOCKING_RULES = {
  // Critical severity signals always block
  ALWAYS_BLOCK: [
    'critical_product_ops_case',
    'critical_experiment_guardrail',
    'critical_qa_regression',
    'critical_operational_issue',
    'critical_staging_failure',
  ],

  // High severity thresholds
  HIGH_SEVERITY_MAX_OPEN: 0,

  // These always require conditional approval even if no blocking issues
  REQUIRE_CONDITIONAL_APPROVAL: [
    'any_staging_failure',
    'any_operational_degradation',
    'active_guardrail_breach',
  ],
} as const;

export const WARNING_RULES = {
  // Warning thresholds (these don't block but should be tracked)
  CRITICAL_WARNING_MAX: 2,
  HIGH_WARNING_MAX: 5,
  MEDIUM_WARNING_MAX: 10,

  // Warning severity types
  WARN_ON: [
    'medium_product_ops_case',
    'medium_experiment_guardrail',
    'medium_qa_regression',
    'low_operational_issue',
  ],
} as const;

// ============================================================================
// Signal Severity Mappings
// ============================================================================

export const SIGNAL_SEVERITY_MAPPINGS: Record<string, ProductGovernanceSeverityConfig> = {
  // Product Ops cases
  product_ops_case: {
    critical: ['critical'],
    high: ['high'],
    medium: ['medium'],
    low: ['low'],
  },

  // Experiment guardrails
  experiment_guardrail: {
    critical: ['guardrail_breach_critical'],
    high: ['guardrail_breach_high'],
    medium: ['guardrail_breach_medium'],
    low: ['guardrail_breach_low'],
  },

  // No-match spikes
  no_match_spike: {
    critical: { threshold: 50, percentageChange: 200 },
    high: { threshold: 30, percentageChange: 100 },
    medium: { threshold: 20, percentageChange: 50 },
    low: { threshold: 10, percentageChange: 25 },
  },

  // QA regressions
  qa_regression: {
    critical: { failureRate: 20 },
    high: { failureRate: 10 },
    medium: { failureRate: 5 },
    low: { failureRate: 1 },
  },

  // Operational issues
  operational_issue: {
    critical: { errorRate: 5, latencyP99: 2000 },
    high: { errorRate: 2, latencyP99: 1000 },
    medium: { errorRate: 1, latencyP99: 500 },
    low: { errorRate: 0.5, latencyP99: 300 },
  },

  // Staging failures
  staging_failure: {
    critical: { testFailureRate: 50 },
    high: { testFailureRate: 25 },
    medium: { testFailureRate: 10 },
    low: { testFailureRate: 5 },
  },
} as const;

interface ProductGovernanceSeverityConfig {
  [key: string]: string[] | Record<string, number>;
}

// ============================================================================
// Follow-up Configuration
// ============================================================================

export const FOLLOWUP_CONFIG = {
  // Stale thresholds (in days)
  STALE_THRESHOLD_DAYS: 7,
  OVERDUE_THRESHOLD_DAYS: 3,

  // Default due periods (in days)
  DEFAULT_MITIGATION_DUE_DAYS: 7,
  DEFAULT_INVESTIGATION_DUE_DAYS: 14,
  DEFAULT_VERIFICATION_DUE_DAYS: 3,
  DEFAULT_MONITORING_DUE_DAYS: 7,

  // Priority ordering
  PRIORITY_ORDER: [
    ProductGovernanceFollowupType.ROLLBACK_REVIEW,
    ProductGovernanceFollowupType.MITIGATION,
    ProductGovernanceFollowupType.QUALITY_INVESTIGATION,
    ProductGovernanceFollowupType.REMEDIATION_VERIFICATION,
    ProductGovernanceFollowupType.EXPERIMENT_MONITORING,
    ProductGovernanceFollowupType.TUNING_ADJUSTMENT,
    ProductGovernanceFollowupType.DOCUMENTATION_UPDATE,
    ProductGovernanceFollowupType.STAKEHOLDER_NOTIFICATION,
  ],
} as const;

// ============================================================================
// Cadence Configuration
// ============================================================================

export const CADENCE_CONFIG = {
  // Weekly quality cadence
  WEEKLY_QUALITY: {
    dayOfWeek: 5, // Friday
    hour: 14, // 2 PM
    timezone: 'UTC',
  },

  // Post-release review
  POST_RELEASE: {
    hoursAfterRelease: 24,
  },

  // Monthly governance
  MONTHLY_GOVERNANCE: {
    dayOfMonth: 1,
    hour: 10, // 10 AM
    timezone: 'UTC',
  },

  // Stale detection
  STALE_CADENCE_DAYS: 14,
} as const;

// ============================================================================
// Release Gating Thresholds
// ============================================================================

export const RELEASE_GATE_CONFIG = {
  // Minimum readiness score for auto-approval (not used - always requires human)
  MIN_SCORE_FOR_APPROVAL: 80,

  // Blocking issue thresholds
  BLOCKING_ISSUE_THRESHOLDS: {
    critical: 0,
    high: 0,
    medium: 2,
    low: 5,
  },

  // Warning issue thresholds
  WARNING_ISSUE_THRESHOLDS: {
    critical: 2,
    high: 5,
    medium: 10,
    low: 20,
  },

  // Experiment thresholds
  EXPERIMENT_THRESHOLDS: {
    maxActiveGuardrailBreaches: 0,
    maxUnsafeTuningChanges: 0,
  },

  // Operational thresholds
  OPERATIONAL_THRESHOLDS: {
    maxErrorRateAnomaly: 0,
    maxLatencyDegradation: 0,
    maxRankingQualityIssues: 0,
  },

  // QA thresholds
  QA_THRESHOLDS: {
    maxStagingFailures: 0,
    maxRegressionIssues: 0,
    maxVerificationGaps: 0,
  },
} as const;

// ============================================================================
// Post-Release Review Thresholds
// ============================================================================

export const POST_RELEASE_CONFIG = {
  // Review window after release
  REVIEW_WINDOW_HOURS: 24,
  FOLLOW_UP_WINDOW_DAYS: 7,

  // Health check intervals
  HEALTH_CHECK_INTERVAL_HOURS: 4,

  // Escalation thresholds
  ESCALATE_AFTER_HOURS: 48,
} as const;

// ============================================================================
// Decision Validation Rules
// ============================================================================

export const DECISION_VALIDATION_CONFIG = {
  // Required rationale for certain decisions
  RATIONALE_REQUIRED_FOR: [
    ProductGovernanceDecisionType.RELEASE_BLOCKED,
    ProductGovernanceDecisionType.RELEASE_CONDITIONALLY_APPROVED,
    ProductGovernanceDecisionType.ROLLBACK_RECOMMENDED,
  ],

  // Minimum rationale length
  MIN_RATIONALE_LENGTH: 20,

  // State transitions allowed
  ALLOWED_STATUS_TRANSITIONS: {
    [ReleaseReadinessStatus.PENDING]: [
      ReleaseReadinessStatus.IN_PROGRESS,
      ReleaseReadinessStatus.NEEDS_REVIEW,
    ],
    [ReleaseReadinessStatus.IN_PROGRESS]: [
      ReleaseReadinessStatus.READY,
      ReleaseReadinessStatus.CONDITIONALLY_READY,
      ReleaseReadinessStatus.BLOCKED,
      ReleaseReadinessStatus.NEEDS_REVIEW,
      ReleaseReadinessStatus.ROLLBACK_RECOMMENDED,
    ],
    [ReleaseReadinessStatus.NEEDS_REVIEW]: [
      ReleaseReadinessStatus.IN_PROGRESS,
    ],
    [ReleaseReadinessStatus.READY]: [
      ReleaseReadinessStatus.FINALIZED,
      ReleaseReadinessStatus.BLOCKED,
    ],
    [ReleaseReadinessStatus.CONDITIONALLY_READY]: [
      ReleaseReadinessStatus.FINALIZED,
      ReleaseReadinessStatus.BLOCKED,
    ],
    [ReleaseReadinessStatus.BLOCKED]: [
      ReleaseReadinessStatus.IN_PROGRESS,
      ReleaseReadinessStatus.CONDITIONALLY_READY,
    ],
    [ReleaseReadinessStatus.ROLLBACK_RECOMMENDED]: [
      ReleaseReadinessStatus.FINALIZED,
      ReleaseReadinessStatus.BLOCKED,
    ],
  },
} as const;

// ============================================================================
// Import types for config usage
// ============================================================================

import { ProductGovernanceDecisionType, ProductGovernanceFollowupType, ReleaseReadinessStatus } from './types';
