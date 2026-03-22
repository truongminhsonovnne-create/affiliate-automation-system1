/**
 * Rollout Checkpoint Evaluator
 *
 * Evaluates checkpoints during rollout execution.
 */

import type {
  PlatformRolloutCheckpointSignal,
  PlatformRolloutGuardrailSummary,
  PlatformRolloutCheckpointType,
} from '../types/index.js';
import { CHECKPOINT_THRESHOLDS, GUARDRAIL_THRESHOLDS } from '../constants.js';
import logger from '../../../utils/logger.js';

/**
 * Evaluate a single checkpoint
 */
export async function evaluateRolloutCheckpoint(
  checkpointType: PlatformRolloutCheckpointType,
  signals: Record<string, unknown>
): Promise<PlatformRolloutCheckpointSignal> {
  logger.info({ msg: 'Evaluating checkpoint', checkpointType });

  let score: number | null = null;
  let status: 'pass' | 'fail' | 'warning' | 'unknown' = 'unknown';
  const blockers: string[] = [];
  const warnings: string[] = [];

  switch (checkpointType) {
    case 'support_state_stability':
      ({ score, status, blockers, warnings } = await evaluateSupportStateStability(signals));
      break;
    case 'resolution_quality':
      ({ score, status, blockers, warnings } = await evaluateResolutionQuality(signals));
      break;
    case 'no_match_regression':
      ({ score, status, blockers, warnings } = await evaluateNoMatchRegression(signals));
      break;
    case 'latency_quality':
      ({ score, status, blockers, warnings } = await evaluateLatencyQuality(signals));
      break;
    case 'error_quality':
      ({ score, status, blockers, warnings } = await evaluateErrorQuality(signals));
      break;
    case 'commercial_impact':
      ({ score, status, blockers, warnings } = await evaluateCommercialImpact(signals));
      break;
    case 'governance_clearance':
      ({ score, status, blockers, warnings } = await evaluateGovernanceClearance(signals));
      break;
    case 'ops_readiness':
      ({ score, status, blockers, warnings } = await evaluateOpsReadiness(signals));
      break;
    case 'usability_assessment':
      ({ score, status, blockers, warnings } = await evaluateUsabilityAssessment(signals));
      break;
  }

  return {
    checkpointType,
    score,
    status,
    blockers,
    warnings,
  };
}

/**
 * Evaluate stage checkpoint set
 */
export async function evaluateStageCheckpointSet(
  stageKey: string,
  signals: Record<string, unknown>
): Promise<PlatformRolloutGuardrailSummary> {
  const checkpointTypes: PlatformRolloutCheckpointType[] = [
    'support_state_stability',
    'resolution_quality',
    'no_match_regression',
    'latency_quality',
    'error_quality',
    'governance_clearance',
  ];

  const checkpointSignals: PlatformRolloutCheckpointSignal[] = [];

  for (const checkpointType of checkpointTypes) {
    const signal = await evaluateRolloutCheckpoint(checkpointType, signals);
    checkpointSignals.push(signal);
  }

  // Calculate overall score
  const scores = checkpointSignals.filter(s => s.score !== null).map(s => s.score as number);
  const overallScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  // Determine if can proceed
  const failedCritical = checkpointSignals.filter(
    s => s.status === 'fail' && isCriticalCheckpoint(s.checkpointType)
  );
  const canProceed = failedCritical.length === 0 && overallScore !== null && overallScore >= GUARDRAIL_THRESHOLDS.CHECKPOINT_PASS_MIN_SCORE;

  // Collect blockers and warnings
  const blockers = checkpointSignals.flatMap(s => s.blockers);
  const warnings = checkpointSignals.flatMap(s => s.warnings);

  return {
    overallScore,
    checkpointSignals,
    canProceed,
    blockers,
    warnings,
  };
}

/**
 * Build checkpoint decision
 */
export function buildCheckpointDecision(
  guardrailSummary: PlatformRolloutGuardrailSummary
): {
  decision: 'proceed' | 'hold' | 'rollback';
  rationale: string;
} {
  if (!guardrailSummary.canProceed) {
    if (guardrailSummary.blockers.length > 3) {
      return {
        decision: 'rollback',
        rationale: `Multiple critical checkpoints failed (${guardrailSummary.blockers.length} blockers)`,
      };
    }
    return {
      decision: 'hold',
      rationale: `Checkpoint failures prevent proceeding: ${guardrailSummary.blockers.join(', ')}`,
    };
  }

  return {
    decision: 'proceed',
    rationale: `All critical checkpoints passed (score: ${guardrailSummary.overallScore}%)`,
  };
}

/**
 * Check if stage is allowed to proceed
 */
export function isStageAllowedToProceed(
  guardrailSummary: PlatformRolloutGuardrailSummary,
  stageKey: string
): boolean {
  // Critical checkpoints must pass
  const criticalCheckpoints = guardrailSummary.checkpointSignals.filter(
    s => isCriticalCheckpoint(s.checkpointType)
  );
  const failedCritical = criticalCheckpoints.filter(s => s.status === 'fail');
  if (failedCritical.length > 0) {
    return false;
  }

  // Overall score must meet threshold
  if (guardrailSummary.overallScore !== null && guardrailSummary.overallScore < GUARDRAIL_THRESHOLDS.CHECKPOINT_PASS_MIN_SCORE) {
    return false;
  }

  return true;
}

