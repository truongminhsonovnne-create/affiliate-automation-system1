/**
 * Outcome Recorder
 */

import { randomUUID } from 'crypto';
import { ExperimentOutcome, OutcomeType } from '../types/index.js';

// In-memory storage (replace with DB)
const outcomes: ExperimentOutcome[] = [];

/**
 * Record experiment outcome
 */
export async function recordExperimentOutcome(params: {
  experimentId: string;
  variantKey: string;
  subjectKey?: string;
  outcomeType: OutcomeType;
  outcomeValue?: number;
  outcomeContext?: Record<string, unknown>;
}): Promise<ExperimentOutcome> {
  const outcome: ExperimentOutcome = {
    id: randomUUID(),
    experimentId: params.experimentId,
    variantKey: params.variantKey,
    subjectKey: params.subjectKey,
    outcomeType: params.outcomeType,
    outcomeValue: params.outcomeValue,
    outcomeContext: params.outcomeContext,
    createdAt: new Date(),
  };

  outcomes.push(outcome);
  return outcome;
}

/**
 * Record copy success outcome
 */
export async function recordCopySuccessForExperiment(params: {
  experimentId: string;
  variantKey: string;
  subjectKey?: string;
}): Promise<ExperimentOutcome> {
  return recordExperimentOutcome({
    ...params,
    outcomeType: OutcomeType.COPY_SUCCESS,
    outcomeValue: 1,
  });
}

/**
 * Record copy failure outcome
 */
export async function recordCopyFailureForExperiment(params: {
  experimentId: string;
  variantKey: string;
  subjectKey?: string;
}): Promise<ExperimentOutcome> {
  return recordExperimentOutcome({
    ...params,
    outcomeType: OutcomeType.COPY_FAILURE,
    outcomeValue: 0,
  });
}

/**
 * Record open Shopee outcome
 */
export async function recordOpenShopeeForExperiment(params: {
  experimentId: string;
  variantKey: string;
  subjectKey?: string;
}): Promise<ExperimentOutcome> {
  return recordExperimentOutcome({
    ...params,
    outcomeType: OutcomeType.OPEN_SHOPEE,
    outcomeValue: 1,
  });
}

/**
 * Record no-match outcome
 */
export async function recordNoMatchForExperiment(params: {
  experimentId: string;
  variantKey?: string;
  subjectKey?: string;
}): Promise<ExperimentOutcome> {
  // If variantKey is not provided, use 'control' as default
  const variantKey = params.variantKey || 'control';
  return recordExperimentOutcome({
    ...params,
    variantKey,
    outcomeType: OutcomeType.NO_MATCH,
    outcomeValue: 1,
  });
}

/**
 * Record latency outcome
 */
export async function recordLatencyForExperiment(params: {
  experimentId: string;
  variantKey: string;
  latencyMs: number;
}): Promise<ExperimentOutcome> {
  return recordExperimentOutcome({
    experimentId: params.experimentId,
    variantKey: params.variantKey,
    outcomeType: OutcomeType.RESOLUTION_ERROR,
    outcomeValue: params.latencyMs,
    outcomeContext: { isLatency: true },
  });
}

/**
 * Get outcomes for experiment
 */
export async function getOutcomesForExperiment(experimentId: string): Promise<ExperimentOutcome[]> {
  return outcomes.filter(o => o.experimentId === experimentId);
}

/**
 * Get outcomes by variant
 */
export async function getOutcomesByVariant(experimentId: string, variantKey: string): Promise<ExperimentOutcome[]> {
  return outcomes.filter(o => o.experimentId === experimentId && o.variantKey === variantKey);
}

/**
 * Clear outcomes (for testing)
 */
export function clearOutcomes(): void {
  outcomes.length = 0;
}
