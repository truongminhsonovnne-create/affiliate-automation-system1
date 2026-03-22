/**
 * Voucher Eligibility Evaluator
 *
 * Evaluates voucher eligibility against product context.
 */

import {
  VoucherCatalogRecord,
  ProductContext,
  VoucherEligibilityResult,
  MatchedRule,
  FailedRule,
  VoucherMatchType,
} from '../types';
import {
  MIN_ELIGIBILITY_SCORE,
  MIN_APPLICABILITY_CERTAINTY,
} from '../constants';

/**
 * Eligibility evaluator options
 */
export interface EligibilityEvaluatorOptions {
  includeWarnings?: boolean;
  includeDebugInfo?: boolean;
  strictMode?: boolean;
}

/**
 * Evaluate single voucher eligibility
 */
export function evaluateVoucherEligibility(
  voucher: VoucherCatalogRecord,
  context: ProductContext,
  options?: EligibilityEvaluatorOptions
): VoucherEligibilityResult {
  const matchedRules: MatchedRule[] = [];
  const failedRules: FailedRule[] = [];
  const warnings: string[] = [];

  // Determine match type
  let matchType: VoucherMatchType = 'none';
  let eligibilityScore = 0;

  // 1. Platform match (critical)
  const platformMatch = evaluatePlatformMatch(voucher, context);
  if (platformMatch.matched) {
    matchedRules.push(platformMatch.rule);
    eligibilityScore += 0.3;
  } else {
    failedRules.push(platformMatch.failedRule!);
    return buildIneligibleResult(voucher, context, matchType, matchedRules, failedRules, warnings);
  }

  // 2. Time window (critical)
  const timeMatch = evaluateTimeWindow(voucher, context);
  if (timeMatch.matched) {
    matchedRules.push(timeMatch.rule);
    eligibilityScore += 0.2;
  } else {
    failedRules.push(timeMatch.failedRule!);
    return buildIneligibleResult(voucher, context, matchType, matchedRules, failedRules, warnings);
  }

  // 3. Scope match
  const scopeMatch = evaluateScopeMatch(voucher, context);
  if (scopeMatch.matched) {
    matchedRules.push(scopeMatch.rule);
    matchType = scopeMatch.matchType;
    eligibilityScore += 0.3;
  } else if (scopeMatch.matchType === 'platform') {
    // Fall back to platform-wide voucher
    matchType = 'platform';
    eligibilityScore += 0.1;
  } else {
    failedRules.push(scopeMatch.failedRule!);
    return buildIneligibleResult(voucher, context, matchType, matchedRules, failedRules, warnings);
  }

  // 4. Minimum spend check
  const spendMatch = evaluateMinimumSpend(voucher, context);
  if (spendMatch.matched) {
    matchedRules.push(spendMatch.rule);
    eligibilityScore += 0.1;
  } else if (spendMatch.severity === 'warning') {
    warnings.push(spendMatch.failedRule!.message);
    eligibilityScore += 0.05;
    matchedRules.push({
      ruleId: 'minimum_spend',
      field: 'minimumSpend',
      matchedValue: context.price,
      message: 'Price may not meet minimum spend',
    });
  } else {
    failedRules.push(spendMatch.failedRule!);
    return buildIneligibleResult(voucher, context, matchType, matchedRules, failedRules, warnings);
  }

  // 5. Additional rules from eligibility_rules
  if (voucher.eligibilityRules && voucher.eligibilityRules.length > 0) {
    const customRulesResult = evaluateCustomRules(voucher.eligibilityRules, context);
    matchedRules.push(...customRulesResult.matched);
    failedRules.push(...customRulesResult.failed);
  }

  // Normalize eligibility score
  eligibilityScore = Math.min(1, eligibilityScore);

  // Determine if eligible
  const isEligible = eligibilityScore >= MIN_ELIGIBILITY_SCORE && failedRules.length === 0;

  return {
    voucher,
    isEligible,
    eligibilityScore,
    matchedRules,
    failedRules,
    warnings,
    matchType: isEligible ? matchType : 'none',
    applicabilityCertainty: calculateApplicabilityCertainty(matchedRules, failedRules),
    evaluatedAt: new Date(),
  };
}

