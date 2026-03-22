/**
 * Launch Closure Layer - Constants
 * Default values, thresholds, and configuration for launch closure
 */

// =============================================================================
// Readiness Thresholds
// =============================================================================

/** Minimum readiness score for GO decision */
export const READINESS_SCORE_GO_THRESHOLD = 0.85;

/** Minimum readiness score for CONDITIONAL_GO decision */
export const READINESS_SCORE_CONDITIONAL_GO_THRESHOLD = 0.70;

/** Minimum readiness score for WATCH_REQUIRED */
export const READINESS_SCORE_WATCH_THRESHOLD = 0.60;

/** Maximum blocker count for GO */
export const MAX_BLOCKERS_FOR_GO = 0;

/** Maximum blocker count for CONDITIONAL_GO */
export const MAX_BLOCKERS_FOR_CONDITIONAL_GO = 2;

// =============================================================================
// Blocker/Warning Thresholds
// =============================================================================

/** Critical risk counts as blocker */
export const CRITICAL_RISK_IS_BLOCKER = true;

/** High risk counts as blocker if more than threshold */
export const HIGH_RISK_BLOCKER_THRESHOLD = 2;

/** Critical risks must be resolved before GO */
export const CRITICAL_RISKS_MUST_BE_RESOLVED = true;

/** Warning threshold for conditional go */
export const MAX_WARNINGS_FOR_CONDITIONAL_GO = 5;

// =============================================================================
// Watch Window Defaults
// =============================================================================

/** Default watch window in hours after launch */
export const DEFAULT_WATCH_WINDOW_HOURS = 168; // 7 days

/** Extended watch window for high-risk launches */
export const EXTENDED_WATCH_WINDOW_HOURS = 336; // 14 days

/** Minimum watch window */
export const MIN_WATCH_WINDOW_HOURS = 24; // 1 day

// =============================================================================
// Freeze Window Defaults
// =============================================================================

/** Freeze window in hours before launch */
export const DEFAULT_FREEZE_WINDOW_HOURS = 72; // 3 days

/** Strict freeze window for critical launches */
export const STRICT_FREEZE_WINDOW_HOURS = 168; // 7 days

/** Freeze applies to production changes only */
export const FREEZE_APPLIES_TO_PRODUCTION = true;

// =============================================================================
// Signoff Timeout Expectations
// =============================================================================

/** Signoff timeout in hours */
export const SIGNOFF_TIMEOUT_HOURS = 24;

/** Critical signoff timeout in hours */
export const CRITICAL_SIGNOFF_TIMEOUT_HOURS = 12;

/** Auto-reject signoff if timeout exceeded */
export const AUTO_REJECT_ON_SIGNOFF_TIMEOUT = false;

// =============================================================================
// Stale Risk Thresholds
// =============================================================================

/** Risk is stale if unresolved after days */
export const STALE_RISK_DAYS = 7;

/** Critical risk stale threshold in days */
export const CRITICAL_RISK_STALE_DAYS = 1;

/** High risk stale threshold in days */
export const HIGH_RISK_STALE_DAYS = 3;

// =============================================================================
// Go/No-Go Thresholds
// =============================================================================

/** All critical risks must be resolved for GO */
export const GO_REQUIRES_ALL_CRITICAL_RESOLVED = true;

/** All required signoffs must be approved for GO */
export const GO_REQUIRES_ALL_SIGNOFFS = true;

/** Maximum number of conditional requirements */
export const MAX_CONDITIONAL_REQUIREMENTS = 5;

// =============================================================================
// Post-Launch Review Defaults
// =============================================================================

/** First review after launch in hours */
export const FIRST_POST_LAUNCH_REVIEW_HOURS = 24;

/** Second review after launch in hours */
export const SECOND_POST_LAUNCH_REVIEW_HOURS = 72;

/** Daily reviews during watch window */
export const DAILY_REVIEWS_DURING_WATCH = true;

/** First week review frequency in days */
export const FIRST_WEEK_REVIEW_FREQUENCY_DAYS = 1;

/** Second week review frequency in days */
export const SECOND_WEEK_REVIEW_FREQUENCY_DAYS = 2;

// =============================================================================
// Checklist Item Categories
// =============================================================================

export const CHECKLIST_CATEGORIES = {
  RUNTIME: 'runtime',
  PUBLIC_FLOW: 'public_flow',
  COMMERCIAL: 'commercial',
  GOVERNANCE: 'governance',
  MULTI_PLATFORM: 'multi_platform',
  OPS: 'ops',
  SECURITY: 'security',
} as const;

