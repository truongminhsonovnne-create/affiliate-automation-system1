/**
 * Platform Production Rollout Constants
 *
 * Production-grade constants for rollout planning and execution.
 */

// =============================================================================
// Rollout Stage Configuration
// =============================================================================

export const ROLLOUT_STAGES = {
  INTERNAL_ONLY: {
    key: 'internal_only',
    order: 1,
    exposureScope: 'internal_only' as const,
    trafficPercentage: 0,
    description: 'Internal-only testing and validation',
    minDurationDays: 3,
  },
  LIMITED_PRODUCTION_CANDIDATE: {
    key: 'limited_production_candidate',
    order: 2,
    exposureScope: 'limited_cohort' as const,
    trafficPercentage: 1,
    description: 'Limited production candidate exposure to early users',
    minDurationDays: 5,
  },
  LIMITED_PRODUCTION: {
    key: 'limited_production',
    order: 3,
    exposureScope: 'limited_public' as const,
    trafficPercentage: 5,
    description: 'Limited public production exposure',
    minDurationDays: 7,
  },
  CONTROLLED_RAMP: {
    key: 'controlled_ramp',
    order: 4,
    exposureScope: 'controlled_ramp' as const,
    trafficPercentage: 15,
    description: 'Controlled traffic ramp-up',
    minDurationDays: 7,
  },
  BROADER_RAMP: {
    key: 'broader_ramp',
    order: 5,
    exposureScope: 'broader_ramp' as const,
    trafficPercentage: 40,
    description: 'Broader traffic exposure',
    minDurationDays: 7,
  },
  FULL_PRODUCTION: {
    key: 'full_production',
    order: 6,
    exposureScope: 'full_production' as const,
    trafficPercentage: 100,
    description: 'Full production enablement',
    minDurationDays: 0, // No minimum - once reached, it's production
  },
} as const;

// =============================================================================
// Rollout Timing Constants
// =============================================================================

export const ROLLOUT_TIMING = {
  // Minimum time in each stage (days)
  MIN_INTERNAL_ONLY_DAYS: 3,
  MIN_LIMITED_CANDIDATE_DAYS: 5,
  MIN_LIMITED_PRODUCTION_DAYS: 7,
  MIN_CONTROLLED_RAMP_DAYS: 7,
  MIN_BROADER_RAMP_DAYS: 7,

  // Checkpoint evaluation windows (hours)
  CHECKPOINT_EVALUATION_WINDOW_HOURS: 4,
  STAGE_CHECKPOINT_HOURS: 24,

  // Post-enablement observation (days)
  POST_ENABLEMENT_OBSERVATION_DAYS: 3,
  POST_ENABLEMENT_WEEKLY_REVIEW_DAYS: 7,

  // Rollback decision window (hours)
  ROLLBACK_DECISION_WINDOW_HOURS: 2,

  // Freeze window after stage change (hours)
  STAGE_FREEZE_WINDOW_HOURS: 24,
} as const;

// =============================================================================
// Checkpoint Thresholds
// =============================================================================

export const CHECKPOINT_THRESHOLDS = {
  // Support state stability
  SUPPORT_STATE_STABILITY_MIN: 85,

  // Resolution quality
  RESOLUTION_QUALITY_MIN: 75,
  RESOLUTION_ERROR_RATE_MAX: 5,

  // No-match regression
  NO_MATCH_REGRESSION_MAX: 10,
  NO_MATCH_INCREASE_THRESHOLD: 5,

  // Latency
  LATENCY_P50_MAX_MS: 500,
  LATENCY_P99_MAX_MS: 2000,
  LATENCY_INCREASE_THRESHOLD_PCT: 20,

  // Error rates
  ERROR_RATE_MAX: 2,
  ERROR_INCREASE_THRESHOLD_PCT: 50,

  // Commercial
  COMMERCIAL_SUCCESS_RATE_MIN: 70,
  COMMERCIAL_QUALITY_MIN: 65,

  // Governance
  GOVERNANCE_CLEARANCE_REQUIRED: true,
  GOVERNANCE_BLOCKERS_MAX: 0,

  // Operations
  OPS_INCIDENT_THRESHOLD: 3,
  OPS_PAGER_DUTY_ESCALATIONS_MAX: 2,
} as const;

// =============================================================================
// Guardrail Thresholds
// =============================================================================

export const GUARDRAIL_THRESHOLDS = {
  // Overall guardrail score
  GUARDRAIL_PROCEED_MIN: 75,
  GUARDRAIL_HOLD_MAX: 60,
  GUARDRAIL_ROLLBACK_MIN: 40,

  // Checkpoint pass thresholds
  CHECKPOINT_PASS_MIN_SCORE: 70,
  CHECKPOINT_CRITICAL_MUST_PASS: true,

  // Blocker thresholds
  CRITICAL_BLOCKERS_MAX: 0,
  HIGH_BLOCKERS_MAX: 1,

  // Warning thresholds
  HIGH_WARNINGS_MAX: 3,
  MEDIUM_WARNINGS_MAX: 5,
} as const;

// =============================================================================
// Rollback Trigger Thresholds
// =============================================================================

