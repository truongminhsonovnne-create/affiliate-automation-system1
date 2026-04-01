/**
 * Dashboard Filter Schemas
 *
 * Zod validation schemas for dashboard query filters.
 * Production-grade validation for all dashboard endpoints.
 */

import { z } from 'zod';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_TIME_RANGE,
  DEFAULT_ACTIVITY_LIMIT,
  MAX_ACTIVITY_LIMIT,
  DEFAULT_TREND_BUCKET_SIZE,
  MAX_SEARCH_QUERY_LENGTH,
  MIN_SEARCH_QUERY_LENGTH,
  MAX_DATE_RANGE_DAYS,
  MIN_DATE_RANGE_DAYS,
  ALLOWED_SORT_FIELDS,
} from '../constants.js';

// =============================================================================
// BASE SCHEMAS
// =============================================================================

/** UUID schema (optional) */
export const uuidOptionalSchema = z.string().uuid().optional();

/** UUID schema (required) */
export const uuidSchema = z.string().uuid();

/** Time range schema */
export const timeRangeSchema = z.enum(['1h', '6h', '24h', '7d', '30d', 'custom']);

/** Sort direction schema */
export const sortDirectionSchema = z.enum(['asc', 'desc']);

/** ISO date string schema */
export const isoDateSchema = z.string().datetime({ message: 'Invalid ISO date string' });

/** Date range schema */
export const dateRangeSchema = z.object({
  start: isoDateSchema,
  end: isoDateSchema,
});

/** Pagination input schema */
export const paginationInputSchema = z.object({
  page: z.number().int().positive().default(DEFAULT_PAGE).optional(),
  pageSize: z.number().int().min(MIN_PAGE_SIZE).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE).optional(),
});

/** Sort input schema */
export const sortInputSchema = z.object({
  field: z.string().optional(),
  direction: sortDirectionSchema.default(DEFAULT_SORT_DIRECTION).optional(),
});

// =============================================================================
// ACTIVITY SCHEMAS
// =============================================================================

/** Activity query input schema */
export const activityQueryInputSchema = z.object({
  ...paginationInputSchema.shape,
  ...sortInputSchema.shape,
  timeRange: timeRangeSchema.default(DEFAULT_TIME_RANGE).optional(),
  customTimeRange: dateRangeSchema.optional(),
  type: z.string().optional(),
  severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
  source: z.enum(['crawler', 'publisher', 'ai_enrichment', 'system', 'admin']).optional(),
  search: z
    .string()
    .min(MIN_SEARCH_QUERY_LENGTH)
    .max(MAX_SEARCH_QUERY_LENGTH)
    .optional(),
});

/** Validate activity query */
export function validateActivityQuery(data: unknown) {
  return activityQueryInputSchema.safeParse(data);
}

// =============================================================================
// OVERVIEW SCHEMAS
// =============================================================================

/** Overview query input schema */
export const overviewQueryInputSchema = z.object({
  timeRange: timeRangeSchema.default(DEFAULT_TIME_RANGE).optional(),
  customTimeRange: dateRangeSchema.optional(),
  refresh: z.boolean().optional(),
});

/** Validate overview query */
export function validateOverviewQuery(data: unknown) {
  return overviewQueryInputSchema.safeParse(data);
}

// =============================================================================
// TREND SCHEMAS
// =============================================================================

/** Trend query input schema */
export const trendQueryInputSchema = z.object({
  timeRange: timeRangeSchema.default(DEFAULT_TIME_RANGE).optional(),
  customTimeRange: dateRangeSchema.optional(),
  bucketSize: z.enum(['hour', 'day']).default(DEFAULT_TREND_BUCKET_SIZE).optional(),
  metric: z.string().optional(),
});

/** Validate trend query */
export function validateTrendQuery(data: unknown) {
  return trendQueryInputSchema.safeParse(data);
}

// =============================================================================
// PRODUCT LIST SCHEMAS
// =============================================================================

