/**
 * Business Intelligence Layer - Constants
 *
 * Production-grade constants for:
 * - Scorecard windows
 * - Trend windows
 * - Alert thresholds
 * - Readiness thresholds
 * - Backlog severity thresholds
 * - Usefulness/revenue balance thresholds
 * - Decision confidence thresholds
 * - Stale scorecard thresholds
 * - Dashboard card limits
 */

// ============================================================
// A. Scorecard Windows
// ============================================================

/**
 * Scorecard generation intervals
 */
export const SCORECARD_WINDOWS = {
  HOURLY: 1,
  DAILY: 24,
  WEEKLY: 24 * 7,
  MONTHLY: 24 * 30,
} as const;

/**
 * Default scorecard period
 */
export const DEFAULT_SCORECARD_PERIOD = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
} as const;

// ============================================================
// B. Trend Windows
// ============================================================

/**
 * Trend analysis windows
 */
export const TREND_WINDOWS = {
  SHORT: 7, // 7 days
  MEDIUM: 14, // 14 days
  LONG: 30, // 30 days
  VERY_LONG: 90, // 90 days
} as const;

/**
 * Trend significance thresholds
 */
export const TREND_THRESHOLDS = {
  MIN_POINTS: 5,
  SIGNIFICANT_CHANGE: 0.1, // 10% change
  CRITICAL_CHANGE: 0.25, // 25% change
} as const;

// ============================================================
// C. Alert Thresholds
// ============================================================

/**
 * Alert thresholds for different metrics
 */
export const ALERT_THRESHOLDS = {
  NO_MATCH_RATE: {
    WARNING: 0.3, // 30%
    CRITICAL: 0.5, // 50%
  },
  QUALITY_SCORE: {
    WARNING: 0.6,
    CRITICAL: 0.4,
  },
  BALANCE_SCORE: {
    WARNING: 0.7,
    CRITICAL: 0.5,
  },
  REVENUE_DROP: {
    WARNING: 0.15, // 15%
    CRITICAL: 0.3, // 30%
  },
  SUBMIT_RATE: {
    WARNING: 0.02, // 2%
    CRITICAL: 0.01, // 1%
  },
  COPY_RATE: {
    WARNING: 0.2, // 20%
    CRITICAL: 0.1, // 10%
  },
  OPEN_RATE: {
    WARNING: 0.3, // 30%
    CRITICAL: 0.15, // 15%
  },
} as const;

// ============================================================
// D. Readiness Thresholds
// ============================================================

/**
 * Release readiness thresholds
 */
export const READINESS_THRESHOLDS = {
  MIN_READINESS_SCORE: 0.7,
  MAX_BLOCKERS: 3,
  MAX_CRITICAL_ISSUES: 1,
  MAX_ANOMALIES: 5,
} as const;

/**
 * Release readiness scoring weights
 */
export const READINESS_WEIGHTS = {
  COMMERCIAL: 0.3,
  QUALITY: 0.3,
  GROWTH: 0.2,
  GOVERNANCE: 0.2,
} as const;

// ============================================================
// E. Backlog Severity Thresholds
// ============================================================

/**
 * Remediation backlog severity thresholds
 */
export const BACKLOG_THRESHOLDS = {
  CRITICAL_MAX_AGE_DAYS: 1,
  HIGH_MAX_AGE_DAYS: 3,
  MEDIUM_MAX_AGE_DAYS: 7,
  LOW_MAX_AGE_DAYS: 14,
} as const;

/**
 * Backlog priority scoring
 */
export const BACKLOG_PRIORITY = {
  CRITICAL: 100,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25,
} as const;

// ============================================================
// F. Usefulness/Revenue Balance Thresholds
// ============================================================

/**
 * Revenue-quality balance thresholds
 */
export const REVENUE_QUALITY_THRESHOLDS = {
  MIN_BALANCE: 0.6,
  WARNING_BALANCE: 0.7,
  HEALTHY_BALANCE: 0.8,

  MIN_USEFULNESS: 0.5,
  WARNING_USEFULNESS: 0.6,
  HEALTHY_USEFULNESS: 0.7,

  MAX_DIVERGENCE: 0.2,
  CRITICAL_DIVERGENCE: 0.4,
} as const;

// ============================================================
// G. Decision Confidence Thresholds
// ============================================================

/**
 * Decision confidence thresholds
 */
export const DECISION_CONFIDENCE_THRESHOLDS = {
  HIGH_CONFIDENCE: 0.8,
  MEDIUM_CONFIDENCE: 0.6,
  LOW_CONFIDENCE: 0.4,
  MIN_CONFIDENCE: 0.3,
} as const;

// ============================================================
// H. Stale Scorecard Thresholds
// ============================================================

/**
 * Stale scorecard thresholds
 */
export const STALE_SCORECARD_THRESHOLDS = {
  HOURLY_MAX_AGE_HOURS: 2,
  DAILY_MAX_AGE_HOURS: 26,
  WEEKLY_MAX_AGE_HOURS: 8 * 24,
} as const;

// ============================================================
// I. Dashboard Card Limits
// ============================================================

/**
 * Dashboard card limits
 */
