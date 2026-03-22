/**
 * Tuning Control Registry
 */

import { TuningControlDefinition, TuningControlStatus, TuningControlType } from '../types/index.js';

// In-memory registry
const controlCache = new Map<string, TuningControlDefinition>();

/**
 * Get tuning control by key
 */
export async function getTuningControl(key: string): Promise<TuningControlDefinition | null> {
  return controlCache.get(key) || null;
}

/**
 * Get all active tuning controls
 */
export async function getAllActiveTuningControls(): Promise<TuningControlDefinition[]> {
  return Array.from(controlCache.values())
    .filter(c => c.status === TuningControlStatus.ACTIVE);
}

/**
 * Resolve tuning control value
 */
export async function resolveTuningControlValue(
  key: string,
  environment: string
): Promise<{ value: unknown; found: boolean }> {
  const control = await getTuningControl(key);

  if (!control) {
    return { value: null, found: false };
  }

  // Check environment-specific value first
  if (control.environmentRules) {
    const envRule = control.environmentRules.find(r => r.environment === environment);
    if (envRule) {
      return { value: envRule.value, found: true };
    }
  }

  // Fall back to current value
  return { value: control.currentValue, found: true };
}

/**
 * Register tuning control
 */
export async function registerTuningControl(control: TuningControlDefinition): Promise<void> {
  controlCache.set(control.controlKey, control);
}

/**
 * Update tuning control
 */
export async function updateTuningControl(
  key: string,
  updates: Partial<TuningControlDefinition>
): Promise<TuningControlDefinition | null> {
  const existing = controlCache.get(key);
  if (!existing) return null;

  const updated = { ...existing, ...updates, updatedAt: new Date() };
  controlCache.set(key, updated);
  return updated;
}

/**
 * Validate tuning control registry
 */
export function validateTuningControlRegistry(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const control of controlCache.values()) {
    if (!control.controlKey) errors.push('Missing control key');
    if (!control.controlType) errors.push(`Missing type for ${control.controlKey}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Clear registry (for testing)
 */
export function clearRegistry(): void {
  controlCache.clear();
}
