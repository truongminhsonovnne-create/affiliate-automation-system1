// =============================================================================
// Voucher Rule Compiler
// Production-grade compiler for converting rule payloads to runtime-friendly structures
// =============================================================================

import {
  VoucherRuleSet,
  CompiledVoucherRule,
  CompiledCondition,
  CompiledRanking,
  CompiledConstraint,
  CompiledCompatibility,
} from '../types.js';
import { RANKING_EVALUATION } from '../constants.js';

export interface CompileOptions {
  strict?: boolean;
  includeEvaluator?: boolean;
}

/**
 * Compile a voucher rule set to runtime-friendly structure
 */
export function compileVoucherRuleSet(
  ruleSet: VoucherRuleSet,
  options?: CompileOptions
): CompiledVoucherRule {
  return {
    voucherId: ruleSet.voucherId,
    version: ruleSet.ruleVersion,
    conditions: compileConditions(ruleSet.rulePayload.conditions, options),
    ranking: compileRanking(ruleSet.rulePayload.ranking, options),
    constraints: compileConstraints(ruleSet.rulePayload.constraints, options),
    compatibility: compileCompatibility(ruleSet.rulePayload.compatibility, options),
    isActive: ruleSet.ruleStatus === 'active',
    compiledAt: new Date(),
  };
}

/**
 * Compile conditions to executable functions
 */
function compileConditions(
  conditions: VoucherRuleSet['rulePayload']['conditions'],
  options?: CompileOptions
): CompiledCondition[] {
  return conditions.map((condition) => ({
    field: condition.field,
    operator: condition.operator,
    value: condition.value,
    evaluator: options?.includeEvaluator !== false
      ? createConditionEvaluator(condition.field, condition.operator, condition.value)
      : (() => false) as CompiledCondition['evaluator'],
  }));
}

/**
 * Create a condition evaluator function
 */
function createConditionEvaluator(
  field: string,
  operator: string,
  value: unknown
): (context: Record<string, unknown>) => boolean {
  return (context: Record<string, unknown>): boolean => {
    const fieldValue = context[field];

    switch (operator) {
      case 'eq':
        return fieldValue === value;

      case 'neq':
        return fieldValue !== value;

      case 'gt':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue > value;

      case 'gte':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue >= value;

      case 'lt':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue < value;

      case 'lte':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue <= value;

      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);

      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);

      case 'contains':
        return (
          typeof fieldValue === 'string' &&
          typeof value === 'string' &&
          fieldValue.toLowerCase().includes(value.toLowerCase())
        );

      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          const [min, max] = value as [number, number];
          return typeof fieldValue === 'number' && fieldValue >= min && fieldValue <= max;
        }
        return false;

      default:
        return false;
    }
  };
}

/**
 * Compile ranking configuration
 */
function compileRanking(
  ranking: VoucherRuleSet['rulePayload']['ranking'],
  options?: CompileOptions
): CompiledRanking {
  // Create boost functions
  const boostFunctions = ranking.boostFactors.map((boost) => {
    return createBoostFunction(boost.factor, boost.weight, boost.condition);
  });

  return {
    priority: ranking.priority,
    scoreWeights: {
      discountValue: ranking.scoreWeights.discountValue,
      relevance: ranking.scoreWeights.relevance,
      recency: ranking.scoreWeights.recency,
      confidence: ranking.scoreWeights.confidence,
    },
    boostFunctions: options?.includeEvaluator !== false ? boostFunctions : [],
  };
}

/**
 * Create a boost function
 */
function createBoostFunction(
  factor: string,
  weight: number,
  condition?: VoucherRuleSet['rulePayload']['conditions'][0]
): (context: Record<string, unknown>) => number {
  return (context: Record<string, unknown>): number => {
    // Check condition if provided
    if (condition) {
      const evaluator = createConditionEvaluator(condition.field, condition.operator, condition.value);
      if (!evaluator(context)) {
        return 0;
      }
    }

    // Get factor value from context
    const factorValue = context[factor];

    if (typeof factorValue === 'number') {
      return factorValue * weight;
    }

    if (typeof factorValue === 'boolean') {
      return factorValue ? weight : 0;
    }

    return 0;
  };
}

/**
 * Compile constraints
 */
