/**
 * Tuning Control Evaluator
 */

import { TuningControlDefinition } from '../types/index.js';
import { resolveTuningControlValue } from './tuningControlRegistry.js';

/**
 * Evaluate tuning control for current context
 */
export async function evaluateTuningControl(
  key: string,
  environment: string
): Promise<{ value: unknown; evaluated: boolean }> {
  const result = await resolveTuningControlValue(key, environment);

  if (!result.found) {
    return { value: null, evaluated: false };
  }

  return { value: result.value, evaluated: true };
}

/**
 * Apply tuning controls to ranking context
 */
export async function applyTuningControlsToRankingContext(
  context: Record<string, unknown>,
  environment: string
): Promise<Record<string, unknown>> {
  const result = { ...context };

  // Apply known ranking controls
  const rankingControls = [
    'ranking_exact_match_weight',
    'ranking_discount_weight',
    'ranking_confidence_threshold',
    'candidate_count_limit',
  ];

  for (const key of rankingControls) {
    const control = await evaluateTuningControl(key, environment);
    if (control.evaluated) {
      result[key] = control.value;
    }
  }

  return result;
}

/**
 * Apply tuning controls to presentation context
 */
export async function applyTuningControlsToPresentationContext(
  context: Record<string, unknown>,
  environment: string
): Promise<Record<string, unknown>> {
  const result = { ...context };

  const presentationControls = [
    'presentation_verbosity',
    'show_discount_percentage',
    'show_original_price',
  ];

  for (const key of presentationControls) {
    const control = await evaluateTuningControl(key, environment);
    if (control.evaluated) {
      result[key] = control.value;
    }
  }

  return result;
}

/**
 * Apply tuning controls to no-match context
 */
export async function applyTuningControlsToNoMatchContext(
  context: Record<string, unknown>,
  environment: string
): Promise<Record<string, unknown>> {
  const result = { ...context };

  const noMatchControls = [
    'fallback_enabled',
    'fallback_candidate_count',
    'fallback_show_popular',
  ];

  for (const key of noMatchControls) {
    const control = await evaluateTuningControl(key, environment);
    if (control.evaluated) {
      result[key] = control.value;
    }
  }

  return result;
}