/**
 * Evaluate batch of vouchers
 */
export function evaluateVoucherEligibilityBatch(
  vouchers: VoucherCatalogRecord[],
  context: ProductContext,
  options?: EligibilityEvaluatorOptions
): VoucherEligibilityResult[] {
  return vouchers.map((voucher) => evaluateVoucherEligibility(voucher, context, options));
}

/**
 * Check if voucher is applicable
 */
export function isVoucherApplicable(
  voucher: VoucherCatalogRecord,
  context: ProductContext,
  options?: EligibilityEvaluatorOptions
): boolean {
  const result = evaluateVoucherEligibility(voucher, context, options);
  return result.isEligible;
}

// =============================================================================
// Private Helper Functions
// =============================================================================

/**
 * Evaluate platform match
 */
function evaluatePlatformMatch(
  voucher: VoucherCatalogRecord,
  context: ProductContext
): { matched: boolean; rule?: MatchedRule; failedRule?: FailedRule } {
  const matches = voucher.platform === context.platform;

  if (matches) {
    return {
      matched: true,
      rule: {
        ruleId: 'platform',
        field: 'platform',
        matchedValue: voucher.platform,
        message: `Platform matches: ${voucher.platform}`,
      },
    };
  }

  return {
    matched: false,
    failedRule: {
      ruleId: 'platform',
      field: 'platform',
      expectedValue: context.platform,
      actualValue: voucher.platform,
      severity: 'critical',
      message: `Platform mismatch: voucher is for ${voucher.platform}, product is ${context.platform}`,
    },
  };
}

/**
 * Evaluate time window
 */
function evaluateTimeWindow(
  voucher: VoucherCatalogRecord,
  context: ProductContext
): { matched: boolean; rule?: MatchedRule; failedRule?: FailedRule } {
  const now = new Date();

  // No time constraints - always valid
  if (!voucher.startsAt && !voucher.endsAt) {
    return {
      matched: true,
      rule: {
        ruleId: 'time_window',
        field: 'timeWindow',
        matchedValue: 'no_constraints',
        message: 'No time constraints',
      },
    };
  }

  // Check starts_at
  if (voucher.startsAt && voucher.startsAt > now) {
    return {
      matched: false,
      failedRule: {
        ruleId: 'time_window',
        field: 'startsAt',
        expectedValue: 'past',
        actualValue: voucher.startsAt.toISOString(),
        severity: 'critical',
        message: `Voucher not yet active: starts at ${voucher.startsAt.toISOString()}`,
      },
    };
  }

  // Check ends_at
  if (voucher.endsAt && voucher.endsAt < now) {
    return {
      matched: false,
      failedRule: {
        ruleId: 'time_window',
        field: 'endsAt',
        expectedValue: 'future',
        actualValue: voucher.endsAt.toISOString(),
        severity: 'critical',
        message: `Voucher expired: ended at ${voucher.endsAt.toISOString()}`,
      },
    };
  }

  return {
    matched: true,
    rule: {
      ruleId: 'time_window',
      field: 'timeWindow',
      matchedValue: 'active',
      message: 'Voucher is within valid time window',
    },
  };
}

/**
 * Evaluate scope match
 */
