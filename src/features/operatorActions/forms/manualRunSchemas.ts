/**
 * Operator Actions - Manual Run Schemas
 * Zod schemas for validating manual operation inputs
 */

import { z } from 'zod';

// =============================================================================
// SEARCH CRAWL SCHEMA
// =============================================================================

/** Schema for manual search crawl request */
export const manualSearchCrawlSchema = z.object({
  keywords: z
    .array(z.string().min(1).max(100))
    .min(1, 'At least one keyword is required')
    .max(20, 'Maximum 20 keywords allowed')
    .optional()
    .default([]),
  categoryIds: z
    .array(z.string().uuid())
    .max(10, 'Maximum 10 categories allowed')
    .optional()
    .default([]),
  limit: z
    .number()
    .int()
    .min(1, 'Minimum limit is 1')
    .max(1000, 'Maximum limit is 1000')
    .optional()
    .default(100),
  sources: z
    .array(z.string())
    .max(5, 'Maximum 5 sources allowed')
    .optional()
    .default(['shopee', 'lazada']),
});

/** Type for manual search crawl input */
export type ManualSearchCrawlInput = z.infer<typeof manualSearchCrawlSchema>;

// =============================================================================
// FLASH SALE CRAWL SCHEMA
// =============================================================================

/** Schema for manual flash sale crawl request */
export const manualFlashSaleCrawlSchema = z.object({
  source: z
    .string()
    .min(1, 'Source is required')
    .optional()
    .default('shopee'),
  categoryIds: z
    .array(z.string().uuid())
    .max(10, 'Maximum 10 categories allowed')
    .optional()
    .default([]),
  limit: z
    .number()
    .int()
    .min(1, 'Minimum limit is 1')
    .max(500, 'Maximum limit is 500')
    .optional()
    .default(50),
});

/** Type for manual flash sale crawl input */
export type ManualFlashSaleCrawlInput = z.infer<typeof manualFlashSaleCrawlSchema>;

// =============================================================================
// AI ENRICHMENT SCHEMA
// =============================================================================

/** Schema for manual AI enrichment request */
export const manualAiEnrichmentSchema = z.object({
  productIds: z
    .array(z.string().uuid())
    .min(1, 'At least one product ID is required')
    .max(100, 'Maximum 100 products allowed')
    .optional()
    .default([]),
  categoryIds: z
    .array(z.string().uuid())
    .max(10, 'Maximum 10 categories allowed')
    .optional()
    .default([]),
  priority: z
    .enum(['high', 'normal', 'low'])
    .optional()
    .default('normal'),
  forceRefresh: z
    .boolean()
    .optional()
    .default(false),
});

/** Type for manual AI enrichment input */
export type ManualAiEnrichmentInput = z.infer<typeof manualAiEnrichmentSchema>;

// =============================================================================
// PUBLISH PREPARATION SCHEMA
// =============================================================================

/** Schema for manual publish preparation request */
export const manualPublishPreparationSchema = z.object({
  productIds: z
    .array(z.string().uuid())
    .max(200, 'Maximum 200 products allowed')
    .optional()
    .default([]),
  channels: z
    .array(z.enum(['facebook', 'tiktok', 'website', 'instagram']))
    .min(1, 'At least one channel is required')
    .max(4, 'Maximum 4 channels allowed'),
  scheduledTime: z
    .string()
    .datetime({ message: 'Invalid ISO 8601 datetime' })
    .optional(),
  dryRun: z
    .boolean()
    .optional()
    .default(false),
});

/** Type for manual publish preparation input */
export type ManualPublishPreparationInput = z.infer<typeof manualPublishPreparationSchema>;

// =============================================================================
// PUBLISHER RUN SCHEMA
// =============================================================================

/** Schema for manual publisher run request */
export const manualPublisherRunSchema = z.object({
  channels: z
    .array(z.enum(['facebook', 'tiktok', 'website', 'instagram']))
    .min(1, 'At least one channel is required')
    .max(4, 'Maximum 4 channels allowed'),
  publishType: z
    .enum(['immediate', 'scheduled'])
    .optional()
    .default('immediate'),
  scheduledTime: z
    .string()
    .datetime({ message: 'Invalid ISO 8601 datetime' })
    .optional(),
  dryRun: z
    .boolean()
    .optional()
    .default(false),
}).refine(
  (data) => {
    if (data.publishType === 'scheduled' && !data.scheduledTime) {
      return false;
    }
    return true;
  },
  {
    message: 'Scheduled time is required when publish type is scheduled',
    path: ['scheduledTime'],
  }
);

/** Type for manual publisher run input */
export type ManualPublisherRunInput = z.infer<typeof manualPublisherRunSchema>;

// =============================================================================
// VALIDATION FUNCTION
// =============================================================================

/**
 * Validate manual operation input against schema
 */
export function validateManualOperationInput<T extends z.ZodType>(
  schema: T,
  data: unknown
): {
  success: boolean;
  data?: z.infer<T>;
  errors?: Array<{ path: string; message: string }>;
} {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));

  return { success: false, errors };
}

/**
 * Get default values for a schema
 */
export function getDefaultValues<T extends z.ZodType>(
  schema: T
): z.infer<T> {
  return schema.parse({});
}

// =============================================================================
// SCHEMA MAP
// =============================================================================

/** Map of action types to their schemas */
export const MANUAL_OPERATION_SCHEMAS: Record<string, z.ZodType> = {
  TRIGGER_FLASH_SALE_CRAWL: manualFlashSaleCrawlSchema,
  TRIGGER_SEARCH_CRAWL: manualSearchCrawlSchema,
  TRIGGER_AI_ENRICHMENT: manualAiEnrichmentSchema,
  TRIGGER_PUBLISH_PREPARATION: manualPublishPreparationSchema,
  TRIGGER_PUBLISHER_RUN: manualPublisherRunSchema,
};
