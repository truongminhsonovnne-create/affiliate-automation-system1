/**
 * TikTok Shop Preview Intelligence Constants
 *
 * Default values and thresholds for preview intelligence,
 * commercial readiness, and monetization governance.
 */

// ============================================================
// Preview Session Configuration
// ============================================================

export const PREVIEW_SESSION_CONFIG = {
  /** Session window duration in milliseconds (30 minutes) */
  SESSION_WINDOW_MS: 30 * 60 * 1000,

  /** Maximum session inactivity before expiration (1 hour) */
  SESSION_EXPIRY_MS: 60 * 60 * 1000,

  /** Maximum sessions per anonymous subject */
  MAX_SESSIONS_PER_SUBJECT: 1000,
} as const;

// ============================================================
// Preview Funnel Thresholds
// ============================================================

export const PREVIEW_FUNNEL_THRESHOLDS = {
  /** Minimum surface views to consider for analysis */
  MIN_SURFACE_VIEWS_FOR_ANALYSIS: 10,

  /** Maximum acceptable drop-off rate from surface to submission */
  MAX_DROPOFF_RATE: 0.8,

  /** Minimum resolution attempt rate */
  MIN_RESOLUTION_ATTEMPT_RATE: 0.1,

  /** Maximum acceptable unsupported outcome rate */
  MAX_UNSUPPORTED_RATE: 0.5,

  /** Minimum supported resolution rate */
  MIN_SUPPORTED_RATE: 0.2,

  /** Maximum acceptable gate block rate */
  MAX_GATE_BLOCK_RATE: 0.3,
} as const;

// ============================================================
// Usefulness Thresholds
// ============================================================

export const PREVIEW_USEFULNESS_THRESHOLDS = {
  /** Minimum score for "useful" classification */
  MIN_USEFUL_SCORE: 60,

  /** Score for "needs improvement" */
  NEEDS_IMPROVEMENT_SCORE: 40,

  /** Score for "poor" */
  POOR_SCORE: 20,

  /** Minimum clarity score */
  MIN_CLARITY_SCORE: 50,

  /** Minimum honest representation score */
  MIN_HONEST_REPRESENTATION_SCORE: 70,

  /** Minimum outcome quality score */
  MIN_OUTCOME_QUALITY_SCORE: 40,

  /** Minimum user actionability score */
  MIN_USER_ACTIONABILITY_SCORE: 40,
} as const;

// ============================================================
// Stability Thresholds
// ============================================================

export const PREVIEW_STABILITY_THRESHOLDS = {
  /** Minimum stability score for "stable" */
  MIN_STABLE_SCORE: 70,

  /** Score for "unstable" */
  UNSTABLE_SCORE: 40,

  /** Minimum support state stability (percentage of consistent states) */
  MIN_SUPPORT_STATE_STABILITY: 0.75,

  /** Maximum acceptable error rate */
  MAX_ERROR_RATE: 0.15,

  /** Minimum outcome consistency */
  MIN_OUTCOME_CONSISTENCY: 0.6,

  /** Maximum drift risk threshold */
  MAX_DRIFT_RISK: 0.4,
} as const;

// ============================================================
// Commercial Readiness Thresholds
// ============================================================

export const COMMERCIAL_READINESS_THRESHOLDS = {
  /** Minimum score for proceed_cautiously */
  PROCEED_CAUTIOUSLY_SCORE: 50,

  /** Minimum score for ready_for_preview_monetization */
  PREVIEW_MONETIZATION_SCORE: 65,

  /** Minimum score for ready_for_production */
  PRODUCTION_MONETIZATION_SCORE: 80,

  /** Maximum blockers for proceed */
  MAX_BLOCKERS: 0,

  /** Maximum warnings for clean proceed */
  MAX_WARNINGS_FOR_CLEAN: 2,

  /** Minimum click lineage completeness */
  MIN_LINEAGE_COMPLETENESS: 0.6,

  /** Minimum product context completeness */
  MIN_PRODUCT_CONTEXT_COMPLETENESS: 0.5,

  /** Minimum governance readiness score */
  MIN_GOVERNANCE_READINESS: 60,
} as const;

