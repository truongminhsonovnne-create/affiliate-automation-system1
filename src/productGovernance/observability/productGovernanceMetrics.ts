/**
 * Product Governance Metrics
 *
 * Metrics for governance operations.
 */

export const GOVERNANCE_METRICS = {
  // Release reviews
  RELEASE_REVIEWS_TOTAL: 'governance.release_reviews.total',
  RELEASE_REVIEWS_BLOCKED: 'governance.release_reviews.blocked',
  RELEASE_REVIEWS_APPROVED: 'governance.release_reviews.approved',
  RELEASE_REVIEWS_CONDITIONAL: 'governance.release_reviews.conditional',
  RELEASE_REVIEWS_DEFERRED: 'governance.release_reviews.deferred',
  RELEASE_REVIEWS_ROLLBACK_RECOMMENDED: 'governance.release_reviews.rollback_recommended',

  // Issues
  BLOCKING_ISSUES_TOTAL: 'governance.issues.blocking.total',
  WARNING_ISSUES_TOTAL: 'governance.issues.warning.total',
  ISSUES_BY_SEVERITY: 'governance.issues.by_severity',
  ISSUES_BY_TYPE: 'governance.issues.by_type',

  // Follow-ups
  FOLLOWUPS_CREATED: 'governance.followups.created',
  FOLLOWUPS_COMPLETED: 'governance.followups.completed',
  FOLLOWUPS_OVERDUE: 'governance.followups.overdue',
  FOLLOWUP_BACKLOG: 'governance.followups.backlog',

  // Cadence
  CADENCE_RUNS_TOTAL: 'governance.cadence.runs.total',
  CADENCE_RUNS_COMPLETED: 'governance.cadence.runs.completed',
  CADENCE_RUNS_FAILED: 'governance.cadence.runs.failed',

  // Signals
  SIGNALS_INGESTED: 'governance.signals.ingested',
  SIGNALS_ACTIVE: 'governance.signals.active',

  // Decisions
  DECISIONS_TOTAL: 'governance.decisions.total',
  DECISIONS_BY_TYPE: 'governance.decisions.by_type',

  // Scores
  READINESS_SCORE_AVERAGE: 'governance.readiness_score.average',
} as const;

/**
 * Record a metric increment
 */
export function incrementMetric(metric: string, value: number = 1): void {
  // In real implementation, send to metrics system (Prometheus, DataDog, etc.)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Metrics] ${metric}: +${value}`);
  }
}

/**
 * Record a metric gauge
 */
export function setGauge(metric: string, value: number): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Metrics] ${metric}: ${value}`);
  }
}

/**
 * Record release review metrics
 */
export function recordReleaseReviewMetrics(result: {
  status: string;
  blockingCount: number;
  warningCount: number;
  score: number | null;
}): void {
  incrementMetric(GOVERNANCE_METRICS.RELEASE_REVIEWS_TOTAL);

  switch (result.status) {
    case 'blocked':
      incrementMetric(GOVERNANCE_METRICS.RELEASE_REVIEWS_BLOCKED);
      break;
    case 'ready':
      incrementMetric(GOVERNANCE_METRICS.RELEASE_REVIEWS_APPROVED);
      break;
    case 'conditionally_ready':
      incrementMetric(GOVERNANCE_METRICS.RELEASE_REVIEWS_CONDITIONAL);
      break;
    case 'deferred':
      incrementMetric(GOVERNANCE_METRICS.RELEASE_REVIEWS_DEFERRED);
      break;
    case 'rollback_recommended':
      incrementMetric(GOVERNANCE_METRICS.RELEASE_REVIEWS_ROLLBACK_RECOMMENDED);
      break;
  }

  if (result.score !== null) {
    setGauge(GOVERNANCE_METRICS.READINESS_SCORE_AVERAGE, result.score);
  }
}

/**
 * Record follow-up metrics
 */
export function recordFollowupMetrics(open: number, overdue: number): void {
  setGauge(GOVERNANCE_METRICS.FOLLOWUP_BACKLOG, open);
  setGauge(GOVERNANCE_METRICS.FOLLOWUPS_OVERDUE, overdue);
}