/** Product list filters schema */
export const productListFiltersSchema = z.object({
  status: z.union([z.string(), z.array(z.string())]).optional(),
  source: z.union([z.string(), z.array(z.string())]).optional(),
  categoryId: z.string().optional(),
  hasAiContent: z.boolean().optional(),
  hasPublished: z.boolean().optional(),
  search: z
    .string()
    .min(MIN_SEARCH_QUERY_LENGTH)
    .max(MAX_SEARCH_QUERY_LENGTH)
    .optional(),
});

/** Product list query schema */
export const productListQuerySchema = z.object({
  ...paginationInputSchema.shape,
  ...sortInputSchema.shape,
  timeRange: timeRangeSchema.default(DEFAULT_TIME_RANGE).optional(),
  customTimeRange: dateRangeSchema.optional(),
  ...productListFiltersSchema.shape,
});

/** Validate product list query */
export function validateProductListQuery(data: unknown) {
  return productListQuerySchema.safeParse(data);
}

/** Product detail query schema */
export const productDetailQuerySchema = z.object({
  productId: uuidSchema,
});

/** Validate product detail query */
export function validateProductDetailQuery(data: unknown) {
  return productDetailQuerySchema.safeParse(data);
}

// =============================================================================
// CRAWL JOB LIST SCHEMAS
// =============================================================================

/** Crawl job list filters schema */
export const crawlJobListFiltersSchema = z.object({
  status: z.union([z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']), z.array(z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']))]).optional(),
  type: z.union([z.enum(['flash_sale', 'search', 'product', 'shop']), z.array(z.enum(['flash_sale', 'search', 'product', 'shop']))]).optional(),
  source: z.string().optional(),
  shopId: z.string().optional(),
  keyword: z.string().optional(),
  search: z
    .string()
    .min(MIN_SEARCH_QUERY_LENGTH)
    .max(MAX_SEARCH_QUERY_LENGTH)
    .optional(),
});

/** Crawl job list query schema */
export const crawlJobListQuerySchema = z.object({
  ...paginationInputSchema.shape,
  ...sortInputSchema.shape,
  timeRange: timeRangeSchema.default(DEFAULT_TIME_RANGE).optional(),
  customTimeRange: dateRangeSchema.optional(),
  ...crawlJobListFiltersSchema.shape,
});

/** Validate crawl job list query */
export function validateCrawlJobListQuery(data: unknown) {
  return crawlJobListQuerySchema.safeParse(data);
}

/** Crawl job detail query schema */
export const crawlJobDetailQuerySchema = z.object({
  jobId: z.string().min(1),
});

/** Validate crawl job detail query */
export function validateCrawlJobDetailQuery(data: unknown) {
  return crawlJobDetailQuerySchema.safeParse(data);
}

// =============================================================================
// PUBLISH JOB LIST SCHEMAS
// =============================================================================

/** Publish job list filters schema */
export const publishJobListFiltersSchema = z.object({
  status: z.union([z.string(), z.array(z.string())]).optional(),
  channel: z.union([z.enum(['tiktok', 'facebook', 'website']), z.array(z.enum(['tiktok', 'facebook', 'website']))]).optional(),
  priority: z.union([z.number().int(), z.array(z.number().int())]).optional(),
  claimedBy: z.string().optional(),
  search: z
    .string()
    .min(MIN_SEARCH_QUERY_LENGTH)
    .max(MAX_SEARCH_QUERY_LENGTH)
    .optional(),
});

/** Publish job list query schema */
export const publishJobListQuerySchema = z.object({
  ...paginationInputSchema.shape,
  ...sortInputSchema.shape,
  timeRange: timeRangeSchema.default(DEFAULT_TIME_RANGE).optional(),
  customTimeRange: dateRangeSchema.optional(),
  ...publishJobListFiltersSchema.shape,
});

/** Validate publish job list query */
export function validatePublishJobListQuery(data: unknown) {
  return publishJobListQuerySchema.safeParse(data);
}

/** Publish job detail query schema */
export const publishJobDetailQuerySchema = z.object({
  jobId: z.string().min(1),
});

/** Validate publish job detail query */
export function validatePublishJobDetailQuery(data: unknown) {
  return publishJobDetailQuerySchema.safeParse(data);
}

// =============================================================================
// CREATE PUBLISH JOB SCHEMA
// =============================================================================

