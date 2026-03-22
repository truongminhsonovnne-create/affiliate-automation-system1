/**
 * Release Readiness Evaluator
 *
 * Core evaluation logic for release readiness assessment.
 */

import {
  ProductGovernanceSignal,
  ProductGovernanceSignalType,
  ProductGovernanceSeverity,
  ReleaseReadinessStatus,
  ReleaseReadinessScore,
  ReleaseBlockingIssue,
  ReleaseWarningIssue,
  ReleaseReadinessSummary,
  SignalScore,
  ScoreBreakdown,
  ExperimentGovernanceSummary,
  ProductOpsGovernanceSummary,
  OperationalGovernanceSummary,
  QaGovernanceSummary,
} from '../types';
import {
  READINESS_SCORE_CONFIG,
  BLOCKING_RULES,
  RELEASE_GATE_CONFIG,
} from '../constants';

export interface ReleaseReadinessInput {
  releaseKey: string;
  environment: string;
  signals: ProductGovernanceSignal[];
}

export interface ReleaseReadinessResult {
  status: ReleaseReadinessStatus;
  score: number;
  blockingIssues: ReleaseBlockingIssue[];
  warningIssues: ReleaseWarningIssue[];
  summary: ReleaseReadinessSummary;
}

/**
 * Main entry point for evaluating release readiness
 */
export function evaluateReleaseReadiness(input: ReleaseReadinessInput): ReleaseReadinessResult {
  const { releaseKey, environment, signals } = input;

  // Filter active signals only
  const activeSignals = signals.filter(s => s.isActive);

  // Classify blocking vs warning issues
  const { blocking, warnings } = classifyBlockingAndWarningIssues(activeSignals);

  // Calculate readiness score
  const scoreResult = buildReleaseReadinessScore(activeSignals, blocking, warnings);

  // Determine status based on issues and score
  const status = determineReleaseStatus(blocking, warnings, scoreResult.overall);

  // Build summary
  const summary = buildReleaseReadinessSummary(
    activeSignals,
    blocking,
    warnings,
    scoreResult
  );

  return {
    status,
    score: scoreResult.overall,
    blockingIssues: blocking,
    warningIssues: warnings,
    summary,
  };
}

/**
 * Build comprehensive release readiness score
 */
export function buildReleaseReadinessScore(
  signals: ProductGovernanceSignal[],
  blocking: ReleaseBlockingIssue[],
  warnings: ReleaseWarningIssue[]
): ReleaseReadinessScore {
  const weights = READINESS_SCORE_CONFIG.COMPONENT_WEIGHTS;

  // Calculate component scores
  const productQualityScore = calculateProductQualityScore(signals);
  const experimentsScore = calculateExperimentsScore(signals);
  const operationsScore = calculateOperationsScore(signals);
  const qaScore = calculateQaScore(signals);
  const releaseReadinessScore = calculateReleaseReadinessScore(blocking, warnings);

  // Build signal scores
  const signalScores: SignalScore[] = [
    { signalType: ProductGovernanceSignalType.PRODUCT_OPS_CASE, score: productQualityScore, weight: weights.productQuality, issues: blocking.filter(s => s.signalType === ProductGovernanceSignalType.PRODUCT_OPS_CASE).length },
    { signalType: ProductGovernanceSignalType.EXPERIMENT_GUARDRAIL, score: experimentsScore, weight: weights.experiments, issues: blocking.filter(s => s.signalType === ProductGovernanceSignalType.EXPERIMENT_GUARDRAIL).length },
    { signalType: ProductGovernanceSignalType.OPERATIONAL_ISSUE, score: operationsScore, weight: weights.operations, issues: blocking.filter(s => s.signalType === ProductGovernanceSignalType.OPERATIONAL_ISSUE).length },
    { signalType: ProductGovernanceSignalType.QA_REGRESSION, score: qaScore, weight: weights.qaVerification, issues: blocking.filter(s => s.signalType === ProductGovernanceSignalType.QA_REGRESSION).length },
  ];

  // Calculate weighted overall score
  const overall =
    productQualityScore * weights.productQuality +
    experimentsScore * weights.experiments +
    operationsScore * weights.operations +
    qaScore * weights.qaVerification +
    releaseReadinessScore * weights.releaseReadiness;

  const breakdown: ScoreBreakdown = {
    productQuality: productQualityScore,
    experiments: experimentsScore,
    operations: operationsScore,
    qaVerification: qaScore,
    releaseReadiness: releaseReadinessScore,
  };

  return {
    overall: Math.round(overall * 100) / 100,
    signals: signalScores,
    breakdown,
  };
}