// ============================================================
// Monetization Governance Thresholds
// ============================================================

export const MONETIZATION_GUARDRAIL_THRESHOLDS = {
  /** Minimum quality score to allow any monetization */
  MIN_QUALITY_FOR_MONETIZATION: 50,

  /** Maximum unsupported rate for monetization */
  MAX_UNSUPPORTED_FOR_MONETIZATION: 0.3,

  /** Minimum usefulness score for monetization */
  MIN_USEFULNESS_FOR_MONETIZATION: 50,

  /** Minimum stability score for monetization */
  MIN_STABILITY_FOR_MONETIZATION: 60,

  /** Minimum lineage confidence for monetization */
  MIN_LINEAGE_CONFIDENCE: 0.5,

  /** Minimum governance score for monetization */
  MIN_GOVERNANCE_SCORE: 60,
} as const;

// ============================================================
// Attribution Confidence Thresholds
// ============================================================

export const ATTRIBUTION_CONFIDENCE_THRESHOLDS = {
  /** Minimum confidence for "high" classification */
  HIGH_CONFIDENCE: 0.8,

  /** Minimum confidence for "medium" classification */
  MEDIUM_CONFIDENCE: 0.5,

  /** Minimum confidence for "low" classification */
  LOW_CONFIDENCE: 0.3,

  /** Minimum click volume for confidence assessment */
  MIN_CLICK_VOLUME: 100,

  /** Minimum conversion volume for confidence assessment */
  MIN_CONVERSION_VOLUME: 10,
} as const;

// ============================================================
// Blockers & Warnings Configuration
// ============================================================

export const BLOCKER_WARNING_CONFIG = {
  /** Critical severity threshold */
  CRITICAL_SEVERITY: 'critical',

  /** High severity threshold */
  HIGH_SEVERITY: 'high',

  /** Medium severity threshold */
  MEDIUM_SEVERITY: 'medium',

  /** Low severity threshold */
  LOW_SEVERITY: 'low',

  /** Categories that are blockers */
  BLOCKER_CATEGORIES: [
    'data_gap',
    'quality_issue',
    'governance_gap',
    'security',
    'compliance',
  ],

  /** Categories that are warnings */
  WARNING_CATEGORIES: [
    'context_gap',
    'stability_issue',
    'lineage_gap',
    'ops_gap',
  ],
} as const;

// ============================================================
// Preview Stages
// ============================================================

export const PREVIEW_STAGES = {
  SANDBOX: 'sandbox_preview',
  LIMITED_PUBLIC: 'limited_public_preview',
  PRODUCTION_CANDIDATE: 'production_candidate',
} as const;

// ============================================================
// Monetization Stages
// ============================================================

export const MONETIZATION_STAGES = {
  DISABLED: 'disabled',
  INTERNAL_VALIDATION_ONLY: 'internal_validation_only',
  PREVIEW_SIGNAL_COLLECTION: 'preview_signal_collection',
  LIMITED_MONETIZATION_PREVIEW: 'limited_monetization_preview',
  PRODUCTION_CANDIDATE: 'production_candidate',
  PRODUCTION_ENABLED: 'production_enabled',
} as const;

// ============================================================
// Support States
// ============================================================

export const PREVIEW_SUPPORT_STATES = {
  UNSUPPORTED: 'unsupported',
  NOT_READY: 'not_ready',
  SANDBOX_ONLY: 'sandbox_only',
  GATED: 'gated',
  PARTIALLY_SUPPORTED: 'partially_supported',
  SUPPORTED: 'supported',
  PRODUCTION_ENABLED: 'production_enabled',
} as const;

// ============================================================
// Event Types
// ============================================================

