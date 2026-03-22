/**
 * Experimentation Constants
 */

import { ExperimentStatus, ExperimentType, ExperimentScope, ExperimentTargetSurface, AssignmentStrategy, TuningControlType } from '../types/index.js';

// ============================================================================
// Rollout Configuration
// ============================================================================

export const ROLLOUT_CONFIG = {
  DEFAULT_ROLLOUT_PERCENTAGE: 0,
  MIN_ROLLOUT_FOR_ANALYSIS: 5,
  RECOMMENDED_INITIAL_ROLLOUT: 10,
  RECOMMENDED_STAGED_ROLLOUT: [10, 25, 50, 75, 100],
  MAX_ROLLOUT_WITHOUT_GUARDRAILS: 50,
  ROLLOUT_INCREMENT: 10,
  ROLLOUT_INCREMENT_INTERVAL_HOURS: 24,
} as const;

// ============================================================================
// Assignment Configuration
// ============================================================================

export const ASSIGNMENT_CONFIG = {
  DEFAULT_STRATEGY: AssignmentStrategy.HASH,
  BUCKET_COUNT: 1000,
  ASSIGNMENT_TTL_SECONDS: 3600,
  STICKY_ASSIGNMENT_DAYS: 30,
  HASH_SALT: 'voucher-experiment-salt',
} as const;

// ============================================================================
// Exposure Configuration
// ============================================================================

export const EXPOSURE_CONFIG = {
  EXPOSURE_WINDOW_MINUTES: 60,
  MAX_EXPOSURES_PER_SESSION: 100,
  DEBOUNCE_MS: 500,
  BATCH_SIZE: 50,
} as const;

// ============================================================================
// Outcome Configuration
// ============================================================================

export const OUTCOME_CONFIG = {
  CONVERSION_WINDOW_MINUTES: 1440, // 24 hours
  LATENCY_THRESHOLD_MS: 2000,
  MIN_OUTCOMES_FOR_ANALYSIS: 30,
} as const;

// ============================================================================
// Guardrail Thresholds
// ============================================================================

export const GUARDRAIL_THRESHOLDS = {
  ERROR_RATE_INCREASE: 0.05, // 5% increase
  NO_MATCH_RATE_INCREASE: 0.10, // 10% increase
  LATENCY_INCREASE: 0.25, // 25% increase
  COPY_SUCCESS_DECREASE: 0.15, // 15% decrease
  OPEN_SHOPEE_DECREASE: 0.20, // 20% decrease
  CRITICAL_ERROR_RATE: 0.01, // 1%
} as const;

// ============================================================================
// Kill Switch Configuration
// ============================================================================

export const KILL_SWITCH_CONFIG = {
  MAX_EXPERIMENTS_DISABLED_AT_ONCE: 5,
  AUTO_DISABLE_ON_CRITICAL: true,
  NOTIFY_ON_KILL: true,
} as const;

// ============================================================================
// Tuning Control Limits
// ============================================================================

export const TUNING_CONTROL_LIMITS = {
  RANKING_WEIGHT_MIN: 0,
  RANKING_WEIGHT_MAX: 1,
  CANDIDATE_COUNT_MIN: 1,
  CANDIDATE_COUNT_MAX: 20,
  CONFIDENCE_THRESHOLD_MIN: 0,
  CONFIDENCE_THRESHOLD_MAX: 1,
} as const;

// ============================================================================
// Experiment Type Configuration
// ============================================================================

