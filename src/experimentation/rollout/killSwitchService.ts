/**
 * Kill Switch Service
 */

import { ExperimentDefinition, ExperimentStatus } from '../types/index.js';

/**
 * Disable experiment immediately
 */
export async function disableExperimentImmediately(
  experiment: ExperimentDefinition,
  reason?: string
): Promise<ExperimentDefinition> {
  console.log(`[KillSwitch] Disabling experiment ${experiment.experimentKey}: ${reason || 'No reason'}`);

  return {
    ...experiment,
    status: ExperimentStatus.DISABLED,
    rolloutPercentage: 0,
  };
}

/**
 * Disable tuning control immediately
 */
export async function disableTuningControlImmediately(
  controlKey: string,
  reason?: string
): Promise<{ key: string; disabled: boolean; reason: string }> {
  console.log(`[KillSwitch] Disabling tuning control ${controlKey}: ${reason || 'No reason'}`);

  return {
    key: controlKey,
    disabled: true,
    reason: reason || 'Kill switch triggered',
  };
}

/**
 * Evaluate if kill switch is needed
 */
export function evaluateKillSwitchNeed(metrics: {
  errorRate?: number;
  noMatchRate?: number;
  latency?: number;
}): { needed: boolean; reason?: string } {
  if (metrics.errorRate && metrics.errorRate > 0.05) {
    return { needed: true, reason: 'Error rate above 5%' };
  }

  if (metrics.noMatchRate && metrics.noMatchRate > 0.3) {
    return { needed: true, reason: 'No-match rate above 30%' };
  }

  if (metrics.latency && metrics.latency > 5000) {
    return { needed: true, reason: 'Latency above 5s' };
  }

  return { needed: false };
}
