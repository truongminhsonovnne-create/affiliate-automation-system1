// =============================================================================
// Voucher Data API Types
// Production-grade DTO/contracts for voucher data API layer
// =============================================================================

import { z } from 'zod';

// =============================================================================
// Catalog API Types
// =============================================================================

export const voucherCatalogQuerySchema = z.object({
  platform: z.enum(['shopee', 'lazada', 'tiktok', 'general']).optional(),
  isActive: z.boolean().optional(),
  freshnessStatus: z.enum(['fresh', 'stale', 'expired', 'unknown']).optional(),
  sourceId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export type VoucherCatalogQuery = z.infer<typeof voucherCatalogQuerySchema>;

export const voucherCatalogEntrySchema = z.object({
  id: z.string().uuid(),
  externalId: z.string(),
  sourceId: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  platform: z.enum(['shopee', 'lazada', 'tiktok', 'general']),
  discountType: z.enum(['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y', 'other']),
  discountValue: z.number(),
  minSpend: z.number().nullable(),
  maxDiscount: z.number().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean(),
  scope: z.enum(['global', 'shop', 'category', 'product', '特定商品', '特定店铺', '特定分类']),
  applicableShopIds: z.array(z.string()),
  applicableCategoryIds: z.array(z.string()),
  applicableProductIds: z.array(z.string()),
  freshnessStatus: z.enum(['fresh', 'stale', 'expired', 'unknown']),
  qualityScore: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type VoucherCatalogEntry = z.infer<typeof voucherCatalogEntrySchema>;

export const paginatedVoucherCatalogResponseSchema = z.object({
  data: z.array(voucherCatalogEntrySchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasMore: z.boolean(),
});

export type PaginatedVoucherCatalogResponse = z.infer<typeof paginatedVoucherCatalogResponseSchema>;

// =============================================================================
// Ingestion API Types
// =============================================================================

export const ingestVouchersRequestSchema = z.object({
  sourceId: z.string().uuid(),
  vouchers: z.array(z.record(z.unknown())),
  options: z
    .object({
      skipValidation: z.boolean().optional(),
      skipNormalization: z.boolean().optional(),
      triggeredBy: z.string().optional(),
    })
    .optional(),
});

export type IngestVouchersRequest = z.infer<typeof ingestVouchersRequestSchema>;

export const ingestVouchersResponseSchema = z.object({
  success: z.boolean(),
  runId: z.string().uuid(),
  itemsSeen: z.number(),
  itemsInserted: z.number(),
  itemsUpdated: z.number(),
  itemsSkipped: z.number(),
  itemsFailed: z.number(),
  errors: z
    .array(
      z.object({
        itemIndex: z.number(),
        itemExternalId: z.string().optional(),
        errorCode: z.string(),
        errorMessage: z.string(),
        recoverable: z.boolean(),
      })
    )
    .optional(),
  duration: z.number(),
});

export type IngestVouchersResponse = z.infer<typeof ingestVouchersResponseSchema>;

// =============================================================================
// Rule API Types
// =============================================================================

export const createRuleRequestSchema = z.object({
  voucherId: z.string().uuid(),
  ruleVersion: z.string(),
  rulePayload: z.record(z.unknown()),
  createdBy: z.string().optional(),
});

export type CreateRuleRequest = z.infer<typeof createRuleRequestSchema>;

export const updateRuleRequestSchema = z.object({
  ruleVersion: z.string().optional(),
  rulePayload: z.record(z.unknown()).optional(),
  createdBy: z.string().optional(),
});

export type UpdateRuleRequest = z.infer<typeof updateRuleRequestSchema>;

export const activateRuleRequestSchema = z.object({
  activatedBy: z.string().optional(),
});

export type ActivateRuleRequest = z.infer<typeof activateRuleRequestSchema>;

export const archiveRuleRequestSchema = z.object({
  archivedBy: z.string().optional(),
});

export type ArchiveRuleRequest = z.infer<typeof archiveRuleRequestSchema>;

export const ruleResponseSchema = z.object({
  id: z.string().uuid(),
  voucherId: z.string().uuid(),
  ruleVersion: z.string(),
  ruleStatus: z.enum(['draft', 'active', 'archived', 'superseded']),
  rulePayload: z.record(z.unknown()),
  validationStatus: z.enum(['pending', 'valid', 'invalid', 'warning']),
  validationErrors: z.array(z.any()).nullable(),
  createdBy: z.string().nullable(),
  activatedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RuleResponse = z.infer<typeof ruleResponseSchema>;

// =============================================================================
// Evaluation API Types
// =============================================================================

export const evaluateVoucherRequestSchema = z.object({
  platform: z.enum(['shopee', 'lazada', 'tiktok', 'general']),
  requestInput: z.record(z.unknown()),
  expectedVoucherIds: z.array(z.string().uuid()).optional(),
  resolvedVoucherIds: z.array(z.string().uuid()),
  bestVoucherId: z.string().uuid().optional(),
  rankingScores: z.record(z.number()).optional(),
});

export type EvaluateVoucherRequest = z.infer<typeof evaluateVoucherRequestSchema>;

export const evaluateVoucherResponseSchema = z.object({
  id: z.string().uuid(),
  platform: z.enum(['shopee', 'lazada', 'tiktok', 'general']),
  evaluationStatus: z.enum(['pending', 'success', 'partial', 'failed', 'no_expectation']),
  qualityScore: z.number().nullable(),
  qualityMetrics: z
    .object({
      bestMatchAccuracy: z.number(),
      topKRecall: z.number(),
      topKPrecision: z.number(),
      rankingDiscount: z.number(),
      rankingCorrelation: z.number(),
      falsePositiveHints: z.array(z.string()),
      falseNegativeHints: z.array(z.string()),
      coverageScore: z.number(),
      confidenceScore: z.number(),
    })
    .nullable(),
  createdAt: z.string(),
});

export type EvaluateVoucherResponse = z.infer<typeof evaluateVoucherResponseSchema>;

// =============================================================================
// Source API Types
// =============================================================================

export const sourceResponseSchema = z.object({
  id: z.string().uuid(),
  sourceName: z.string(),
  sourceType: z.enum(['manual', 'import_file', 'api_sync', 'partner_feed', 'internal']),
  platform: z.enum(['shopee', 'lazada', 'tiktok', 'general']),
  sourceConfig: z.record(z.unknown()).nullable(),
  isActive: z.boolean(),
  lastSyncedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SourceResponse = z.infer<typeof sourceResponseSchema>;

// =============================================================================
// Ingestion Run API Types
// =============================================================================

export const ingestionRunResponseSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  runStatus: z.enum(['running', 'completed', 'completed_with_errors', 'failed', 'cancelled']),
  itemsSeen: z.number(),
  itemsInserted: z.number(),
  itemsUpdated: z.number(),
  itemsSkipped: z.number(),
  itemsFailed: z.number(),
  errorSummary: z.string().nullable(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type IngestionRunResponse = z.infer<typeof ingestionRunResponseSchema>;

// =============================================================================
// Override API Types
// =============================================================================

export const createOverrideRequestSchema = z.object({
  voucherId: z.string().uuid(),
  overrideType: z.enum(['eligibility', 'ranking', 'visibility', 'exclusion', 'priority']),
  overridePayload: z.record(z.unknown()),
  createdBy: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export type CreateOverrideRequest = z.infer<typeof createOverrideRequestSchema>;

export const overrideResponseSchema = z.object({
  id: z.string().uuid(),
  voucherId: z.string().uuid(),
  overrideType: z.enum(['eligibility', 'ranking', 'visibility', 'exclusion', 'priority']),
  overridePayload: z.record(z.unknown()),
  overrideStatus: z.enum(['active', 'expired', 'cancelled']),
  createdBy: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type OverrideResponse = z.infer<typeof overrideResponseSchema>;
