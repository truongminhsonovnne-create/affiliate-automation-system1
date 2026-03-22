/**
 * Targeting Rule Evaluator
 */

import { TargetingRule } from '../types/index.js';

// ============================================================================
// Types
// ============================================================================

export interface TargetingContext {
  environment?: string;
  surface?: string;
  platform?: string;
  isLoggedIn?: boolean;
  hasUsedTool?: boolean;
  attributionContext?: Record<string, unknown>;
  [key: string]: unknown;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Evaluate targeting rules for an experiment
 */
export function evaluateExperimentTargetingRules(
  rules: TargetingRule[],
  context: TargetingContext
): { passed: boolean; failedRules: string[] } {
  const failedRules: string[] = [];

  for (const rule of rules) {
    const result = evaluateRule(rule, context);
    if (!result) {
      failedRules.push(rule.field);
    }
  }

  return {
    passed: failedRules.length === 0,
    failedRules,
  };
}

/**
 * Evaluate single targeting rule
 */
function evaluateRule(rule: TargetingRule, context: TargetingRuleContext): boolean {
  const value = getFieldValue(context, rule.field);

  switch (rule.operator) {
    case 'eq':
      return value === rule.value;
    case 'neq':
      return value !== rule.value;
    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(value);
    case 'nin':
      return Array.isArray(rule.value) && !rule.value.includes(value);
    case 'gt':
      return typeof value === 'number' && typeof rule.value === 'number' && value > rule.value;
    case 'gte':
      return typeof value === 'number' && typeof rule.value === 'number' && value >= rule.value;
    case 'lt':
      return typeof value === 'number' && typeof rule.value === 'number' && value < rule.value;
    case 'lte':
      return typeof value === 'number' && typeof rule.value === 'number' && value <= rule.value;
    default:
      return false;
  }
}

/**
 * Get field value from context
 */
function getFieldValue(context: TargetingRuleContext, field: string): unknown {
  return context[field];
}

/**
 * Check if experiment is targeted to context
 */
export function isExperimentTargetedToContext(
  experiment: { targetingRules?: TargetingRule[] },
  context: TargetingContext
): boolean {
  if (!experiment.targetingRules || experiment.targetingRules.length === 0) {
    return true; // No rules = all eligible
  }

  const result = evaluateExperimentTargetingRules(experiment.targetingRules, context);
  return result.passed;
}

/**
 * Validate targeting rule set
 */
export function validateTargetingRuleSet(rules: TargetingRule[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const validOperators = ['eq', 'neq', 'in', 'nin', 'gt', 'gte', 'lt', 'lte'];
  const validFields = [
    'environment', 'surface', 'platform', 'isLoggedIn', 'hasUsedTool',
    'attributionContext', 'sessionCount', 'isNewUser', 'country'
  ];

  for (const rule of rules) {
    if (!rule.field) {
      errors.push('Rule field is required');
    } else if (!validFields.includes(rule.field)) {
      errors.push(`Invalid rule field: ${rule.field}`);
    }

    if (!rule.operator) {
      errors.push('Rule operator is required');
    } else if (!validOperators.includes(rule.operator)) {
      errors.push(`Invalid rule operator: ${rule.operator}`);
    }

    if (rule.value === undefined || rule.value === null) {
      errors.push(`Rule value is required for field ${rule.field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Helper type for rule evaluation
type TargetingRuleContext = {
  [key: string]: unknown;
};