function compileConstraints(
  constraints: VoucherRuleSet['rulePayload']['constraints'],
  options?: CompileOptions
): CompiledConstraint[] {
  return constraints.map((constraint) => ({
    type: constraint.type,
    validator: options?.includeEvaluator !== false
      ? createConstraintValidator(constraint.type, constraint.config)
      : (() => false) as CompiledConstraint['validator'],
  }));
}

/**
 * Create a constraint validator function
 */
function createConstraintValidator(
  type: string,
  config: Record<string, unknown>
): (context: Record<string, unknown>) => boolean {
  return (context: Record<string, unknown>): boolean => {
    switch (type) {
      case 'min_spend': {
        const minSpend = context['cartValue'] as number;
        const required = config['value'] as number;
        return minSpend >= required;
      }

      case 'max_discount': {
        const discount = context['discountAmount'] as number;
        const max = config['value'] as number;
        return discount <= max;
      }

      case 'product_limit': {
        const productCount = context['productCount'] as number;
        const limit = config['value'] as number;
        return productCount <= limit;
      }

      case 'user_limit': {
        const usageCount = context['userUsageCount'] as number;
        const limit = config['value'] as number;
        return usageCount < limit;
      }

      case 'category_required': {
        const categories = context['productCategories'] as string[];
        const required = config['categories'] as string[];
        if (!categories || !Array.isArray(categories)) return false;
        return required.some((cat) => categories.includes(cat));
      }

      case 'product_required': {
        const products = context['productIds'] as string[];
        const required = config['productIds'] as string[];
        if (!products || !Array.isArray(products)) return false;
        return required.some((id) => products.includes(id));
      }

      case 'payment_method': {
        const paymentMethod = context['paymentMethod'] as string;
        const allowed = config['methods'] as string[];
        if (!paymentMethod || !allowed) return false;
        return allowed.includes(paymentMethod.toLowerCase());
      }

      case 'time_window': {
        const now = new Date();
        const start = new Date(config['startTime'] as string);
        const end = new Date(config['endTime'] as string);
        return now >= start && now <= end;
      }

      default:
        return true;
    }
  };
}

/**
 * Compile compatibility configuration
 */
function compileCompatibility(
  compatibility: VoucherRuleSet['rulePayload']['compatibility'],
  options?: CompileOptions
): CompiledCompatibility {
  return {
    canCombine: compatibility.canCombine,
    compatibleVoucherTypes: compatibility.compatibleWith,
  };
}

/**
 * Compile voucher rules for runtime eligibility evaluation
 */
export function compileVoucherRulesForRuntime(
  voucherId: string,
  ruleSet: VoucherRuleSet,
  options?: CompileOptions
): CompiledVoucherRule {
  return compileVoucherRuleSet(ruleSet, options);
}

/**
 * Evaluate if a voucher matches the rule conditions
 */
export function evaluateVoucherRule(
  compiledRule: CompiledVoucherRule,
  context: Record<string, unknown>
): {
  matches: boolean;
  score: number;
  failedConstraints: string[];
} {
  // Check all conditions
  const allConditionsMatch = compiledRule.conditions.every((condition) => {
    return condition.evaluator(context);
  });

  if (!allConditionsMatch) {
    return {
      matches: false,
      score: 0,
      failedConstraints: [],
    };
  }

  // Calculate score
  let score = 0;
  const weights = compiledRule.ranking.scoreWeights;

  // Apply boost functions
  for (const boostFn of compiledRule.ranking.boostFunctions) {
    score += boostFn(context);
  }

  // Apply default weights if no boost functions
  if (compiledRule.ranking.boostFunctions.length === 0) {
    const discountValue = (context['discountValue'] as number) || 0;
    const relevance = (context['relevance'] as number) || 0;
    const recency = (context['recency'] as number) || 0;
    const confidence = (context['confidence'] as number) || 0;

    score =
      discountValue * weights.discountValue +
      relevance * weights.relevance +
      recency * weights.recency +
      confidence * weights.confidence;
  }

  // Check constraints
  const failedConstraints: string[] = [];
  for (const constraint of compiledRule.constraints) {
    if (!constraint.validator(context)) {
      failedConstraints.push(constraint.type);
    }
  }

  const matches = failedConstraints.length === 0;

  return {
    matches,
    score,
    failedConstraints,
  };
}
