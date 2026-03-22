/**
 * Platform Production Enablement Constants
 *
 * Production-grade constants for candidate review and enablement decisions.
 * No magic numbers in business logic.
 */

// =============================================================================
// Score Thresholds
// =============================================================================

export const SCORE_THRESHOLDS = {
  // Overall readiness thresholds
  PRODUCTION_CANDIDATE_MIN: 75,
  PROCEED_CAUTIOUSLY_MIN: 55,
  HOLD_THRESHOLD: 40,
  NOT_READY_MAX: 39,

  // Dimension-specific thresholds
  DOMAIN_MATURITY_MIN: 70,
  DATA_FOUNDATIONAL_MIN: 65,
  ACQUISITION_STABILITY_MIN: 60,
  SANBOX_QUALITY_MIN: 60,
  PREVIEW_USEFULNESS_MIN: 65,
  PREVIEW_STABILITY_MIN: 65,
  COMMERCIAL_READINESS_MIN: 60,
  GOVERNANCE_SAFETY_MIN: 80,
  REMEDIATION_LOAD_MAX: 50,
  OPERATOR_READINESS_MIN: 60,

  // Confidence thresholds
  EVIDENCE_CONFIDENCE_MIN: 0.6,
  DATA_COMPLETENESS_MIN: 0.7,
  SOURCE_RELIABILITY_MIN: 0.75,

  // Warning thresholds
  HIGH_WARNING_THRESHOLD: 3,
  MEDIUM_WARNING_THRESHOLD: 5,

  // Blocker thresholds
  CRITICAL_BLOCKER_BLOCK: true,
  HIGH_BLOCKER_BLOCK: true,
  MAX_CRITICAL_BLOCKERS: 0,
  MAX_HIGH_BLOCKERS: 2,
} as const;

// =============================================================================
// Dimension Weights
// =============================================================================

export const DIMENSION_WEIGHTS = {
  DOMAIN_MATURITY: 0.10,
  DATA_FOUNDATIONAL: 0.15,
  ACQUISITION_STABILITY: 0.15,
  SANDBOX_QUALITY: 0.10,
  PREVIEW_USEFULNESS: 0.12,
  PREVIEW_STABILITY: 0.10,
  COMMERCIAL_READINESS: 0.10,
  GOVERNANCE_SAFETY: 0.10,
  REMEDIATION_LOAD: 0.05,
  OPERATOR_READINESS: 0.03,
} as const;

// =============================================================================
// Condition Severity Thresholds
// =============================================================================

export const CONDITION_SEVERITY_THRESHOLDS = {
  CRITICAL: {
    MAX_ALLOWED: 0,
    AUTO_SATISFY_SCORE: 90,
    EXPIRY_DAYS: 30,
  },
  HIGH: {
    MAX_ALLOWED: 2,
    AUTO_SATISFY_SCORE: 85,
    EXPIRY_DAYS: 45,
  },
  MEDIUM: {
    MAX_ALLOWED: 5,
    AUTO_SATISFY_SCORE: 75,
    EXPIRY_DAYS: 60,
  },
  LOW: {
    MAX_ALLOWED: 10,
    AUTO_SATISFY_SCORE: 65,
    EXPIRY_DAYS: 90,
  },
} as const;

// =============================================================================
// Decision Thresholds
// =============================================================================

export const DECISION_THRESHOLDS = {
  // Production candidate decision
  PRODUCTION_CANDIDATE: {
    MIN_OVERALL_SCORE: 75,
    MIN_CRITICAL_BLOCKERS: 0,
    MIN_HIGH_BLOCKERS: 0,
    MAX_HIGH_BLOCKERS: 1,
    MIN_GOVERNANCE_SCORE: 80,
    MIN_PREVIEW_STABILITY: 65,
    MIN_PREVIEW_USEFULNESS: 65,
  },

  // Proceed cautiously decision
  PROCEED_CAUTIOUSLY: {
    MIN_OVERALL_SCORE: 55,
    MIN_CRITICAL_BLOCKERS: 0,
    MAX_HIGH_BLOCKERS: 3,
    MAX_CONDITIONS: 5,
    REQUIRED_CONDITIONS: ['governance_approval', 'monitoring_enabled'],
  },

  // Hold decision
  HOLD: {
    MAX_OVERALL_SCORE: 54,
    MIN_CRITICAL_BLOCKERS: 1,
    OR_MAX_HIGH_BLOCKERS: 4,
  },

  // Not ready decision
  NOT_READY: {
    MAX_OVERALL_SCORE: 39,
    OR_MIN_CRITICAL_BLOCKERS: 2,
    OR_GOVERNANCE_NOT_APPROVED: true,
  },

  // Rollback decision
  ROLLBACK: {
    CRITICAL_BLOCKER_THRESHOLD: 3,
    STABILITY_SCORE_MAX: 40,
    USEFULNESS_SCORE_MAX: 40,
    INCIDENT_THRESHOLD: 5,
  },
} as const;