/**
 * Classify signals into blocking vs warning issues
 */
export function classifyBlockingAndWarningIssues(
  signals: ProductGovernanceSignal[]
): { blocking: ReleaseBlockingIssue[]; warnings: ReleaseWarningIssue[] } {
  const blocking: ReleaseBlockingIssue[] = [];
  const warnings: ReleaseWarningIssue[] = [];

  for (const signal of signals) {
    const issue = signalToIssue(signal);

    // Check if this is a blocking issue
    if (isBlockingIssue(signal)) {
      blocking.push(issue);
    } else {
      warnings.push(issue);
    }
  }

  return { blocking, warnings };
}

/**
 * Check if release should be blocked
 */
export function isReleaseBlocked(
  blocking: ReleaseBlockingIssue[],
  warnings: ReleaseWarningIssue[]
): boolean {
  // Check critical blocking issues
  const criticalCount = blocking.filter(i => i.severity === ProductGovernanceSeverity.CRITICAL).length;
  if (criticalCount > READINESS_SCORE_CONFIG.BLOCKING_CRITICAL_MAX) {
    return true;
  }

  // Check high severity blocking issues
  const highCount = blocking.filter(i => i.severity === ProductGovernanceSeverity.HIGH).length;
  if (highCount > BLOCKING_RULES.HIGH_SEVERITY_MAX_OPEN) {
    return true;
  }

  // Check if there are any staging failures
  const hasStagingFailure = blocking.some(
    i => i.signalType === ProductGovernanceSignalType.STAGING_FAILURE
  );
  if (hasStagingFailure) {
    return true;
  }

  // Check for critical operational issues
  const hasCriticalOperational = blocking.some(
    i => i.signalType === ProductGovernanceSignalType.OPERATIONAL_ISSUE &&
         i.severity === ProductGovernanceSeverity.CRITICAL
  );
  if (hasCriticalOperational) {
    return true;
  }

  return false;
}

/**
 * Build release readiness summary
 */
export function buildReleaseReadinessSummary(
  signals: ProductGovernanceSignal[],
  blocking: ReleaseBlockingIssue[],
  warnings: ReleaseWarningIssue[],
  scoreResult: ReleaseReadinessScore
): ReleaseReadinessSummary {
  // Count signals by source
  const signalsBySource: Record<string, number> = {};
  signals.forEach(s => {
    signalsBySource[s.signalSource] = (signalsBySource[s.signalSource] || 0) + 1;
  });

  // Count signals by severity
  const signalsBySeverity: Record<string, number> = {};
  signals.forEach(s => {
    signalsBySeverity[s.severity] = (signalsBySeverity[s.severity] || 0) + 1;
  });

  // Build component summaries
  const experimentStatus = buildExperimentSummary(signals);
  const productOpsStatus = buildProductOpsSummary(signals);
  const operationalStatus = buildOperationalSummary(signals);
  const qaStatus = buildQaSummary(signals);

  return {
    signalsEvaluated: signals.length,
    signalsBySource,
    signalsBySeverity,
    topBlockingIssues: blocking.slice(0, 10),
    topWarningIssues: warnings.slice(0, 10),
    experimentStatus,
    productOpsStatus,
    operationalStatus,
    qaStatus,
  };
}

// ============================================================================
// Component Score Calculations
// ============================================================================

function calculateProductQualityScore(signals: ProductGovernanceSignal[]): number {
  const productOpsSignals = signals.filter(
    s => s.signalType === ProductGovernanceSignalType.PRODUCT_OPS_CASE
  );

  if (productOpsSignals.length === 0) {
    return 100;
  }

  const criticalCount = productOpsSignals.filter(
    s => s.severity === ProductGovernanceSeverity.CRITICAL
  ).length;
  const highCount = productOpsSignals.filter(
    s => s.severity === ProductGovernanceSeverity.HIGH
  ).length;
  const mediumCount = productOpsSignals.filter(
    s => s.severity === ProductGovernanceSeverity.MEDIUM
  ).length;

  // Deduct points based on severity
  let score = 100;
  score -= criticalCount * 30;
  score -= highCount * 15;
  score -= mediumCount * 5;

  return Math.max(0, score);
}

function calculateExperimentsScore(signals: ProductGovernanceSignal[]): number {
  const experimentSignals = signals.filter(
    s => s.signalType === ProductGovernanceSignalType.EXPERIMENT_GUARDRAIL ||
         s.signalType === ProductGovernanceSignalType.TUNING_CHANGE
  );

  if (experimentSignals.length === 0) {
    return 100;
  }

  const criticalCount = experimentSignals.filter(
    s => s.severity === ProductGovernanceSeverity.CRITICAL
  ).length;
  const highCount = experimentSignals.filter(
    s => s.severity === ProductGovernanceSeverity.HIGH
  ).length;

  let score = 100;
  score -= criticalCount * 25;
  score -= highCount * 15;

  return Math.max(0, score);
}