function evaluateScopeMatch(
  voucher: VoucherCatalogRecord,
  context: ProductContext
): {
  matched: boolean;
  matchType: VoucherMatchType;
  rule?: MatchedRule;
  failedRule?: FailedRule;
} {
  const { appliesToScope, shopId, categoryPath } = voucher;

  switch (appliesToScope) {
    case 'all':
      return {
        matched: true,
        matchType: 'platform',
        rule: {
          ruleId: 'scope',
          field: 'appliesToScope',
          matchedValue: 'all',
          message: 'Voucher applies to all products',
        },
      };

    case 'shop':
      if (!context.shopId) {
        return {
          matched: false,
          matchType: 'none',
          failedRule: {
            ruleId: 'scope_shop',
            field: 'shopId',
            expectedValue: shopId,
            actualValue: null,
            severity: 'critical',
            message: 'Cannot verify shop-specific voucher: no shop ID in context',
          },
        };
      }
      if (context.shopId === shopId) {
        return {
          matched: true,
          matchType: 'exact',
          rule: {
            ruleId: 'scope_shop',
            field: 'shopId',
            matchedValue: shopId,
            message: `Voucher applies to specific shop: ${shopId}`,
          },
        };
      }
      return {
        matched: false,
        matchType: 'none',
        failedRule: {
          ruleId: 'scope_shop',
          field: ' expectedValue: shopshopId',
         Id,
          actualValue: context.shopId,
          severity: 'critical',
          message: `Voucher is for shop ${shopId}, product is from shop ${context.shopId}`,
        },
      };

    case 'category':
      if (!context.categoryPath || context.categoryPath.length === 0) {
        return {
          matched: false,
          matchType: 'none',
          failedRule: {
            ruleId: 'scope_category',
            field: 'categoryPath',
            expectedValue: categoryPath,
            actualValue: null,
            severity: 'warning',
            message: 'Cannot verify category voucher: no category in context',
          },
        };
      }
      // Check if any category matches
      const hasCategoryMatch = categoryPath
        ? context.categoryPath.some((cat) => categoryPath.includes(cat))
        : false;

      if (hasCategoryMatch) {
        return {
          matched: true,
          matchType: 'category',
          rule: {
            ruleId: 'scope_category',
            field: 'categoryPath',
            matchedValue: categoryPath,
            message: `Voucher applies to category: ${categoryPath?.join(' > ')}`,
          },
        };
      }
      return {
        matched: false,
        matchType: 'none',
        failedRule: {
          ruleId: 'scope_category',
          field: 'categoryPath',
          expectedValue: categoryPath,
          actualValue: context.categoryPath,
          severity: 'critical',
          message: `Product categories ${context.categoryPath.join(', ')} don't match voucher categories ${categoryPath?.join(', ')}`,
        },
      };

    default:
      return {
        matched: false,
        matchType: 'none',
        failedRule: {
          ruleId: 'scope',
          field: 'appliesToScope',
          expectedValue: 'all|shop|category',
          actualValue: appliesToScope,
          severity: 'critical',
          message: `Unknown scope: ${appliesToScope}`,
        },
      };
  }
}

/**
 * Evaluate minimum spend
 */
function evaluateMinimumSpend(
  voucher: VoucherCatalogRecord,
  context: ProductContext
): {
  matched: boolean;
  severity: 'critical' | 'warning';
  rule?: MatchedRule;
  failedRule?: FailedRule;
} {
  const { minimumSpend } = voucher;

  // No minimum spend required
  if (!minimumSpend || minimumSpend <= 0) {
    return {
      matched: true,
      severity: 'info',
      rule: {
        ruleId: 'minimum_spend',
        field: 'minimumSpend',
        matchedValue: 'no_minimum',
        message: 'No minimum spend required',
      },
    };
  }

  // No price in context
  if (!context.price) {
    return {
      matched: true,
      severity: 'warning',
      rule: {
        ruleId: 'minimum_spend',
        field: 'minimumSpend',
        matchedValue: 'unknown',
        message: 'Cannot verify minimum spend: no price in context',
      },
    };
  }

  // Check if price meets minimum
  if (context.price >= minimumSpend) {
    return {
      matched: true,
      severity: 'info',
      rule: {
        ruleId: 'minimum_spend',
        field: 'minimumSpend',
        matchedValue: minimumSpend,
        message: `Price ${context.price} meets minimum spend ${minimumSpend}`,
      },
    };
  }

  // Price below minimum - check how far below
  const gap = minimumSpend - context.price;
  const gapPercentage = (gap / minimumSpend) * 100;

  if (gapPercentage > 20) {
    return {
      matched: false,
      severity: 'critical',
      failedRule: {
        ruleId: 'minimum_spend',
        field: 'minimumSpend',
        expectedValue: minimumSpend,
        actualValue: context.price,
        severity: 'critical',
        message: `Price ${context.price} is below minimum spend ${minimumSpend} (gap: ${gapPercentage.toFixed(1)}%)`,
      },
    };
  }

  // Close to minimum - warning
  return {
    matched: false,
    severity: 'warning',
    failedRule: {
      ruleId: 'minimum_spend',
      field: 'minimumSpend',
      expectedValue: minimumSpend,
      actualValue: context.price,
      severity: 'warning',
      message: `Price ${context.price} is slightly below minimum spend ${minimumSpend}`,
    },
  };
}

