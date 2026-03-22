/**
 * Validation Schemas
 *
 * Production-grade validation schemas using Zod for request validation.
 */

import { z } from 'zod';
import {
  MAX_URL_LENGTH,
  MAX_KEYWORD_LENGTH,
  MAX_REASON_LENGTH,
  MAX_RESOLUTION_LENGTH,
  MAX_PUBLISH_PREPARE_BATCH,
  MAX_PUBLISHER_RUN_JOBS,
  UUID_PATTERN,
} from '../constants.js';

// Common schemas
export const uuidSchema = z.string().regex(UUID_PATTERN, 'Invalid UUID format');

export const uuidOptionalSchema = z.string().regex(UUID_PATTERN).optional();

export const pageSchema = z.number().int().positive().default(1);

export const pageSizeSchema = z.number().int().positive().max(100).default(20);

export const sinceSchema = z.string().datetime().optional();

export const untilSchema = z.string().datetime().optional();

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

// Manual crawl request schemas
export const manualCrawlRequestSchema = z.object({
  shopId: uuidOptionalSchema,
  url: z.string().max(MAX_URL_LENGTH).url().optional(),
  priority: z.number().int().min(1).max(10).optional(),
  options: z.object({
    forceRefresh: z.boolean().optional(),
    maxItems: z.number().int().positive().max(1000).optional(),
    categoryId: z.string().optional(),
  }).optional(),
}).refine(
  data => data.shopId || data.url,
  { message: 'Either shopId or url must be provided' }
);

export const manualSearchCrawlRequestSchema = z.object({
  keyword: z.string().min(1).max(MAX_KEYWORD_LENGTH),
  limit: z.number().int().positive().max(100).optional(),
  categoryId: z.string().optional(),
  options: z.object({
    forceRefresh: z.boolean().optional(),
    minPrice: z.number().positive().optional(),
    maxPrice: z.number().positive().optional(),
  }).optional(),
});

// AI enrichment request schemas
export const manualAiEnrichmentRequestSchema = z.object({
  productId: uuidSchema,
  forceRefresh: z.boolean().optional(),
});

export const batchAiEnrichmentRequestSchema = z.object({
  productIds: z.array(uuidSchema).min(1).max(50),
  options: z.object({
    forceRefresh: z.boolean().optional(),
    priority: z.number().int().min(1).max(10).optional(),
  }).optional(),
});

// Publishing request schemas
export const manualPublishPreparationRequestSchema = z.object({
  productIds: z.array(uuidSchema).min(1).max(MAX_PUBLISH_PREPARE_BATCH),
  channels: z.array(z.enum(['tiktok', 'facebook', 'website'])).optional(),
  options: z.object({
    forceReprepare: z.boolean().optional(),
    priority: z.number().int().min(1).max(10).optional(),
  }).optional(),
});

export const manualPublisherRunRequestSchema = z.object({
  channels: z.array(z.enum(['tiktok', 'facebook', 'website'])).optional(),
  limit: z.number().int().positive().max(MAX_PUBLISHER_RUN_JOBS).default(10),
  dryRun: z.boolean().default(false),
  options: z.object({
    concurrency: z.number().int().positive().max(10).optional(),
  }).optional(),
});

// Publish job operation schemas
export const retryPublishJobRequestSchema = z.object({
  jobId: uuidSchema,
  reason: z.string().max(MAX_REASON_LENGTH).optional(),
  options: z.object({
    force: z.boolean().optional(),
    resetAttempts: z.boolean().optional(),
  }).optional(),
});

export const cancelPublishJobRequestSchema = z.object({
  jobId: uuidSchema,
  reason: z.string().min(1).max(MAX_REASON_LENGTH),
  force: z.boolean().optional(),
});

export const unlockStalePublishJobRequestSchema = z.object({
  jobId: uuidSchema,
  reason: z.string().min(1).max(MAX_REASON_LENGTH),
  force: z.boolean().optional(),
});

// Dead letter schemas
export const requeueDeadLetterRequestSchema = z.object({
  deadLetterId: uuidSchema,
  options: z.object({
    maxRetries: z.number().int().positive().max(5).optional(),
    priority: z.number().int().min(1).max(10).optional(),
  }).optional(),
});

export const markDeadLetterResolvedRequestSchema = z.object({
  deadLetterId: uuidSchema,
  resolution: z.string().min(1).max(MAX_RESOLUTION_LENGTH),
  resolutionCategory: z.string().optional(),
});