// =============================================================================
// Private Evaluation Functions
// =============================================================================

async function evaluateSupportStateStability(
  signals: Record<string, unknown>
): Promise<{ score: number | null; status: 'pass' | 'fail' | 'warning' | 'unknown'; blockers: string[]; warnings: string[] }> {
  const stabilityScore = signals.stabilityScore as number | undefined;
  const failureRate = signals.failureRate as number | undefined;

  if (stabilityScore === undefined) {
    return { score: null, status: 'unknown', blockers: [], warnings: ['No stability data available'] };
  }

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (stabilityScore < CHECKPOINT_THRESHOLDS.SUPPORT_STATE_STABILITY_MIN) {
    blockers.push(`Support state stability below threshold: ${stabilityScore}%`);
  }

  if (failureRate !== undefined && failureRate > 5) {
    blockers.push(`High failure rate: ${failureRate}%`);
  }

  const score = stabilityScore;
  const status = blockers.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass';

  return { score, status, blockers, warnings };
}

async function evaluateResolutionQuality(
  signals: Record<string, unknown>
): Promise<{ score: number | null; status: 'pass' | 'fail' | 'warning' | 'unknown'; blockers: string[]; warnings: string[] }> {
  const qualityScore = signals.qualityScore as number | undefined;
  const errorRate = signals.errorRate as number | undefined;

  if (qualityScore === undefined) {
    return { score: null, status: 'unknown', blockers: [], warnings: ['No quality data available'] };
  }

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (qualityScore < CHECKPOINT_THRESHOLDS.RESOLUTION_QUALITY_MIN) {
    blockers.push(`Resolution quality below threshold: ${qualityScore}%`);
  }

  if (errorRate !== undefined && errorRate > CHECKPOINT_THRESHOLDS.RESOLUTION_ERROR_RATE_MAX) {
    blockers.push(`Error rate too high: ${errorRate}%`);
  }

  const score = qualityScore;
  const status = blockers.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass';

  return { score, status, blockers, warnings };
}

async function evaluateNoMatchRegression(
  signals: Record<string, unknown>
): Promise<{ score: number | null; status: 'pass' | 'fail' | 'warning' | 'unknown'; blockers: string[]; warnings: string[] }> {
  const noMatchRate = signals.noMatchRate as number | undefined;
  const noMatchIncrease = signals.noMatchIncrease as number | undefined;

  if (noMatchRate === undefined) {
    return { score: null, status: 'unknown', blockers: [], warnings: ['No no-match data available'] };
  }

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (noMatchRate > CHECKPOINT_THRESHOLDS.NO_MATCH_REGRESSION_MAX) {
    blockers.push(`No-match rate too high: ${noMatchRate}%`);
  }

  if (noMatchIncrease !== undefined && noMatchIncrease > CHECKPOINT_THRESHOLDS.NO_MATCH_INCREASE_THRESHOLD) {
    warnings.push(`No-match rate increasing: +${noMatchIncrease}%`);
  }

  const score = Math.max(0, 100 - (noMatchRate || 0) * 5);
  const status = blockers.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass';

  return { score, status, blockers, warnings };
}

async function evaluateLatencyQuality(
  signals: Record<string, unknown>
): Promise<{ score: number | null; status: 'pass' | 'fail' | 'warning' | 'unknown'; blockers: string[]; warnings: string[] }> {
  const p50Latency = signals.p50Latency as number | undefined;
  const p99Latency = signals.p99Latency as number | undefined;

  if (p50Latency === undefined && p99Latency === undefined) {
    return { score: null, status: 'unknown', blockers: [], warnings: ['No latency data available'] };
  }

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (p50Latency !== undefined && p50Latency > CHECKPOINT_THRESHOLDS.LATENCY_P50_MAX_MS) {
    blockers.push(`P50 latency too high: ${p50Latency}ms`);
  }

  if (p99Latency !== undefined && p99Latency > CHECKPOINT_THRESHOLDS.LATENCY_P99_MAX_MS) {
    blockers.push(`P99 latency too high: ${p99Latency}ms`);
  }

  // Calculate score based on latency
  let score = 100;
  if (p50Latency !== undefined) {
    score -= Math.min(30, (p50Latency / CHECKPOINT_THRESHOLDS.LATENCY_P50_MAX_MS) * 30);
  }
  if (p99Latency !== undefined) {
    score -= Math.min(20, (p99Latency / CHECKPOINT_THRESHOLDS.LATENCY_P99_MAX_MS) * 20);
  }
  score = Math.max(0, Math.round(score));

  const status = blockers.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass';

  return { score, status, blockers, warnings };
}

