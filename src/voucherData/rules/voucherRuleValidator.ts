// =============================================================================
// Voucher Rule Validator
// Production-grade validator for voucher rule logic
// =============================================================================

import { VoucherRulePayload, VoucherRuleValidationError } from '../types.js';
import { RULE_VALIDATION, RULE_VALIDATION_ERROR_CODES } from '../constants.js';

export interface ValidationResult {
  valid: boolean;
  errors: VoucherRuleValidationError[];
  warnings: VoucherRuleValidationError[];
}

/**
 * Validate a voucher rule set
 */
export function validateVoucherRuleSet(
  ruleSet: VoucherRulePayload,
  options?: { strict?: boolean }
): ValidationResult {
  const errors: VoucherRuleValidationError[] = [];
  const warnings: VoucherRuleValidationError[] = [];

  // Validate conditions
  const conditionResult = validateConditions(ruleSet.conditions);
  errors.push(...conditionResult.errors);
  warnings.push(...conditionResult.warnings);

  // Validate constraints
  const constraintResult = validateConstraints(ruleSet.constraints);
  errors.push(...constraintResult.errors);
  warnings.push(...constraintResult.warnings);

  // Validate ranking
  const rankingResult = validateRanking(ruleSet.ranking);
  errors.push(...rankingResult.errors);
  warnings.push(...rankingResult.warnings);

  // Validate compatibility
  const compatibilityResult = validateCompatibility(ruleSet.compatibility);
  errors.push(...compatibilityResult.errors);
  warnings.push(...compatibilityResult.warnings);

  // Validate time windows
  const timeWindowResult = validateTimeWindows(ruleSet.activeWindows);
  errors.push(...timeWindowResult.errors);
  warnings.push(...timeWindowResult.warnings);

  // Check for conflicts
  const conflictResult = validateVoucherRuleConflicts(ruleSet);
  errors.push(...conflictResult.errors);
  warnings.push(...conflictResult.warnings);

  // Check completeness
  const completenessResult = validateVoucherRuleCompleteness(ruleSet);
  errors.push(...completenessResult.errors);
  warnings.push(...completenessResult.warnings);

  const valid = errors.length === 0;

  return { valid, errors, warnings };
}

/**
 * Validate rule conditions
 */
