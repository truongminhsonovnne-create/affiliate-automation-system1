/**
 * Tuning Control Validator
 */

import { TuningControlDefinition, TuningControlValidation } from '../types/index.js';
import { TUNING_CONTROL_LIMITS } from '../constants/index.js';

/**
 * Validate tuning control definition
 */
export function validateTuningControlDefinition(control: TuningControlDefinition): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!control.controlKey) errors.push('Control key is required');
  if (!control.controlType) errors.push('Control type is required');

  return { valid: errors.length === 0, errors };
}

/**
 * Validate tuning control value
 */
export function validateTuningControlValue(
  control: TuningControlDefinition,
  newValue: unknown
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validation = control.validationRules;

  if (!validation) return { valid: true, errors: [] };

  switch (validation.type) {
    case 'range':
      if (typeof newValue !== 'number') {
        errors.push('Value must be a number for range validation');
      } else {
        if (validation.min !== undefined && newValue < validation.min) {
          errors.push(`Value must be at least ${validation.min}`);
        }
        if (validation.max !== undefined && newValue > validation.max) {
          errors.push(`Value must be at most ${validation.max}`);
        }
      }
      break;

    case 'enum':
      if (validation.allowed && !validation.allowed.includes(newValue)) {
        errors.push(`Value must be one of: ${validation.allowed.join(', ')}`);
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate tuning change safety
 */
export function validateTuningChangeSafety(
  oldControl: TuningControlDefinition,
  newValue: unknown
): { safe: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check for drastic changes
  if (typeof oldControl.currentValue === 'number' && typeof newValue === 'number') {
    const change = Math.abs(newValue - oldControl.currentValue) / oldControl.currentValue;
    if (change > 0.5) {
      warnings.push('Large change detected (>50%)');
    }
  }

  return { safe: warnings.length === 0, warnings };
}
