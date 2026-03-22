/**
 * Experimentation Governance Integration
 *
 * Integrates experiments and tuning controls with governance signals.
 */

import {
  ProductGovernanceSignal,
  ProductGovernanceSignalType,
  ProductGovernanceSeverity,
} from '../types';
import { buildGovernanceSignalFromExperimentGuardrail, buildGovernanceSignalFromTuningChange } from '../signals/governanceSignalBuilder';

export interface ExperimentGuardrailBreach {
  experimentId: string;
  experimentName: string;
  guardrailType: string;
  breachSeverity: string;
  affectedUsers: number;
  metric: string;
  currentValue: number;
  threshold: number;
}

export interface TuningChange {
  tuningId: string;
  tuningName: string;
  changeType: string;
  riskLevel: string;
  affectedSystems: string[];
  createdAt: Date;
}

/**
 * Collect governance signals from experiments
 */
export async function collectExperimentGovernanceSignals(): Promise<ProductGovernanceSignal[]> {
  const signals: ProductGovernanceSignal[] = [];

  // Fetch guardrail breaches
  const breaches = await fetchActiveGuardrailBreaches();

  for (const breach of breaches) {
    const signal = buildGovernanceSignalFromExperimentGuardrail(breach);
    signals.push({
      id: crypto.randomUUID(),
      ...signal,
      createdAt: new Date(),
    });
  }

  // Fetch unsafe tuning changes
  const tuningChanges = await fetchUnsafeTuningChanges();

  for (const tuning of tuningChanges) {
    const signal = buildGovernanceSignalFromTuningChange(tuning);
    signals.push({
      id: crypto.randomUUID(),
      ...signal,
      createdAt: new Date(),
    });
  }

  return signals;
}

/**
 * Collect guardrail breaches for governance
 */
export async function collectGuardrailBreachesForGovernance(): Promise<ProductGovernanceSignal[]> {
  const signals: ProductGovernanceSignal[] = [];

  const breaches = await fetchActiveGuardrailBreaches();

  for (const breach of breaches) {
    const signal = buildGovernanceSignalFromExperimentGuardrail(breach);
    signals.push({
      id: crypto.randomUUID(),
      ...signal,
      createdAt: new Date(),
    });
  }

  return signals;
}

/**
 * Collect unsafe tuning signals
 */
export async function collectUnsafeTuningSignals(): Promise<ProductGovernanceSignal[]> {
  const signals: ProductGovernanceSignal[] = [];

  const tuningChanges = await fetchUnsafeTuningChanges();

  for (const tuning of tuningChanges) {
    const signal = buildGovernanceSignalFromTuningChange(tuning);
    signals.push({
      id: crypto.randomUUID(),
      ...signal,
      createdAt: new Date(),
    });
  }

  return signals;
}

/**
 * Get experiment governance summary
 */
export async function getExperimentGovernanceSummary(): Promise<{
  activeExperiments: number;
  activeGuardrailBreaches: number;
  unsafeTuningChanges: number;
  experimentsNeedingReview: number;
}> {
  // In real implementation, aggregate from experimentation system
  return {
    activeExperiments: 0,
    activeGuardrailBreaches: 0,
    unsafeTuningChanges: 0,
    experimentsNeedingReview: 0,
  };
}

// ============================================================================
// Simulated data fetching
// ============================================================================

async function fetchActiveGuardrailBreaches(): Promise<ExperimentGuardrailBreach[]> {
  // In real implementation, query experimentation system
  return [];
}

async function fetchUnsafeTuningChanges(): Promise<TuningChange[]> {
  // In real implementation, query tuning controls
  return [];
}