function validateConditions(conditions: VoucherRulePayload['conditions']): ValidationResult {
  const errors: VoucherRuleValidationError[] = [];
  const warnings: VoucherRuleValidationError[] = [];

  // Check number of conditions
  if (conditions.length > RULE_VALIDATION.MAX_CONDITIONS_PER_RULE) {
    errors.push({
      code: RULE_VALIDATION_ERROR_CODES.EMPTY_CONDITIONS,
      message: `Too many conditions (${conditions.length}). Maximum is ${RULE_VALIDATION.MAX_CONDITIONS_PER_RULE}`,
      severity: 'error',
    });
  }

  if (conditions.length === 0) {
    errors.push({
      code: RULE_VALIDATION_ERROR_CODES.EMPTY_CONDITIONS,
      message: 'At least one condition is required',
      severity: 'error',
    });
  }

  // Validate each condition
  const fieldNames = new Set<string>();
  for (const condition of conditions) {
    // Check for duplicate fields
    if (fieldNames.has(condition.field)) {
      warnings.push({
        code: RULE_VALIDATION_ERROR_CODES.CONFLICTING_CONDITIONS,
        message: `Duplicate condition field: ${condition.field}`,
        field: condition.field,
        severity: 'warning',
      });
    }
    fieldNames.add(condition.field);

    // Validate condition structure
    if (!condition.field || condition.field.trim() === '') {
      errors.push({
        code: RULE_VALIDATION_ERROR_CODES.INVALID_CONDITION,
        message: 'Condition field is required',
        field: 'conditions',
        severity: 'error',
      });
    }

    // Validate operator
    const validOperators = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'between'];
    if (!validOperators.includes(condition.operator)) {
      errors.push({
        code: RULE_VALIDATION_ERROR_CODES.INVALID_CONDITION,
        message: `Invalid operator: ${condition.operator}`,
        field: condition.field,
        severity: 'error',
      });
    }

    // Validate value based on operator
    if (condition.operator === 'in' || condition.operator === 'not_in') {
      if (!Array.isArray(condition.value)) {
        errors.push({
          code: RULE_VALIDATION_ERROR_CODES.INVALID_CONDITION,
          message: `Operator ${condition.operator} requires an array value`,
          field: condition.field,
          severity: 'error',
        });
      }
    }

    if (condition.operator === 'between') {
      if (!Array.isArray(condition.value) || condition.value.length !== 2) {
        errors.push({
          code: RULE_VALIDATION_ERROR_CODES.INVALID_CONDITION,
          message: 'Operator between requires exactly 2 values',
          field: condition.field,
          severity: 'error',
        });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate rule constraints
 */
function validateConstraints(constraints: VoucherRulePayload['constraints']): ValidationResult {
  const errors: VoucherRuleValidationError[] = [];
  const warnings: VoucherRuleValidationError[] = [];

  // Check number of constraints
  if (constraints.length > RULE_VALIDATION.MAX_CONSTRAINTS_PER_RULE) {
    errors.push({
      code: RULE_VALIDATION_ERROR_CODES.INVALID_CONSTRAINT,
      message: `Too many constraints (${constraints.length}). Maximum is ${RULE_VALIDATION.MAX_CONSTRAINTS_PER_RULE}`,
      severity: 'error',
    });
  }

  // Validate each constraint
  for (const constraint of constraints) {
    // Check required config for each constraint type
    switch (constraint.type) {
      case 'min_spend':
        if (!constraint.config.value || typeof constraint.config.value !== 'number') {
          errors.push({
            code: RULE_VALIDATION_ERROR_CODES.INVALID_CONSTRAINT,
            message: 'min_spend constraint requires a numeric value',
            severity: 'error',
          });
        }
        break;

      case 'max_discount':
        if (!constraint.config.value || typeof constraint.config.value !== 'number') {
          errors.push({
            code: RULE_VALIDATION_ERROR_CODES.INVALID_CONSTRAINT,
            message: 'max_discount constraint requires a numeric value',
            severity: 'error',
          });
        }
        break;

      case 'time_window':
        if (!constraint.config.startTime || !constraint.config.endTime) {
          errors.push({
            code: RULE_VALIDATION_ERROR_CODES.INVALID_CONSTRAINT,
            message: 'time_window constraint requires startTime and endTime',
            severity: 'error',
          });
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate ranking configuration
 */
function validateRanking(ranking: VoucherRulePayload['ranking']): ValidationResult {
  const errors: VoucherRuleValidationError[] = [];
  const warnings: VoucherRuleValidationError[] = [];

  // Validate priority
  if (ranking.priority < RULE_VALIDATION.MIN_RANKING_PRIORITY || ranking.priority > RULE_VALIDATION.MAX_RANKING_PRIORITY) {
    errors.push({
      code: RULE_VALIDATION_ERROR_CODES.INVALID_RANKING,
      message: `Priority must be between ${RULE_VALIDATION.MIN_RANKING_PRIORITY} and ${RULE_VALIDATION.MAX_RANKING_PRIORITY}`,
      severity: 'error',
    });
  }

  // Validate score weights
  const weights = ranking.scoreWeights;
  const weightSum = weights.discountValue + weights.relevance + weights.recency + weights.confidence;

  if (Math.abs(weightSum - 1) > 0.01) {
    warnings.push({
      code: RULE_VALIDATION_ERROR_CODES.INVALID_RANKING,
      message: `Score weights sum to ${weightSum.toFixed(2)}, should sum to 1.0`,
      severity: 'warning',
    });
  }

  // Validate boost factors
  for (const boost of ranking.boostFactors) {
    if (boost.weight < RULE_VALIDATION.MIN_CONDITION_WEIGHT || boost.weight > RULE_VALIDATION.MAX_CONDITION_WEIGHT) {
      errors.push({
        code: RULE_VALIDATION_ERROR_CODES.INVALID_RANKING,
        message: `Boost factor weight must be between 0 and 1`,
        severity: 'error',
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate compatibility configuration
 */
function validateCompatibility(compatibility: VoucherRulePayload['compatibility']): ValidationResult {
  const errors: VoucherRuleValidationError[] = [];
  const warnings: VoucherRuleValidationError[] = [];

  // Check for overlap between compatible and incompatible
  const compatibleSet = new Set(compatibility.compatibleWith);
  const incompatibleSet = new Set(compatibility.incompatibleWith);

  for (const voucherType of compatibleSet) {
    if (incompatibleSet.has(voucherType)) {
      errors.push({
        code: RULE_VALIDATION_ERROR_CODES.INVALID_COMPATIBILITY,
        message: `Voucher type ${voucherType} cannot be both compatible and incompatible`,
        severity: 'error',
      });
    }
  }

  // Check max compatible vouchers
  if (compatibility.compatibleWith.length > RULE_VALIDATION.MAX_COMPATIBLE_VOUCHERS) {
    warnings.push({
      code: RULE_VALIDATION_ERROR_CODES.INVALID_COMPATIBILITY,
      message: `Too many compatible vouchers (${compatibility.compatibleWith.length}). Maximum is ${RULE_VALIDATION.MAX_COMPATIBLE_VOUCHERS}`,
      severity: 'warning',
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate time windows
 */
function validateTimeWindows(timeWindows: VoucherRulePayload['activeWindows']): ValidationResult {
  const errors: VoucherRuleValidationError[] = [];
  const warnings: VoucherRuleValidationError[] = [];

  // Check number of time windows
  if (timeWindows.length > RULE_VALIDATION.MAX_ACTIVE_WINDOWS) {
    errors.push({
      code: RULE_VALIDATION_ERROR_CODES.INVALID_TIME_WINDOW,
      message: `Too many time windows (${timeWindows.length}). Maximum is ${RULE_VALIDATION.MAX_ACTIVE_WINDOWS}`,
      severity: 'error',
    });
  }

  // Validate each time window
  for (const window of timeWindows) {
    if (window.endTime < window.startTime) {
      errors.push({
        code: RULE_VALIDATION_ERROR_CODES.INVALID_TIME_WINDOW,
        message: `Time window "${window.name}" has end time before start time`,
        severity: 'error',
      });
    }

    // Check if window is in the past
    if (window.endTime < new Date()) {
      warnings.push({
        code: RULE_VALIDATION_ERROR_CODES.INVALID_TIME_WINDOW,
        message: `Time window "${window.name}" is entirely in the past`,
        severity: 'warning',
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate rule conflicts
 */
export function validateVoucherRuleConflicts(ruleSet: VoucherRulePayload): ValidationResult {
  const errors: VoucherRuleValidationError[] = [];
  const warnings: VoucherRuleValidationError[] = [];

  // Check for conflicting conditions on the same field
  const fieldConditions = new Map<string, VoucherRulePayload['conditions']>();

  for (const condition of ruleSet.conditions) {
    const existing = fieldConditions.get(condition.field) || [];
    existing.push(condition);
    fieldConditions.set(condition.field, existing);
  }

  // Check for conflicting operators on same field
  for (const [field, conditions] of fieldConditions) {
    if (conditions.length > 1) {
      const operators = conditions.map((c) => c.operator);
      const uniqueOperators = new Set(operators);

      if (uniqueOperators.size > 1) {
        // Check for truly conflicting conditions
        const hasGt = operators.includes('gt') || operators.includes('gte');
        const hasLt = operators.includes('lt') || operators.includes('lte');

        if (hasGt && hasLt) {
          // This could be a valid range, check values
          const gtCondition = conditions.find((c) => c.operator === 'gt' || c.operator === 'gte');
          const ltCondition = conditions.find((c) => c.operator === 'lt' || c.operator === 'lte');

          if (gtCondition && ltCondition && typeof gtCondition.value === 'number' && typeof ltCondition.value === 'number') {
            if (gtCondition.value >= ltCondition.value) {
              errors.push({
                code: RULE_VALIDATION_ERROR_CODES.CONFLICTING_CONDITIONS,
                message: `Conflicting conditions on field "${field}": min value >= max value`,
                field,
                severity: 'error',
              });
            }
          }
        }
      }
    }
  }

  // Check for conflicting constraints
  const constraintTypes = ruleSet.constraints.map((c) => c.type);
  const hasMinSpend = constraintTypes.includes('min_spend');
  const hasMaxDiscount = constraintTypes.includes('max_discount');

  if (hasMinSpend && hasMaxDiscount) {
    const minSpendConstraint = ruleSet.constraints.find((c) => c.type === 'min_spend');
    const maxDiscountConstraint = ruleSet.constraints.find((c) => c.type === 'max_discount');

    if (minSpendConstraint && maxDiscountConstraint) {
      const minSpend = minSpendConstraint.config.value as number;
      const maxDiscount = maxDiscountConstraint.config.value as number;

      // Warn if max discount could never apply
      if (minSpend > 0 && maxDiscount > 0 && maxDiscount >= minSpend) {
        warnings.push({
          code: RULE_VALIDATION_ERROR_CODES.CONFLICTING_CONDITIONS,
          message: 'max_discount may always equal min_spend, making discount percentage constraint meaningless',
          severity: 'warning',
        });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate rule completeness
 */
export function validateVoucherRuleCompleteness(ruleSet: VoucherRulePayload): ValidationResult {
  const errors: VoucherRuleValidationError[] = [];
  const warnings: VoucherRuleValidationError[] = [];

  // Check if rule has a meaningful name
  if (!ruleSet.name || ruleSet.name.trim() === '') {
    errors.push({
      code: RULE_VALIDATION_ERROR_CODES.MISSING_REQUIRED_FIELD,
      message: 'Rule name is required',
      field: 'name',
      severity: 'error',
    });
  }

  // Check if version is provided
  if (!ruleSet.version) {
    errors.push({
      code: RULE_VALIDATION_ERROR_CODES.MISSING_REQUIRED_FIELD,
      message: 'Rule version is required',
      field: 'version',
      severity: 'error',
    });
  }

  // Check ranking weights
  const ranking = ruleSet.ranking;
  if (!ranking.scoreWeights) {
    warnings.push({
      code: RULE_VALIDATION_ERROR_CODES.MISSING_REQUIRED_FIELD,
      message: 'No score weights defined, using defaults',
      severity: 'warning',
    });
  }

  // Check compatibility
  if (!ruleSet.compatibility) {
    warnings.push({
      code: RULE_VALIDATION_ERROR_CODES.MISSING_REQUIRED_FIELD,
      message: 'No compatibility rules defined, defaults will be used',
      severity: 'warning',
    });
  }

  // Check active windows
  if (ruleSet.activeWindows.length === 0) {
    warnings.push({
      code: RULE_VALIDATION_ERROR_CODES.MISSING_REQUIRED_FIELD,
      message: 'No active time windows defined, rule will always be active',
      severity: 'warning',
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}