export const PREVIEW_EVENT_TYPES = {
  SURFACE_VIEWED: 'preview_surface_viewed',
  INPUT_SUBMITTED: 'preview_input_submitted',
  RESOLUTION_ATTEMPTED: 'preview_resolution_attempted',
  RESOLUTION_SUPPORTED: 'preview_resolution_supported',
  RESOLUTION_PARTIAL: 'preview_resolution_partial',
  RESOLUTION_UNAVAILABLE: 'preview_resolution_unavailable',
  CANDIDATE_VIEWED: 'preview_candidate_viewed',
  COPY_ATTEMPTED: 'preview_copy_attempted',
  OPEN_ATTEMPTED: 'preview_open_attempted',
  BLOCKED_BY_GATE: 'preview_blocked_by_gate',
  ABANDONED: 'preview_abandoned',
  ERROR: 'preview_error',
} as const;

// ============================================================
// Review Configuration
// ============================================================

export const REVIEW_CONFIG = {
  /** Default review period in days */
  DEFAULT_REVIEW_PERIOD_DAYS: 7,

  /** Minimum events for quality review */
  MIN_EVENTS_FOR_QUALITY_REVIEW: 50,

  /** Minimum sessions for stability review */
  MIN_SESSIONS_FOR_STABILITY_REVIEW: 20,

  /** Maximum age of data for review (days) */
  MAX_DATA_AGE_DAYS: 30,
} as const;

// ============================================================
// Funnel Aggregation Windows
// ============================================================

export const FUNNEL_AGGREGATION_WINDOWS = {
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
} as const;

// ============================================================
// Backlog Configuration
// ============================================================

export const BACKLOG_CONFIG = {
  /** Default priority for new items */
  DEFAULT_PRIORITY: 'medium' as const,

  /** Critical priorities */
  CRITICAL_PRIORITIES: ['critical', 'high'] as const,

  /** Auto-close resolved items after days */
  AUTO_CLOSE_DAYS: 30,
} as const;

// ============================================================
// Governance Configuration
// ============================================================

export const GOVERNANCE_CONFIG = {
  /** Maximum actions to keep in history */
  MAX_HISTORY_ACTIONS: 100,

  /** Minimum time between stage transitions (hours) */
  MIN_HOURS_BETWEEN_TRANSITIONS: 24,

  /** Default actor role */
  DEFAULT_ACTOR_ROLE: 'system',
} as const;

// ============================================================
// Helper Functions
// ============================================================

/**
 * Check if support state allows any resolution
 */
export function canResolveInPreview(state: string): boolean {
  return [
    PREVIEW_SUPPORT_STATES.SANDBOX_ONLY,
    PREVIEW_SUPPORT_STATES.GATED,
    PREVIEW_SUPPORT_STATES.PARTIALLY_SUPPORTED,
    PREVIEW_SUPPORT_STATES.SUPPORTED,
    PREVIEW_SUPPORT_STATES.PRODUCTION_ENABLED,
  ].includes(state as typeof PREVIEW_SUPPORT_STATES.SUPPORTED);
}

/**
 * Check if support state is considered "supported"
 */
export function isSupportedState(state: string): boolean {
  return [
    PREVIEW_SUPPORT_STATES.SUPPORTED,
    PREVIEW_SUPPORT_STATES.PRODUCTION_ENABLED,
  ].includes(state as typeof PREVIEW_SUPPORT_STATES.SUPPORTED);
}

/**
 * Check if monetization stage allows any commercial action
 */
export function allowsMonetization(stage: string): boolean {
  return [
    MONETIZATION_STAGES.LIMITED_MONETIZATION_PREVIEW,
    MONETIZATION_STAGES.PRODUCTION_CANDIDATE,
    MONETIZATION_STAGES.PRODUCTION_ENABLED,
  ].includes(stage as typeof MONETIZATION_STAGES.PRODUCTION_ENABLED);
}

/**
 * Get monetization readiness from score
 */
export function getMonetizationReadinessLevel(score: number): string {
  if (score >= COMMERCIAL_READINESS_THRESHOLDS.PRODUCTION_MONETIZATION_SCORE) {
    return 'ready_for_production';
  }
  if (score >= COMMERCIAL_READINESS_THRESHOLDS.PREVIEW_MONETIZATION_SCORE) {
    return 'ready_for_preview_monetization';
  }
  if (score >= COMMERCIAL_READINESS_THRESHOLDS.PROCEED_CAUTIOUSLY_SCORE) {
    return 'proceed_cautiously';
  }
  return 'not_ready';
}
