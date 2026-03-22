/**
 * Rollout Policy
 */

import { ExperimentDefinition, ExperimentStatus } from '../types/index.js';
import { ROLLOUT_CONFIG, ENVIRONMENT_CONFIG } from '../constants/index.js';

/**
 * Evaluate experiment rollout
 */
export function evaluateExperimentRollout(
  experiment: ExperimentDefinition,
  environment: string
): { allowed: boolean; percentage: number; reason?: string } {
  // Check status
  if (experiment.status !== ExperimentStatus.RUNNING) {
    return {
      allowed: false,
      percentage: 0,
      reason: `Experiment status is ${experiment.status}`,
    };
  }

  // Check environment-specific rollout
  const envPercentage = ENVIRONMENT_CONFIG.ROLLOUT_BY_ENVIRONMENT[environment] ?? 0;
  if (envPercentage === 0) {
    return {
      allowed: false,
      percentage: 0,
      reason: `Rollout disabled for ${environment} environment`,
    };
  }

  // Use minimum of experiment rollout and environment limit
  const allowedPercentage = Math.min(experiment.rolloutPercentage, envPercentage);

  return {
    allowed: allowedPercentage > 0,
    percentage: allowedPercentage,
  };
}

/**
 * Check if experiment is allowed to run
 */
export function isExperimentAllowedToRun(
  experiment: ExperimentDefinition,
  environment: string
): boolean {
  const evaluation = evaluateExperimentRollout(experiment, environment);
  return evaluation.allowed;
}

/**
 * Build rollout decision
 */
export function buildRolloutDecision(
  experiment: ExperimentDefinition,
  environment: string
): {
  shouldRollout: boolean;
  rolloutPercentage: number;
  reason: string;
} {
  const evaluation = evaluateExperimentRollout(experiment, environment);

  return {
    shouldRollout: evaluation.allowed,
    rolloutPercentage: evaluation.percentage,
    reason: evaluation.reason || 'Rollout approved',
  };
}

/**
 * Enforce rollout policy
 */
export function enforceRolloutPolicy(
  experiment: ExperimentDefinition,
  environment: string
): ExperimentDefinition {
  const decision = buildRolloutDecision(experiment, environment);

  if (!decision.shouldRollout) {
    return {
      ...experiment,
      rolloutPercentage: 0,
      status: ExperimentStatus.PAUSED,
    };
  }

  return {
    ...experiment,
    rolloutPercentage: decision.rolloutPercentage,
  };
}
