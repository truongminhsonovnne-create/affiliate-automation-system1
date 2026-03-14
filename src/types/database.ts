/**
 * Database Types for Affiliate Automation System
 *
 * Type definitions matching the new schema with 3 tables:
 * - affiliate_products
 * - affiliate_contents
 * - crawl_jobs
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const PlatformEnum = ['shopee', 'tiki', 'lazada', 'tiktok', 'other'] as const;
export type Platform = typeof PlatformEnum[number];

export const SourceTypeEnum = ['flash_sale', 'search', 'category', 'manual'] as const;
export type SourceType = typeof SourceTypeEnum[number];

export const JobStatusEnum = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const;
export type JobStatus = typeof JobStatusEnum[number];

export const RecommendationEnum = ['highly_recommended', 'recommended', 'neutral', 'not_recommended'] as const;
export type Recommendation = typeof RecommendationEnum[number];

// ============================================
// affiliate_products Table
// ============================================

export const AffiliateProductSchema = z.object({
  id: z.string().uuid(),
  platform: z.string(),
  external_product_id: z.string().nullable(),
  title: z.string(),
  price: z.number().nullable(),
  image_url: z.string().nullable(),
  original_description: z.string().nullable(),
  product_url: z.string(),
  source_type: z.string(),
  source_keyword: z.string().nullable(),
  crawled_at: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  original_price: z.number().nullable(),
  shop_name: z.string().nullable(),
  rating: z.number().nullable(),
  review_count: z.number().int().nullable(),
  sold_count: z.number().int().nullable(),
  category: z.string().nullable(),
});

export type AffiliateProduct = z.infer<typeof AffiliateProductSchema>;

export interface CreateAffiliateProductDTO {
  platform: string;
  external_product_id?: string;
  title: string;
  price?: number;
  image_url?: string;
  original_description?: string;
  product_url: string;
  source_type: string;
  source_keyword?: string;
  crawled_at: string | Date;
  original_price?: number;
  shop_name?: string;
  rating?: number;
  review_count?: number;
  sold_count?: number;
  category?: string;
}

// ============================================
// affiliate_contents Table
// ============================================

export const AffiliateContentSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  rewritten_title: z.string().nullable(),
  review_content: z.string().nullable(),
  social_caption: z.string().nullable(),
  hashtags: z.array(z.string()).nullable(),
  ai_model: z.string().nullable(),
  prompt_version: z.string().nullable(),
  confidence_score: z.number().nullable(),
  trending_score: z.number().nullable(),
  recommendation: z.string().nullable(),
  created_at: z.string().datetime(),
});

export type AffiliateContent = z.infer<typeof AffiliateContentSchema>;

export interface CreateAffiliateContentDTO {
  product_id: string;
  rewritten_title?: string;
  review_content?: string;
  social_caption?: string;
  hashtags?: string[];
  ai_model?: string;
  prompt_version?: string;
  confidence_score?: number;
  trending_score?: number;
  recommendation?: string;
}

// ============================================
// crawl_jobs Table
// ============================================

export const CrawlJobSchema = z.object({
  id: z.string().uuid(),
  platform: z.string(),
  source_type: z.string(),
  source_keyword: z.string().nullable(),
  status: z.string(),
  items_found: z.number().int(),
  items_crawled: z.number().int(),
  items_failed: z.number().int(),
  error_message: z.string().nullable(),
  started_at: z.string().datetime(),
  finished_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});

export type CrawlJob = z.infer<typeof CrawlJobSchema>;

export interface CreateCrawlJobDTO {
  platform: string;
  source_type: string;
  source_keyword?: string;
  status?: string;
}

export interface UpdateCrawlJobDTO {
  status?: string;
  items_found?: number;
  items_crawled?: number;
  items_failed?: number;
  error_message?: string;
  finished_at?: string | Date;
}

// ============================================
// Type Exports
// ============================================

export type {
  Platform,
  SourceType,
  JobStatus,
  Recommendation,
};
