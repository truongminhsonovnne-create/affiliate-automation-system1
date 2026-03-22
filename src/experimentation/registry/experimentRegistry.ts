/**
 * Experiment Registry
 *
 * Loads and resolves active experiments
 */

import { ExperimentDefinition, ExperimentStatus, ExperimentTargetSurface } from '../types/index.js';

// In-memory registry (replace with DB in production)
const experimentCache = new Map<string, ExperimentDefinition>();

/**
 * Get active experiments for a surface
 */
export async function getActiveExperiments(surface?: ExperimentTargetSurface): Promise<ExperimentDefinition[]> {
  const all = Array.from(experimentCache.values());

  return all.filter(exp => {
    if (exp.status !== ExperimentStatus.RUNNING) return false;
    if (surface && exp.targetSurface !== surface) return false;
    return true;
  });
}

/**
 * Get experiment by key
 */
export async function getExperimentByKey(key: string): Promise<ExperimentDefinition | null> {
  return experimentCache.get(key) || null;
}

/**
 * Resolve experiments for a surface
 */
export async function resolveExperimentsForSurface(surface: ExperimentTargetSurface): Promise<ExperimentDefinition[]> {
  return getActiveExperiments(surface);
}

/**
 * Register experiment in registry
 */
export async function registerExperiment(experiment: ExperimentDefinition): Promise<void> {
  experimentCache.set(experiment.experimentKey, experiment);
}

/**
 * Unregister experiment
 */
export async function unregisterExperiment(key: string): Promise<void> {
  experimentCache.delete(key);
}

/**
 * Validate experiment registry
 */
export function validateExperimentRegistry(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const exp of experimentCache.values()) {
    if (!exp.experimentKey) errors.push('Missing experiment key');
    if (!exp.experimentName) errors.push('Missing experiment name');
    if (!exp.variantDefinitions || exp.variantDefinitions.length < 2) {
      errors.push(`Experiment ${exp.experimentKey} needs at least 2 variants`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Clear registry (for testing)
 */
export function clearRegistry(): void {
  experimentCache.clear();
}