/** Platform enum */
const platformEnum = z.enum(['shopee', 'lazada', 'tiktok', 'tiki']);

/** Channel enum (expanded from the list filter) */
const channelEnum = z.enum(['website', 'blog', 'tiktok', 'facebook', 'seo', 'email']);

/** Content type enum */
const contentTypeEnum = z.enum(['deal', 'voucher', 'product', 'seo_article', 'social']);

/** Source type enum */
const sourceTypeEnum = z.enum(['masoffer', 'accesstrade', 'crawl', 'manual']);

/** Create publish job request body schema */
export const createPublishJobBodySchema = z.object({
  /** Platform — required */
  platform: platformEnum,

  /** Content type — optional */
  contentType: contentTypeEnum.optional(),

  /** Source type — optional */
  sourceType: sourceTypeEnum.optional(),

  /** Comma-separated product IDs, or undefined for all products of the platform */
  productIds: z.string().optional(),

  /**
   * Scheduled publish time.
   * - ISO timestamp string → schedule at that time
   * - null                   → run immediately
   * - undefined              → run immediately
   */
  scheduledAt: z.string().datetime().nullish(),

  /** Target channel — defaults to 'website' */
  channel: channelEnum.optional().default('website'),

  /** Priority 0–10 — defaults to 5 */
  priority: z.number().int().min(0).max(10).optional().default(5),

  /** Optional job title override */
  title: z.string().max(500).optional(),

  /** Optional job description / notes */
  description: z.string().max(2000).optional(),
});

/** Validate create publish job body */
export function validateCreatePublishJobBody(data: unknown) {
  return createPublishJobBodySchema.safeParse(data);
}

// =============================================================================
// AI CONTENT LIST SCHEMAS
// =============================================================================

/** AI content list filters schema */
export const aiContentListFiltersSchema = z.object({
  status: z.union([z.enum(['pending', 'processing', 'completed', 'failed']), z.array(z.enum(['pending', 'processing', 'completed', 'failed']))]).optional(),
  model: z.string().optional(),
  promptVersion: z.string().optional(),
  hasProduct: z.boolean().optional(),
  search: z
    .string()
    .min(MIN_SEARCH_QUERY_LENGTH)
    .max(MAX_SEARCH_QUERY_LENGTH)
    .optional(),
});

/** AI content list query schema */
export const aiContentListQuerySchema = z.object({
  ...paginationInputSchema.shape,
  ...sortInputSchema.shape,
  timeRange: timeRangeSchema.default(DEFAULT_TIME_RANGE).optional(),
  customTimeRange: dateRangeSchema.optional(),
  ...aiContentListFiltersSchema.shape,
});

/** Validate AI content list query */
export function validateAiContentListQuery(data: unknown) {
  return aiContentListQuerySchema.safeParse(data);
}

/** AI content detail query schema */
export const aiContentDetailQuerySchema = z.object({
  contentId: uuidSchema,
});

/** Validate AI content detail query */
export function validateAiContentDetailQuery(data: unknown) {
  return aiContentDetailQuerySchema.safeParse(data);
}

// =============================================================================
// DEAD LETTER LIST SCHEMAS
// =============================================================================

/** Dead letter list filters schema */
export const deadLetterListFiltersSchema = z.object({
  status: z.union([z.enum(['quarantined', 'review', 'resolved', 'discarded']), z.array(z.enum(['quarantined', 'review', 'resolved', 'discarded']))]).optional(),
  jobType: z.string().optional(),
  operation: z.string().optional(),
  errorCategory: z.string().optional(),
  search: z
    .string()
    .min(MIN_SEARCH_QUERY_LENGTH)
    .max(MAX_SEARCH_QUERY_LENGTH)
    .optional(),
});

/** Dead letter list query schema */
export const deadLetterListQuerySchema = z.object({
  ...paginationInputSchema.shape,
  ...sortInputSchema.shape,
  timeRange: timeRangeSchema.default(DEFAULT_TIME_RANGE).optional(),
  customTimeRange: dateRangeSchema.optional(),
  ...deadLetterListFiltersSchema.shape,
});

/** Validate dead letter list query */
export function validateDeadLetterListQuery(data: unknown) {
  return deadLetterListQuerySchema.safeParse(data);
}