export const DASHBOARD_LIMITS = {
  TOP_ITEMS: 10,
  RECENT_ITEMS: 20,
  ALERTS_PER_PAGE: 50,
  TREND_POINTS: 30,
  RISK_ITEMS: 10,
  DECISION_ITEMS: 20,
} as const;

// ============================================================
// J. Scorecard Health Thresholds
// ============================================================

/**
 * Scorecard health score thresholds
 */
export const SCORECARD_HEALTH_THRESHOLDS = {
  HEALTHY_MIN: 0.8,
  WARNING_MIN: 0.6,
  CRITICAL_MIN: 0.4,
} as const;

/**
 * Scorecard health weights by type
 */
export const SCORECARD_HEALTH_WEIGHTS = {
  growth: {
    sessions: 0.3,
    submit_rate: 0.3,
    surface_diversity: 0.2,
    traffic_quality: 0.2,
  },
  quality: {
    no_match_rate: 0.4,
    copy_rate: 0.3,
    open_rate: 0.3,
  },
  commercial: {
    revenue: 0.4,
    commission: 0.3,
    conversion_rate: 0.3,
  },
  release: {
    readiness_score: 0.5,
    blockers: 0.3,
    anomalies: 0.2,
  },
} as const;

// ============================================================
// K. Decision Support Rules
// ============================================================

/**
 * Growth surface decision thresholds
 */
export const GROWTH_SURFACE_DECISIONS = {
  SCALE: {
    min_sessions: 1000,
    min_submit_rate: 0.1,
    min_revenue: 100,
    max_no_match_rate: 0.3,
  },
  HOLD: {
    min_sessions: 100,
    min_submit_rate: 0.03,
    min_revenue: 10,
  },
  PAUSE: {
    max_submit_rate: 0.01,
    max_no_match_rate: 0.6,
  },
  DEINDEX: {
    max_revenue_per_session: 0.001,
    max_submit_rate: 0.005,
    max_no_match_rate: 0.8,
  },
} as const;

/**
 * Experiment decision thresholds
 */
export const EXPERIMENT_DECISIONS = {
  PROMOTE: {
    min_confidence: 0.95,
    min_improvement: 0.05,
    max_quality_drop: 0.05,
  },
  ROLLBACK: {
    max_confidence: 0.8,
    max_regression: -0.1,
    max_quality_drop: -0.1,
  },
  HOLD: {
    min_samples: 100,
    min_days: 3,
  },
} as const;

/**
 * Release decision thresholds
 */
export const RELEASE_DECISIONS = {
  BLOCK: {
    max_readiness_score: 0.5,
    max_blockers: 3,
    max_critical_anomalies: 1,
  },
  CONDITIONAL: {
    min_readiness_score: 0.6,
    max_blockers: 2,
    max_warnings: 5,
  },
  APPROVE: {
    min_readiness_score: 0.8,
    max_blockers: 0,
  },
} as const;

// ============================================================
// L. Operator BI View Configs
// ============================================================

/**
 * Operator BI view configurations
 */
export const OPERATOR_BI_VIEWS = {
  GROWTH_OPS: {
    title: 'Growth Operations',
    refreshInterval: 'hourly',
    defaultRange: 7,
  },
  PRODUCT_OPS: {
    title: 'Product Operations',
    refreshInterval: 'hourly',
    defaultRange: 7,
  },
  COMMERCIAL_OPS: {
    title: 'Commercial Operations',
    refreshInterval: 'daily',
    defaultRange: 7,
  },
  RELEASE_OPS: {
    title: 'Release Operations',
    refreshInterval: 'hourly',
    defaultRange: 14,
  },
  QUALITY_OPS: {
    title: 'Quality Operations',
    refreshInterval: 'hourly',
    defaultRange: 7,
  },
} as const;

// ============================================================
// M. Error Messages
// ============================================================

/**
 * Error messages
 */
export const BI_ERRORS = {
  INVALID_SCORECARD_TYPE: 'Invalid or unsupported scorecard type',
  INVALID_DATE_RANGE: 'Invalid or excessive date range',
  METRIC_NOT_FOUND: 'Metric definition not found',
  SCORECARD_STALE: 'Scorecard data is stale',
  INSUFFICIENT_DATA: 'Insufficient data for analysis',
  DECISION_CONFLICT: 'Conflicting decision signals',
  INVALID_RECOMMENDATION: 'Invalid recommendation type',
} as const;

// ============================================================
// N. KPI Groups
// ============================================================

/**
 * KPI groups for scorecard organization
 */
export const KPI_GROUPS = {
  GROWTH: [
    'growth.sessions',
    'growth.sessions_by_surface',
    'growth.submit_rate',
    'growth.traffic_quality',
  ],
  QUALITY: [
    'quality.no_match_rate',
    'quality.copy_rate',
    'quality.open_rate',
    'quality.balance_score',
  ],
  COMMERCIAL: [
    'commercial.revenue',
    'commercial.commission',
    'commercial.conversions',
    'commercial.revenue_per_session',
  ],
  RELEASE: [
    'release.readiness_score',
    'release.blockers',
    'release.anomalies',
    'release.governance_status',
  ],
  EXPERIMENT: [
    'experiment.active',
    'experiment.significant',
    'experiment.promoted',
    'experiment.rolled_back',
  ],
} as const;