// =============================================================================
// Review Windows & Staleness
// =============================================================================

export const REVIEW_WINDOWS = {
  // How often to run reviews automatically
  AUTO_REVIEW_INTERVAL_DAYS: 7,

  // When to flag evidence as stale
  EVIDENCE_STALE_DAYS: 14,
  EVIDENCE_CRITICAL_STALE_DAYS: 30,

  // When to require re-review after decision
  RE_REVIEW_AFTER_DECISION_DAYS: 30,
  RE_REVIEW_AFTER_CONDITION_CHANGE_DAYS: 14,

  // Condition expiry
  CONDITION_DEFAULT_EXPIRY_DAYS: 45,
  CONDITION_CRITICAL_EXPIRY_DAYS: 30,
  CONDITION_HIGH_EXPIRY_DAYS: 45,
  CONDITION_MEDIUM_EXPIRY_DAYS: 60,
  CONDITION_LOW_EXPIRY_DAYS: 90,

  // Decision expiry
  DECISION_DEFAULT_EXPIRY_DAYS: 90,
  DECISION_PRODUCTION_CANDIDATE_EXPIRY_DAYS: 60,
} as const;

// =============================================================================
// Platform Keys
// =============================================================================

export const PLATFORM_KEYS = {
  SHOPEE: 'shopee',
  TIKTOK_SHOP: 'tiktok_shop',
} as const;

// =============================================================================
// Stage Transitions
// =============================================================================

export const VALID_STAGE_TRANSITIONS: Record<string, string[]> = {
  disabled: ['internal_only'],
  internal_only: ['sandbox_preview'],
  sandbox_preview: ['limited_public_preview'],
  limited_public_preview: ['production_candidate', 'sandbox_preview'],
  production_candidate: ['production_enabled', 'limited_public_preview'],
  production_enabled: ['production_candidate', 'limited_public_preview'],
} as const;

// =============================================================================
// Evidence Source Keys
// =============================================================================

export const EVIDENCE_SOURCES = {
  DOMAIN: 'domain',
  DATA_FOUNDATION: 'data_foundation',
  ACQUISITION: 'acquisition',
  PREVIEW: 'preview',
  COMMERCIAL: 'commercial',
  GOVERNANCE: 'governance',
  REMEDIATION: 'remediation',
  OPERATOR: 'operator',
  TIKTOK_PREVIEW: 'tiktok_preview_intelligence',
  TIKTOK_COMMERCIAL: 'tiktok_commercial_readiness',
  TIKTOK_GOVERNANCE: 'tiktok_governance',
} as const;

// =============================================================================
// Category Labels
// =============================================================================

export const CATEGORY_LABELS = {
  DOMAIN: 'Domain & Platform Knowledge',
  DATA: 'Data Foundation',
  ACQUISITION: 'Acquisition & Runtime',
  RESOLUTION: 'Resolution Quality',
  PREVIEW: 'Preview & Beta',
  COMMERCIAL: 'Commercial & Monetization',
  GOVERNANCE: 'Governance & Compliance',
  OPERATIONS: 'Operations & Support',
  REMEDIATION: 'Remediation & Technical Debt',
} as const;

// =============================================================================
// Severity Order (for sorting)
// =============================================================================

export const SEVERITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
} as const;

// =============================================================================
// Decision Labels
// =============================================================================

export const DECISION_LABELS: Record<string, string> = {
  not_ready: 'Not Ready',
  hold: 'Hold',
  proceed_cautiously: 'Proceed Cautiously',
  mark_production_candidate: 'Mark Production Candidate',
  mark_production_candidate_with_conditions: 'Mark with Conditions',
  rollback_to_preview_only: 'Rollback to Preview Only',
} as const;

// =============================================================================
// Default Evidence Values
// =============================================================================

export const DEFAULT_EVIDENCE_SCORES = {
  UNKNOWN: null,
  VERY_LOW: 20,
  LOW: 40,
  MEDIUM: 55,
  HIGH: 70,
  VERY_HIGH: 85,
} as const;

// =============================================================================
// Metrics Names
// =============================================================================

export const METRICS_NAMES = {
  REVIEW_COUNT: 'platform_enablement_review_count',
  DECISION_COUNT: 'platform_enablement_decision_count',
  NOT_READY_COUNT: 'platform_enablement_not_ready_count',
  HOLD_COUNT: 'platform_enablement_hold_count',
  PROCEED_CAUTIOUSLY_COUNT: 'platform_enablement_proceed_cautiously_count',
  PRODUCTION_CANDIDATE_COUNT: 'platform_enablement_production_candidate_count',
  BLOCKER_COUNT: 'platform_enablement_blocker_count',
  CONDITION_COUNT: 'platform_enablement_condition_count',
  ROLLBACK_COUNT: 'platform_enablement_rollback_count',
  DECISION_LATENCY_MS: 'platform_enablement_decision_latency_ms',
} as const;