// =============================================================================
// Critical Checklist Items
// =============================================================================

export const CRITICAL_CHECKLIST_ITEMS = [
  'runtime_stability_verified',
  'error_rates_acceptable',
  'public_flow_functional',
  'shopee_production_safe',
  'tiktok_preview_safe',
  'rollback_procedures_tested',
  'monitoring_active',
  'oncall_established',
];

// =============================================================================
// Required Signoff Areas
// =============================================================================

export const REQUIRED_SIGNOFF_AREAS = [
  'product_quality',
  'release_runtime',
  'commercial_safety',
  'multi_platform_support',
  'governance_ops',
] as const;

// =============================================================================
// Severity to Priority Mapping
// =============================================================================

export const SEVERITY_TO_PRIORITY: Record<string, number> = {
  critical: 100,
  high: 80,
  medium: 60,
  low: 40,
  info: 20,
};

// =============================================================================
// Risk Type Categories
// =============================================================================

export const RISK_TYPE_CATEGORIES = {
  RUNTIME: ['runtime_stability', 'error_rate', 'performance_degradation'],
  PUBLIC_FLOW: ['public_link_resolution', 'conversion_tracking', 'consumer_experience'],
  COMMERCIAL: ['revenue_impact', 'attribution_accuracy', 'pricing_errors'],
  GOVERNANCE: ['compliance_violation', 'policy_breach', 'quality_gate_failure'],
  MULTI_PLATFORM: ['platform_parity_gap', 'capability_gap', 'feature_inconsistency'],
  OPS: ['monitoring_gap', 'oncall_gap', 'runbook_missing'],
  SECURITY: ['security_vulnerability', 'data_leak', 'access_control_issue'],
};

// =============================================================================
// Escalation Matrix
// =============================================================================

export const ESCALATION_MATRIX = {
  critical: {
    notifyWithinMinutes: 15,
    escalateToLevel: 'director',
    requiresIncidentCall: true,
  },
  high: {
    notifyWithinMinutes: 60,
    escalateToLevel: 'manager',
    requiresIncidentCall: false,
  },
  medium: {
    notifyWithinMinutes: 240,
    escalateToLevel: 'lead',
    requiresIncidentCall: false,
  },
  low: {
    notifyWithinMinutes: 1440,
    escalateToLevel: 'team',
    requiresIncidentCall: false,
  },
};

// =============================================================================
// Freeze Policy Rules
// =============================================================================

export const FREEZE_POLICY_RULES = {
  production_deployments_blocked: true,
  configuration_changes_blocked: true,
  database_migrations_blocked: true,
  feature_flags_blocked: true,
  emergency_bypass_requires_approval: true,
  bypass_approval_level: 'director',
};

// =============================================================================
// Guardrail Thresholds
// =============================================================================

export const GUARDRAIL_THRESHOLDS = {
  error_rate_warning: 0.05,
  error_rate_critical: 0.10,
  latency_p99_warning: 3000,
  latency_p99_critical: 5000,
  conversion_drop_warning: 0.20,
  conversion_drop_critical: 0.40,
  revenue_drop_warning: 0.15,
  revenue_drop_critical: 0.30,
};

// =============================================================================
// Launch Key Defaults
// =============================================================================

export const DEFAULT_LAUNCH_PREFIX = 'launch';

/** Default launch key format: launch-YYYYMMDD */
export function generateDefaultLaunchKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${DEFAULT_LAUNCH_PREFIX}-${year}${month}${day}`;
}

// =============================================================================
// Metrics
// =============================================================================

export const METRIC_NAMES = {
  LAUNCH_REVIEW_CREATED: 'launch_review_created',
  LAUNCH_REVIEW_COMPLETED: 'launch_review_completed',
  LAUNCH_REVIEW_FINALIZED: 'launch_review_finalized',
  CHECKLIST_COMPLETED: 'checklist_completed',
  RISK_REGISTERED: 'risk_registered',
  RISK_RESOLVED: 'risk_resolved',
  SIGNOFF_COMPLETED: 'signoff_completed',
  GO_DECISION_MADE: 'go_decision_made',
  NO_GO_DECISION_MADE: 'no_go_decision_made',
  WATCH_PLAN_CREATED: 'watch_plan_created',
} as const;