// Query filter schemas
export const publishJobQueryFiltersSchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema,
  since: sinceSchema,
  until: untilSchema,
  status: z.union([z.string(), z.array(z.string())]).optional(),
  channel: z.enum(['tiktok', 'facebook', 'website']).optional(),
  priority: z.number().int().optional(),
  claimedBy: z.string().optional(),
  search: z.string().optional(),
});

export const crawlJobQueryFiltersSchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema,
  since: sinceSchema,
  until: untilSchema,
  type: z.enum(['flash_sale', 'search', 'product']).optional(),
  shopId: z.string().optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  search: z.string().optional(),
});

export const deadLetterQueryFiltersSchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema,
  since: sinceSchema,
  until: untilSchema,
  status: z.enum(['quarantined', 'review', 'resolved', 'discarded']).optional(),
  operation: z.string().optional(),
  errorCategory: z.string().optional(),
  search: z.string().optional(),
});

export const adminActionLogFiltersSchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema,
  since: sinceSchema,
  until: untilSchema,
  actorId: z.string().optional(),
  actionType: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  resultStatus: z.enum(['success', 'failure', 'rejected', 'skipped']).optional(),
  search: z.string().optional(),
});

// Validation functions
export function validateManualCrawlRequest(data: unknown) {
  return manualCrawlRequestSchema.safeParse(data);
}

export function validateManualSearchCrawlRequest(data: unknown) {
  return manualSearchCrawlRequestSchema.safeParse(data);
}

export function validateManualAiEnrichmentRequest(data: unknown) {
  return manualAiEnrichmentRequestSchema.safeParse(data);
}

export function validateBatchAiEnrichmentRequest(data: unknown) {
  return batchAiEnrichmentRequestSchema.safeParse(data);
}

export function validateManualPublishPreparationRequest(data: unknown) {
  return manualPublishPreparationRequestSchema.safeParse(data);
}

export function validateManualPublisherRunRequest(data: unknown) {
  return manualPublisherRunRequestSchema.safeParse(data);
}

export function validateRetryPublishJobRequest(data: unknown) {
  return retryPublishJobRequestSchema.safeParse(data);
}

export function validateCancelPublishJobRequest(data: unknown) {
  return cancelPublishJobRequestSchema.safeParse(data);
}

export function validateUnlockStalePublishJobRequest(data: unknown) {
  return unlockStalePublishJobRequestSchema.safeParse(data);
}

export function validateRequeueDeadLetterRequest(data: unknown) {
  return requeueDeadLetterRequestSchema.safeParse(data);
}

export function validateMarkDeadLetterResolvedRequest(data: unknown) {
  return markDeadLetterResolvedRequestSchema.safeParse(data);
}

export function validatePublishJobQueryFilters(data: unknown) {
  return publishJobQueryFiltersSchema.safeParse(data);
}

export function validateCrawlJobQueryFilters(data: unknown) {
  return crawlJobQueryFiltersSchema.safeParse(data);
}

export function validateDeadLetterQueryFilters(data: unknown) {
  return deadLetterQueryFiltersSchema.safeParse(data);
}

export function validateAdminActionLogFilters(data: unknown) {
  return adminActionLogFiltersSchema.safeParse(data);
}

// Export schema types
export type ValidatedManualCrawlRequest = z.infer<typeof manualCrawlRequestSchema>;
export type ValidatedManualSearchCrawlRequest = z.infer<typeof manualSearchCrawlRequestSchema>;
export type ValidatedManualAiEnrichmentRequest = z.infer<typeof manualAiEnrichmentRequestSchema>;
export type ValidatedBatchAiEnrichmentRequest = z.infer<typeof batchAiEnrichmentRequestSchema>;
export type ValidatedManualPublishPreparationRequest = z.infer<typeof manualPublishPreparationRequestSchema>;
export type ValidatedManualPublisherRunRequest = z.infer<typeof manualPublisherRunRequestSchema>;
export type ValidatedRetryPublishJobRequest = z.infer<typeof retryPublishJobRequestSchema>;
export type ValidatedCancelPublishJobRequest = z.infer<typeof cancelPublishJobRequestSchema>;
export type ValidatedUnlockStalePublishJobRequest = z.infer<typeof unlockStalePublishJobRequestSchema>;
export type ValidatedRequeueDeadLetterRequest = z.infer<typeof requeueDeadLetterRequestSchema>;
export type ValidatedMarkDeadLetterResolvedRequest = z.infer<typeof markDeadLetterResolvedRequestSchema>;