/**
 * Evaluate custom eligibility rules
 */
function evaluateCustomRules(
  rules: { id?: string; field: string; operator: string; value: unknown; severity?: string; message?: string }[],
  context: ProductContext
): { matched: MatchedRule[]; failed: FailedRule[] } {
  const matched: MatchedRule[] = [];
  const failed: FailedRule[] = [];

  for (const rule of rules) {
    const contextValue = getNestedValue(context, rule.field);

    const result = evaluateRuleCondition(contextValue, rule.operator, rule.value);

    if (result) {
      matched.push({
        ruleId: rule.id || rule.field,
        field: rule.field,
        matchedValue: contextValue,
        message: rule.message || `Rule passed: ${rule.field} ${rule.operator} ${rule.value}`,
      });
    } else {
      failed.push({
        ruleId: rule.id || rule.field,
        field: rule.field,
        expectedValue: rule.value,
        actualValue: contextValue,
        severity: (rule.severity as 'critical' | 'warning' | 'info') || 'warning',
        message: rule.message || `Rule failed: ${rule.field} ${rule.operator} ${rule.value}`,
      });
    }
  }

  return { matched, failed };
}

/**
 * Get nested value from object
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Evaluate rule condition
 */
function evaluateRuleCondition(actual: unknown, operator: string, expected: unknown): boolean {
  switch (operator) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'gt':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case 'gte':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    case 'lt':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case 'lte':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
    case 'in':
      return Array.isArray(expected) && expected.includes(actual);
    case 'not_in':
      return Array.isArray(expected) && !expected.includes(actual);
    case 'contains':
      return typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected);
    case 'regex':
      return typeof actual === 'string' && typeof expected === 'string' && new RegExp(expected).test(actual);
    default:
      return false;
  }
}

/**
 * Calculate applicability certainty
 */
function calculateApplicabilityCertainty(matched: MatchedRule[], failed: FailedRule[]): number {
  const criticalFailures = failed.filter((r) => r.severity === 'critical').length;

  if (criticalFailures > 0) {
    return 0;
  }

  const warnings = failed.filter((r) => r.severity === 'warning').length;
  const total = matched.length + failed.length;

  if (total === 0) {
    return MIN_APPLICABILITY_CERTAINTY;
  }

  return Math.max(MIN_APPLICABILITY_CERTAINTY, (matched.length - warnings) / total);
}

/**
 * Build ineligible result
 */
function buildIneligibleResult(
  voucher: VoucherCatalogRecord,
  context: ProductContext,
  matchType: VoucherMatchType,
  matchedRules: MatchedRule[],
  failedRules: FailedRule[],
  warnings: string[]
): VoucherEligibilityResult {
  return {
    voucher,
    isEligible: false,
    eligibilityScore: 0,
    matchedRules,
    failedRules,
    warnings,
    matchType: 'none',
    applicabilityCertainty: 0,
    evaluatedAt: new Date(),
  };
}
