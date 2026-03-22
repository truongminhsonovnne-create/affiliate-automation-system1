// =============================================================================
// Voucher Rule Schema
// Production-grade Zod schemas for voucher rule validation
// =============================================================================

import { z } from 'zod';

// =============================================================================
// Condition Schema
// =============================================================================

export const voucherRuleConditionSchema = z.object({
  id: z.string().uuid(),
  field: z.string().min(1),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'between']),
  value: z.unknown(),
  metadata: z.record(z.unknown()).optional(),
});

// =============================================================================
// Ranking Schema
// =============================================================================

export const voucherRankingBoostFactorSchema = z.object({
  factor: z.string().min(1),
  weight: z.number().min(0).max(1),
  condition: voucherRuleConditionSchema.optional(),
});

export const voucherRankingDecayFactorSchema = z.object({
  factor: z.string().min(1),
  decayRate: z.number().positive(),
  threshold: z.number(),
});

export const voucherRankingScoreWeightsSchema = z.object({
  discountValue: z.number().min(0).max(1),
  relevance: z.number().min(0).max(1),
  recency: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
});

export const voucherRuleRankingSchema = z.object({
  priority: z.number().int().min(1).max(100),
  boostFactors: z.array(voucherRankingBoostFactorSchema),
  decayFactors: z.array(voucherRankingDecayFactorSchema),
  scoreWeights: voucherRankingScoreWeightsSchema,
});

// =============================================================================
// Constraint Schema
// =============================================================================

export const voucherRuleConstraintSchema = z.object({
  type: z.enum([
    'min_spend',
    'max_discount',
    'product_limit',
    'user_limit',
    'category_required',
    'product_required',
    'payment_method',
    'shipping_method',
    'time_window',
    'device_type',
    'user_segment',
    'custom',
  ]),
  config: z.record(z.unknown()),
});

// =============================================================================
// Compatibility Schema
// =============================================================================

export const voucherCombinationRuleSchema = z.object({
  voucherType: z.string(),
  maxCombined: z.number().int().positive(),
  discountCap: z.number().positive().optional(),
});

export const voucherRuleCompatibilitySchema = z.object({
  canCombine: z.boolean(),
  compatibleWith: z.array(z.string()),
  incompatibleWith: z.array(z.string()),
  combinationRules: z.array(voucherCombinationRuleSchema).optional(),
});

// =============================================================================
// Time Window Schema
// =============================================================================

export const voucherRuleTimeWindowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  startTime: z.date(),
  endTime: z.date(),
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
});

// =============================================================================
// Main Rule Payload Schema
// =============================================================================

export const voucherRulePayloadSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format'),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  conditions: z.array(voucherRuleConditionSchema).min(1, 'At least one condition is required'),
  ranking: voucherRuleRankingSchema,
  constraints: z.array(voucherRuleConstraintSchema),
  compatibility: voucherRuleCompatibilitySchema,
  activeWindows: z.array(voucherRuleTimeWindowSchema),
  customLogic: z.record(z.unknown()).optional(),
});

// =============================================================================
// Rule Set Schema
// =============================================================================

export const voucherRuleSetSchema = z.object({
  id: z.string().uuid().optional(),
  voucherId: z.string().uuid(),
  ruleVersion: z.string(),
  ruleStatus: z.enum(['draft', 'active', 'archived', 'superseded']).default('draft'),
  rulePayload: voucherRulePayloadSchema,
  validationStatus: z.enum(['pending', 'valid', 'invalid', 'warning']).default('pending'),
  validationErrors: z.array(z.object({
    code: z.string(),
    message: z.string(),
    field: z.string().optional(),
    severity: z.enum(['error', 'warning', 'info']),
  })).optional(),
  createdBy: z.string().optional(),
  activatedAt: z.date().optional(),
  deactivatedAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// =============================================================================
// Input Schemas (for API calls)
// =============================================================================

export const createVoucherRuleInputSchema = z.object({
  voucherId: z.string().uuid(),
  ruleVersion: z.string(),
  rulePayload: voucherRulePayloadSchema,
  createdBy: z.string().optional(),
});

export const updateVoucherRuleInputSchema = z.object({
  ruleVersion: z.string().optional(),
  rulePayload: voucherRulePayloadSchema.optional(),
  createdBy: z.string().optional(),
});

export const activateVoucherRuleInputSchema = z.object({
  activatedBy: z.string().optional(),
});

export const archiveVoucherRuleInputSchema = z.object({
  archivedBy: z.string().optional(),
});

// =============================================================================
// Compile-time Types
// =============================================================================

export type VoucherRuleConditionInput = z.infer<typeof voucherRuleConditionSchema>;
export type VoucherRuleRankingInput = z.infer<typeof voucherRuleRankingSchema>;
export type VoucherRuleConstraintInput = z.infer<typeof voucherRuleConstraintSchema>;
export type VoucherRuleCompatibilityInput = z.infer<typeof voucherRuleCompatibilitySchema>;
export type VoucherRuleTimeWindowInput = z.infer<typeof voucherRuleTimeWindowSchema>;
export type VoucherRulePayloadInput = z.infer<typeof voucherRulePayloadSchema>;
export type VoucherRuleSetInput = z.infer<typeof voucherRuleSetSchema>;

export type CreateVoucherRuleInput = z.infer<typeof createVoucherRuleInputSchema>;
export type UpdateVoucherRuleInput = z.infer<typeof updateVoucherRuleInputSchema>;
export type ActivateVoucherRuleInput = z.infer<typeof activateVoucherRuleInputSchema>;
export type ArchiveVoucherRuleInput = z.infer<typeof archiveVoucherRuleInputSchema>;

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate a voucher rule payload
 */
export function validateVoucherRulePayload(payload: unknown): {
  success: boolean;
  data?: VoucherRulePayloadInput;
  errors?: z.ZodError;
} {
  const result = voucherRulePayloadSchema.safeParse(payload);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Safely parse a voucher rule payload
 */
export function safeParseVoucherRulePayload(payload: unknown): VoucherRulePayloadInput | null {
  const result = voucherRulePayloadSchema.safeParse(payload);
  return result.success ? result.data : null;
}

/**
 * Validate a complete rule set
 */
export function validateVoucherRuleSet(ruleSet: unknown): {
  success: boolean;
  data?: VoucherRuleSetInput;
  errors?: z.ZodError;
} {
  const result = voucherRuleSetSchema.safeParse(ruleSet);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Validate rule creation input
 */
export function validateCreateVoucherRuleInput(input: unknown): {
  success: boolean;
  data?: CreateVoucherRuleInput;
  errors?: z.ZodError;
} {
  const result = createVoucherRuleInputSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Validate rule update input
 */
export function validateUpdateVoucherRuleInput(input: unknown): {
  success: boolean;
  data?: UpdateVoucherRuleInput;
  errors?: z.ZodError;
} {
  const result = updateVoucherRuleInputSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}