/** Dead letter detail query schema */
export const deadLetterDetailQuerySchema = z.object({
  id: z.string().min(1),
});

/** Validate dead letter detail query */
export function validateDeadLetterDetailQuery(data: unknown) {
  return deadLetterDetailQuerySchema.safeParse(data);
}

// =============================================================================
// WORKER LIST SCHEMAS
// =============================================================================

/** Worker list filters schema */
export const workerListFiltersSchema = z.object({
  status: z.union([z.enum(['active', 'idle', 'stale', 'offline']), z.array(z.enum(['active', 'idle', 'stale', 'offline']))]).optional(),
  type: z.string().optional(),
});

/** Worker list query schema */
export const workerListQuerySchema = z.object({
  ...paginationInputSchema.shape,
  ...sortInputSchema.shape,
  ...workerListFiltersSchema.shape,
});

/** Validate worker list query */
export function validateWorkerListQuery(data: unknown) {
  return workerListQuerySchema.safeParse(data);
}

/** Worker detail query schema */
export const workerDetailQuerySchema = z.object({
  workerIdentity: z.string().min(1),
});

/** Validate worker detail query */
export function validateWorkerDetailQuery(data: unknown) {
  return workerDetailQuerySchema.safeParse(data);
}

// =============================================================================
// FAILURE INSIGHTS SCHEMAS
// =============================================================================

/** Failure insights query schema */
export const failureInsightsQuerySchema = z.object({
  timeRange: timeRangeSchema.default(DEFAULT_TIME_RANGE).optional(),
  customTimeRange: dateRangeSchema.optional(),
  limit: z.number().int().min(1).max(20).default(10).optional(),
});

/** Validate failure insights query */
export function validateFailureInsightsQuery(data: unknown) {
  return failureInsightsQuerySchema.safeParse(data);
}

// =============================================================================
// GENERIC VALIDATORS
// =============================================================================

/** Validate time range */
export function validateTimeRange(data: unknown) {
  return timeRangeSchema.safeParse(data);
}

/** Validate date range */
export function validateDateRange(data: unknown) {
  return dateRangeSchema.safeParse(data);
}

/** Validate pagination */
export function validatePagination(data: unknown) {
  return paginationInputSchema.safeParse(data);
}

/** Validate sort input */
export function validateSortInput(data: unknown, allowedFields: readonly string[]) {
  const schema = sortInputSchema.extend({
    field: z.enum(allowedFields as [string, ...string[]]).optional(),
  });
  return schema.safeParse(data);
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ValidatedActivityQuery = z.infer<typeof activityQueryInputSchema>;
export type ValidatedOverviewQuery = z.infer<typeof overviewQueryInputSchema>;
export type ValidatedTrendQuery = z.infer<typeof trendQueryInputSchema>;
export type ValidatedProductListQuery = z.infer<typeof productListQuerySchema>;
export type ValidatedProductDetailQuery = z.infer<typeof productDetailQuerySchema>;
export type ValidatedCrawlJobListQuery = z.infer<typeof crawlJobListQuerySchema>;
export type ValidatedCrawlJobDetailQuery = z.infer<typeof crawlJobDetailQuerySchema>;
export type ValidatedPublishJobListQuery = z.infer<typeof publishJobListQuerySchema>;
export type ValidatedPublishJobDetailQuery = z.infer<typeof publishJobDetailQuerySchema>;
export type ValidatedAiContentListQuery = z.infer<typeof aiContentListQuerySchema>;
export type ValidatedAiContentDetailQuery = z.infer<typeof aiContentDetailQuerySchema>;
export type ValidatedDeadLetterListQuery = z.infer<typeof deadLetterListQuerySchema>;
export type ValidatedDeadLetterDetailQuery = z.infer<typeof deadLetterDetailQuerySchema>;
export type ValidatedWorkerListQuery = z.infer<typeof workerListQuerySchema>;
export type ValidatedWorkerDetailQuery = z.infer<typeof workerDetailQuerySchema>;
export type ValidatedFailureInsightsQuery = z.infer<typeof failureInsightsQuerySchema>;