function calculateOperationsScore(signals: ProductGovernanceSignal[]): number {
  const operationalSignals = signals.filter(
    s => s.signalType === ProductGovernanceSignalType.OPERATIONAL_ISSUE ||
         s.signalType === ProductGovernanceSignalType.RANKING_QUALITY ||
         s.signalType === ProductGovernanceSignalType.NO_MATCH_SPIKE
  );

  if (operationalSignals.length === 0) {
    return 100;
  }

  const criticalCount = operationalSignals.filter(
    s => s.severity === ProductGovernanceSeverity.CRITICAL
  ).length;
  const highCount = operationalSignals.filter(
    s => s.severity === ProductGovernanceSeverity.HIGH
  ).length;

  let score = 100;
  score -= criticalCount * 25;
  score -= highCount * 15;

  return Math.max(0, score);
}

function calculateQaScore(signals: ProductGovernanceSignal[]): number {
  const qaSignals = signals.filter(
    s => s.signalType === ProductGovernanceSignalType.QA_REGRESSION ||
         s.signalType === ProductGovernanceSignalType.STAGING_FAILURE
  );

  if (qaSignals.length === 0) {
    return 100;
  }

  const criticalCount = qaSignals.filter(
    s => s.severity === ProductGovernanceSeverity.CRITICAL
  ).length;
  const highCount = qaSignals.filter(
    s => s.severity === ProductGovernanceSeverity.HIGH
  ).length;

  let score = 100;
  score -= criticalCount * 30;
  score -= highCount * 15;

  return Math.max(0, score);
}

function calculateReleaseReadinessScore(
  blocking: ReleaseBlockingIssue[],
  warnings: ReleaseWarningIssue[]
): number {
  if (blocking.length === 0 && warnings.length === 0) {
    return 100;
  }

  let score = 100;
  score -= blocking.length * 20;
  score -= warnings.length * 5;

  return Math.max(0, score);
}

// ============================================================================
// Helper Functions
// ============================================================================

function determineReleaseStatus(
  blocking: ReleaseBlockingIssue[],
  warnings: ReleaseWarningIssue[],
  score: number
): ReleaseReadinessStatus {
  // Check for rollback recommendation
  const hasCriticalUnresolved = blocking.some(
    b => b.severity === ProductGovernanceSeverity.CRITICAL
  );
  if (hasCriticalUnresolved && blocking.length > 3) {
    return ReleaseReadinessStatus.ROLLBACK_RECOMMENDED;
  }

  // Check if blocked
  if (isReleaseBlocked(blocking, warnings)) {
    return ReleaseReadinessStatus.BLOCKED;
  }

  // Check if conditionally ready (has warnings)
  if (warnings.length > 0) {
    return ReleaseReadinessStatus.CONDITIONALLY_READY;
  }

  // Check score thresholds
  if (score >= READINESS_SCORE_CONFIG.GOOD_THRESHOLD) {
    return ReleaseReadinessStatus.READY;
  }

  if (score >= READINESS_SCORE_CONFIG.ACCEPTABLE_THRESHOLD) {
    return ReleaseReadinessStatus.CONDITIONALLY_READY;
  }

  return ReleaseReadinessStatus.NEEDS_REVIEW;
}

function isBlockingIssue(signal: ProductGovernanceSignal): boolean {
  // Critical severity always blocks
  if (signal.severity === ProductGovernanceSeverity.CRITICAL) {
    return true;
  }

  // High severity blocks for certain signal types
  if (signal.severity === ProductGovernanceSeverity.HIGH) {
    const blockingTypes = [
      ProductGovernanceSignalType.PRODUCT_OPS_CASE,
      ProductGovernanceSignalType.EXPERIMENT_GUARDRAIL,
      ProductGovernanceSignalType.STAGING_FAILURE,
      ProductGovernanceSignalType.QA_REGRESSION,
    ];
    return blockingTypes.includes(signal.signalType);
  }

  return false;
}

function signalToIssue(signal: ProductGovernanceSignal): ReleaseBlockingIssue | ReleaseWarningIssue {
  const base = {
    id: signal.id,
    signalType: signal.signalType,
    signalSource: signal.signalSource,
    severity: signal.severity,
    targetEntityType: signal.targetEntityType || 'unknown',
    targetEntityId: signal.targetEntityId || 'unknown',
    title: extractTitle(signal),
    description: extractDescription(signal),
    createdAt: signal.createdAt,
    payload: signal.payload,
  };

  if (isBlockingIssue(signal)) {
    return base as ReleaseBlockingIssue;
  }
  return base as ReleaseWarningIssue;
}