async function evaluateErrorQuality(
  signals: Record<string, unknown>
): Promise<{ score: number | null; status: 'pass' | 'fail' | 'warning' | 'unknown'; blockers: string[]; warnings: string[] }> {
  const errorRate = signals.errorRate as number | undefined;
  const errorIncrease = signals.errorIncrease as number | undefined;

  if (errorRate === undefined) {
    return { score: null, status: 'unknown', blockers: [], warnings: ['No error data available'] };
  }

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (errorRate > CHECKPOINT_THRESHOLDS.ERROR_RATE_MAX) {
    blockers.push(`Error rate too high: ${errorRate}%`);
  }

  if (errorIncrease !== undefined && errorIncrease > CHECKPOINT_THRESHOLDS.ERROR_INCREASE_THRESHOLD_PCT) {
    warnings.push(`Error rate increasing: +${errorIncrease}%`);
  }

  const score = Math.max(0, 100 - errorRate * 10);
  const status = blockers.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass';

  return { score, status, blockers, warnings };
}

async function evaluateCommercialImpact(
  signals: Record<string, unknown>
): Promise<{ score: number | null; status: 'pass' | 'fail' | 'warning' | 'unknown'; blockers: string[]; warnings: string[] }> {
  const successRate = signals.successRate as number | undefined;
  const qualityScore = signals.qualityScore as number | undefined;

  if (successRate === undefined && qualityScore === undefined) {
    return { score: null, status: 'unknown', blockers: [], warnings: ['No commercial data available'] };
  }

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (successRate !== undefined && successRate < CHECKPOINT_THRESHOLDS.COMMERCIAL_SUCCESS_RATE_MIN) {
    blockers.push(`Commercial success rate too low: ${successRate}%`);
  }

  if (qualityScore !== undefined && qualityScore < CHECKPOINT_THRESHOLDS.COMMERCIAL_QUALITY_MIN) {
    warnings.push(`Commercial quality below threshold: ${qualityScore}%`);
  }

  const score = successRate ?? qualityScore ?? null;
  const status = blockers.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass';

  return { score, status, blockers, warnings };
}

async function evaluateGovernanceClearance(
  signals: Record<string, unknown>
): Promise<{ score: number | null; status: 'pass' | 'fail' | 'warning' | 'unknown'; blockers: string[]; warnings: string[] }> {
  const governanceApproved = signals.governanceApproved as boolean | undefined;
  const blockerCount = signals.blockerCount as number | undefined;

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (governanceApproved === false) {
    blockers.push('Governance not approved');
  }

  if (blockerCount !== undefined && blockerCount > CHECKPOINT_THRESHOLDS.GOVERNANCE_BLOCKERS_MAX) {
    blockers.push(`${blockerCount} governance blocker(s)`);
  }

  let score: number | null = null;
  if (governanceApproved !== undefined) {
    score = governanceApproved ? 100 : 0;
  }

  const status = blockers.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : (score === 100 ? 'pass' : 'unknown');

  return { score, status, blockers, warnings };
}

async function evaluateOpsReadiness(
  signals: Record<string, unknown>
): Promise<{ score: number | null; status: 'pass' | 'fail' | 'warning' | 'unknown'; blockers: string[]; warnings: string[] }> {
  const incidentCount = signals.incidentCount as number | undefined;
  const escalationCount = signals.escalationCount as number | undefined;

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (incidentCount !== undefined && incidentCount > CHECKPOINT_THRESHOLDS.OPS_INCIDENT_THRESHOLD) {
    blockers.push(`Too many incidents: ${incidentCount}`);
  }

  if (escalationCount !== undefined && escalationCount > CHECKPOINT_THRESHOLDS.OPS_PAGER_DUTY_ESCALATIONS_MAX) {
    warnings.push(`High escalation count: ${escalationCount}`);
  }

  let score = 100;
  if (incidentCount !== undefined) {
    score -= Math.min(50, incidentCount * 10);
  }
  if (escalationCount !== undefined) {
    score -= Math.min(20, escalationCount * 5);
  }
  score = Math.max(0, score);

  const status = blockers.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass';

  return { score, status, blockers, warnings };
}

async function evaluateUsabilityAssessment(
  signals: Record<string, unknown>
): Promise<{ score: number | null; status: 'pass' | 'fail' | 'warning' | 'unknown'; blockers: string[]; warnings: string[] }> {
  const usefulnessScore = signals.usefulnessScore as number | undefined;
  const userFeedback = signals.userFeedback as string | undefined;

  if (usefulnessScore === undefined) {
    return { score: null, status: 'unknown', blockers: [], warnings: ['No usability data available'] };
  }

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (usefulnessScore < 60) {
    blockers.push(`Usefulness score too low: ${usefulnessScore}%`);
  }

  if (userFeedback === 'negative') {
    warnings.push('User feedback is negative');
  }

  const score = usefulnessScore;
  const status = blockers.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass';

  return { score, status, blockers, warnings };
}

function isCriticalCheckpoint(checkpointType: PlatformRolloutCheckpointType): boolean {
  const critical = [
    'support_state_stability',
    'governance_clearance',
    'resolution_quality',
  ];
  return critical.includes(checkpointType);
}