export const EXPERIMENT_TYPE_CONFIG: Record<ExperimentType, {
  description: string;
  defaultTargetSurface: ExperimentTargetSurface;
  supportsHoldback: boolean;
}> = {
  [ExperimentType.RANKING]: {
    description: 'Voucher ranking algorithm changes',
    defaultTargetSurface: ExperimentTargetSurface.PASTE_LINK,
    supportsHoldback: true,
  },
  [ExperimentType.PRESENTATION]: {
    description: 'UI/presentation changes',
    defaultTargetSurface: ExperimentTargetSurface.VOUCHER_HERO,
    supportsHoldback: true,
  },
  [ExperimentType.COPY]: {
    description: 'Copy/text changes',
    defaultTargetSurface: ExperimentTargetSurface.PASTE_LINK,
    supportsHoldback: false,
  },
  [ExperimentType.FALLBACK]: {
    description: 'No-match fallback handling',
    defaultTargetSurface: ExperimentTargetSurface.NO_MATCH_FALLBACK,
    supportsHoldback: true,
  },
  [ExperimentType.CTA]: {
    description: 'CTA hierarchy changes',
    defaultTargetSurface: ExperimentTargetSurface.PASTE_LINK,
    supportsHoldback: false,
  },
  [ExperimentType.HYBRID]: {
    description: 'Combined experiment types',
    defaultTargetSurface: ExperimentTargetSurface.PASTE_LINK,
    supportsHoldback: true,
  },
};

// ============================================================================
// Environment Configuration
// ============================================================================

export const ENVIRONMENT_CONFIG = {
  LOCAL: 'local',
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  VALID_ENVIRONMENTS: ['local', 'development', 'staging', 'production'] as const,
  ROLLOUT_BY_ENVIRONMENT: {
    local: 100,
    development: 100,
    staging: 50,
    production: 0,
  } as Record<string, number>,
} as const;

// ============================================================================
// Analysis Windows
// ============================================================================

export const ANALYSIS_WINDOWS = {
  HOURLY: 1,
  DAILY: 24,
  WEEKLY: 168,
  MONTHLY: 720,
} as const;

// ============================================================================
// Decision Thresholds
// ============================================================================

export const DECISION_THRESHOLDS = {
  MIN_CONFIDENCE: 0.8,
  WINNER_CONFIDENCE: 0.95,
  MIN_VARIANT_DIFFERENCE: 0.05,
  SIGNIFICANT_CONVERSION_DIFF: 0.10,
} as const;

// ============================================================================
// Validation Rules
// ============================================================================

export const VALIDATION_RULES = {
  EXPERIMENT_KEY_PATTERN: /^[a-z][a-z0-9_-]*$/,
  VARIANT_KEY_PATTERN: /^[a-z][a-z0-9_-]*$/,
  MAX_VARIANTS: 10,
  MIN_VARIANTS: 2,
  MAX_TARGETING_RULES: 20,
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

export const EXPERIMENT_FEATURES = {
  ENABLE_STICKY_ASSIGNMENT: true,
  ENABLE_GUARDRAILS: true,
  ENABLE_KILL_SWITCH: true,
  ENABLE_TUNING_CONTROLS: true,
  ENABLE_AUTOMATED_ANALYSIS: false,
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  INVALID_EXPERIMENT_KEY: 'Invalid experiment key format',
  INVALID_VARIANT_KEY: 'Invalid variant key format',
  INVALID_ROLLOUT: 'Rollout percentage must be between 0 and 100',
  INVALID_VARIANT_COUNT: 'Experiment must have between 2 and 10 variants',
  INVALID_TARGETING_RULE: 'Invalid targeting rule',
  EXPERIMENT_NOT_FOUND: 'Experiment not found',
  VARIANT_NOT_FOUND: 'Variant not found',
  ASSIGNMENT_FAILED: 'Failed to assign variant',
  GUARDRAIL_BREACH: 'Guardrail breach detected',
  KILL_SWITCH_TRIGGERED: 'Kill switch was triggered',
  TUNING_CONTROL_INVALID: 'Invalid tuning control value',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const SUCCESS_MESSAGES = {
  EXPERIMENT_CREATED: 'Experiment created successfully',
  EXPERIMENT_ACTIVATED: 'Experiment activated',
  EXPERIMENT_PAUSED: 'Experiment paused',
  EXPERIMENT_DISABLED: 'Experiment disabled',
  TUNING_CONTROL_UPDATED: 'Tuning control updated',
  KILL_SWITCH_TRIGGERED: 'Kill switch executed',
} as const;

// ============================================================================
// Configuration Export
// ============================================================================

export const EXPERIMENT_CONFIG = {
  FEATURE_FLAGS: EXPERIMENT_FEATURES,
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_STAGING: process.env.NODE_ENV === 'staging',
} as const;