export const ROLLBACK_TRIGGERS = {
  // Critical triggers - immediate rollback
  CRITICAL_ERROR_RATE: 10,
  CRITICAL_LATENCY_MS: 5000,
  CRITICAL_SUPPORT_STATE_FAILURES: 20,

  // High triggers - evaluate rollback
  HIGH_ERROR_RATE: 5,
  HIGH_LATENCY_MS: 3000,
  HIGH_SUPPORT_STATE_FAILURES: 10,

  // Stability triggers
  STABILITY_SCORE_MIN: 40,
  QUALITY_SCORE_MIN: 40,

  // Governance triggers
  GOVERNANCE_BLOCKERS: 1,
  GOVERNANCE_WITHDRAWN: true,

  // Incident triggers
  CRITICAL_INCIDENTS_MAX: 3,
  P1_INCIDENTS_MAX: 5,
} as const;

// =============================================================================
// Exposure Scope Configuration
// =============================================================================

export const EXPOSURE_SCOPE_CONFIG = {
  internal_only: {
    maxTrafficPercentage: 0,
    publicFacing: false,
    monetizationEnabled: false,
    rateLimited: true,
    requiresApproval: true,
  },
  limited_cohort: {
    maxTrafficPercentage: 1,
    publicFacing: true,
    monetizationEnabled: false,
    rateLimited: true,
    requiresApproval: true,
  },
  limited_public: {
    maxTrafficPercentage: 5,
    publicFacing: true,
    monetizationEnabled: false,
    rateLimited: true,
    requiresApproval: true,
  },
  controlled_ramp: {
    maxTrafficPercentage: 15,
    publicFacing: true,
    monetizationEnabled: true,
    rateLimited: true,
    requiresApproval: true,
  },
  broader_ramp: {
    maxTrafficPercentage: 40,
    publicFacing: true,
    monetizationEnabled: true,
    rateLimited: false,
    requiresApproval: true,
  },
  full_production: {
    maxTrafficPercentage: 100,
    publicFacing: true,
    monetizationEnabled: true,
    rateLimited: false,
    requiresApproval: false,
  },
} as const;

// =============================================================================
// Post-Enablement Monitoring
// =============================================================================

export const POST_ENABLEMENT_MONITORING = {
  // Health check intervals
  HEALTH_CHECK_INTERVAL_MINUTES: 15,
  HEALTH_CHECK_WINDOW_HOURS: 24,

  // Drift detection
  DRIFT_DETECTION_THRESHOLD_PCT: 15,
  BASELINE_COMPARISON_DAYS: 7,

  // Quality thresholds
  QUALITY_DRIFT_THRESHOLD: 10,
  LATENCY_DRIFT_THRESHOLD_PCT: 25,
  ERROR_RATE_DRIFT_THRESHOLD_PCT: 30,

  // Stability thresholds
  STABILITY_MIN_SCORE: 60,
  STABILITY_CHECK_INTERVAL_HOURS: 6,
} as const;

// =============================================================================
// Rollout Decision Thresholds
// =============================================================================

export const ROLLOUT_DECISION = {
  // Proceed decision
  PROCEED: {
    MIN_GUARDRAIL_SCORE: 75,
    MAX_CRITICAL_CHECKPOINTS_FAILED: 0,
    MAX_HIGH_CHECKPOINTS_FAILED: 1,
  },

  // Hold decision
  HOLD: {
    MIN_GUARDRAIL_SCORE: 50,
    MAX_CRITICAL_CHECKPOINTS_FAILED: 1,
  },

  // Rollback decision
  ROLLBACK: {
    MAX_GUARDRAIL_SCORE: 40,
    MIN_CRITICAL_CHECKPOINTS_FAILED: 2,
  },
} as const;

// =============================================================================
// Backlog Priority Configuration
// =============================================================================

export const BACKLOG_PRIORITY = {
  CRITICAL: {
    responseTimeHours: 4,
    resolutionTargetHours: 24,
  },
  HIGH: {
    responseTimeHours: 24,
    resolutionTargetHours: 72,
  },
  MEDIUM: {
    responseTimeHours: 72,
    resolutionTargetHours: 168, // 1 week
  },
  LOW: {
    responseTimeHours: 168,
    resolutionTargetHours: 720, // 30 days
  },
} as const;

// =============================================================================
// Metrics Names
// =============================================================================

export const METRICS_NAMES = {
  ROLLOUT_PLAN_COUNT: 'platform_rollout_plan_count',
  STAGE_START_COUNT: 'platform_rollout_stage_start_count',
  STAGE_COMPLETE_COUNT: 'platform_rollout_stage_complete_count',
  STAGE_PAUSE_COUNT: 'platform_rollout_stage_pause_count',
  CHECKPOINT_PASS_COUNT: 'platform_rollout_checkpoint_pass_count',
  CHECKPOINT_FAIL_COUNT: 'platform_rollout_checkpoint_fail_count',
  ROLLBACK_COUNT: 'platform_rollout_rollback_count',
  POST_ENABLEMENT_RISK_COUNT: 'platform_post_enablement_risk_count',
  LAUNCH_INSTABILITY_COUNT: 'platform_launch_instability_count',
} as const;