function extractTitle(signal: ProductGovernanceSignal): string {
  const payload = signal.payload as Record<string, unknown>;

  switch (signal.signalType) {
    case ProductGovernanceSignalType.PRODUCT_OPS_CASE:
      return `Product Ops Case: ${payload.caseKey || signal.targetEntityId}`;
    case ProductGovernanceSignalType.EXPERIMENT_GUARDRAIL:
      return `Guardrail Breach: ${payload.experimentName || signal.targetEntityId}`;
    case ProductGovernanceSignalType.QA_REGRESSION:
      return `QA Regression: ${payload.testName || signal.targetEntityId}`;
    case ProductGovernanceSignalType.OPERATIONAL_ISSUE:
      return `Operational Issue: ${payload.issueType || signal.targetEntityId}`;
    case ProductGovernanceSignalType.STAGING_FAILURE:
      return `Staging Failure: ${payload.failureType || signal.targetEntityId}`;
    case ProductGovernanceSignalType.NO_MATCH_SPIKE:
      return `No-Match Spike: ${payload.spikePercentage}% increase`;
    case ProductGovernanceSignalType.RANKING_QUALITY:
      return `Ranking Quality: ${payload.metric}`;
    case ProductGovernanceSignalType.TUNING_CHANGE:
      return `Tuning Change: ${payload.tuningName || signal.targetEntityId}`;
    default:
      return `Signal: ${signal.signalType}`;
  }
}

function extractDescription(signal: ProductGovernanceSignal): string {
  const payload = signal.payload as Record<string, unknown>;
  return `Severity: ${signal.severity}, Source: ${signal.signalSource}`;
}

function buildExperimentSummary(signals: ProductGovernanceSignal[]): ExperimentGovernanceSummary {
  const guardrailBreaches = signals.filter(
    s => s.signalType === ProductGovernanceSignalType.EXPERIMENT_GUARDRAIL &&
         s.severity !== ProductGovernanceSeverity.LOW
  );
  const unsafeTuning = signals.filter(
    s => s.signalType === ProductGovernanceSignalType.TUNING_CHANGE &&
         (s.severity === ProductGovernanceSeverity.CRITICAL || s.severity === ProductGovernanceSeverity.HIGH)
  );

  return {
    activeGuardrailBreaches: guardrailBreaches.length,
    unsafeTuningChanges: unsafeTuning.length,
    experimentsNeedingReview: guardrailBreaches.length + unsafeTuning.length,
  };
}

function buildProductOpsSummary(signals: ProductGovernanceSignal[]): ProductOpsGovernanceSummary {
  const productOpsSignals = signals.filter(
    s => s.signalType === ProductGovernanceSignalType.PRODUCT_OPS_CASE
  );

  const highSeverity = productOpsSignals.filter(
    s => s.severity === ProductGovernanceSeverity.CRITICAL || s.severity === ProductGovernanceSeverity.HIGH
  );

  return {
    openHighSeverityCases: highSeverity.length,
    unresolvedRemediations: highSeverity.length,
    staleCasesCount: 0, // Would need to check signal payload for stale status
  };
}

function buildOperationalSummary(signals: ProductGovernanceSignal[]): OperationalGovernanceSummary {
  const operationalSignals = signals.filter(
    s => s.signalType === ProductGovernanceSignalType.OPERATIONAL_ISSUE
  );

  const rankingSignals = signals.filter(
    s => s.signalType === ProductGovernanceSignalType.RANKING_QUALITY
  );

  return {
    errorRateAnomalies: operationalSignals.length,
    latencyDegradations: operationalSignals.filter(s => (s.payload as Record<string, unknown>).latencyP99).length,
    rankingQualityIssues: rankingSignals.length,
  };
}

function buildQaSummary(signals: ProductGovernanceSignal[]): QaGovernanceSummary {
  const stagingFailures = signals.filter(
    s => s.signalType === ProductGovernanceSignalType.STAGING_FAILURE
  );
  const regressions = signals.filter(
    s => s.signalType === ProductGovernanceSignalType.QA_REGRESSION
  );

  return {
    stagingFailures: stagingFailures.length,
    regressionIssues: regressions.length,
    verificationGaps: stagingFailures.filter(s => s.severity === ProductGovernanceSeverity.CRITICAL).length,
  };
}
