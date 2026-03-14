/**
 * Product Types for Affiliate Automation System
 *
 * Pipeline flow:
 * ShopeeRawProduct -> NormalizedProduct -> AiProcessedProduct -> AffiliateProductRecord
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

/** Supported affiliate platforms */
export type SourceType = 'shopee' | 'tiki' | 'lazada' | 'tiktok' | 'other';

export const SourceTypeEnum = ['shopee', 'tiki', 'lazada', 'tiktok', 'other'] as const;

/** Product processing status in pipeline */
export type ProductStatus = 'pending' | 'normalized' | 'ai_processing' | 'ai_completed' | 'published' | 'failed';

export const ProductStatusEnum = ['pending', 'normalized', 'ai_processing', 'ai_completed', 'published', 'failed'] as const;

// ============================================
// Type 1: ShopeeRawProduct
// Raw data directly from crawler (before any processing)
// ============================================

export interface ShopeeRawProduct {
  /** Product title as displayed on Shopee */
  title: string;

  /** Price text (may contain currency symbols, formatting) */
  priceText: string;

  /** Main product image URL */
  imageUrl: string;

  /** Product description from Shopee */
  description?: string;

  /** Full product URL on Shopee */
  productUrl: string;

  /** Source platform type */
  sourceType: 'shopee';

  /** Keyword used to crawl this product */
  sourceKeyword: string;

  /** Timestamp when product was crawled */
  crawledAt: Date;

  /** Optional: Shop name */
  shopName?: string;

  /** Optional: Product ID on Shopee */
  shopeeProductId?: string;

  /** Optional: Rating */
  rating?: number;

  /** Optional: Number of reviews */
  reviewCount?: number;

  /** Optional: Number of items sold */
  soldCount?: number;
}

/** Zod schema for ShopeeRawProduct */
export const ShopeeRawProductSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  priceText: z.string().min(1, 'Price text is required'),
  imageUrl: z.string().url('Invalid image URL'),
  description: z.string().optional(),
  productUrl: z.string().url('Invalid product URL'),
  sourceType: z.literal('shopee'),
  sourceKeyword: z.string().min(1),
  crawledAt: z.date(),
  shopName: z.string().optional(),
  shopeeProductId: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
  soldCount: z.number().int().min(0).optional(),
});

// ============================================
// Type 2: NormalizedProduct
// Data after cleaning and normalization
// ============================================

export interface NormalizedProduct {
  /** Clean product title */
  title: string;

  /** Numeric price value (in VND) */
  price: number;

  /** Main product image URL (cleaned) */
  imageUrl: string;

  /** Cleaned product description */
  description?: string;

  /** Full product URL */
  productUrl: string;

  /** Source platform type */
  sourceType: SourceType;

  /** Keyword used to crawl this product */
  sourceKeyword: string;

  /** Timestamp when product was crawled */
  crawledAt: Date;

  /** Optional: Original price before discount */
  originalPrice?: number;

  /** Optional: Shop name */
  shopName?: string;

  /** Optional: Product ID on source platform */
  platformProductId?: string;

  /** Optional: Rating (0-5) */
  rating?: number;

  /** Optional: Number of reviews */
  reviewCount?: number;

  /** Optional: Number of items sold */
  soldCount?: number;

  /** Optional: Product category */
  category?: string;
}

/** Zod schema for NormalizedProduct */
export const NormalizedProductSchema = z.object({
  title: z.string().min(1),
  price: z.number().positive(),
  imageUrl: z.string().url(),
  description: z.string().optional(),
  productUrl: z.string().url(),
  sourceType: z.enum(SourceTypeEnum),
  sourceKeyword: z.string().min(1),
  crawledAt: z.date(),
  originalPrice: z.number().positive().optional(),
  shopName: z.string().optional(),
  platformProductId: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
  soldCount: z.number().int().min(0).optional(),
  category: z.string().optional(),
});

// ============================================
// Type 3: AiProcessedProduct
// Data after AI rewriting/processing
// ============================================

export interface AiProcessedProduct {
  /** Original product title (from crawler) */
  originalTitle: string;

  /** Original product description */
  originalDescription?: string;

  /** AI-rewritten product title (more engaging) */
  rewrittenTitle: string;

  /** AI-generated product review/recommendation content */
  reviewContent: string;

  /** AI-generated social media caption */
  socialCaption: string;

  /** Hashtags for social media */
  hashtags: string[];

  /** Optional: AI-generated pros/cons */
  pros?: string[];

  /** Optional: AI-generated pros/cons */
  cons?: string[];

  /** Optional: Target audience */
  targetAudience?: string;

  /** Optional: AI confidence score (0-1) */
  confidenceScore?: number;

  /** Optional: Trending score (0-1) */
  trendingScore?: number;

  /** Optional: AI recommendation level */
  recommendation?: 'highly_recommended' | 'recommended' | 'neutral' | 'not_recommended';

  /** Timestamp when AI processing completed */
  processedAt: Date;
}

/** Zod schema for AiProcessedProduct */
export const AiProcessedProductSchema = z.object({
  originalTitle: z.string().min(1),
  originalDescription: z.string().optional(),
  rewrittenTitle: z.string().min(1),
  reviewContent: z.string().min(1),
  socialCaption: z.string().min(1),
  hashtags: z.array(z.string()),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  trendingScore: z.number().min(0).max(1).optional(),
  recommendation: z.enum(['highly_recommended', 'recommended', 'neutral', 'not_recommended']).optional(),
  processedAt: z.date(),
});

// ============================================
// Type 4: AffiliateProductRecord
// Complete record for database storage (snake_case for DB columns)
// ============================================

export interface AffiliateProductRecord {
  /** Auto-generated UUID */
  id?: string;

  /** Product title (can be original or AI-rewritten) */
  title: string;

  /** Product price in VND */
  price: number;

  /** Main product image URL */
  image_url: string;

  /** Original product description from platform */
  original_description?: string;

  /** AI-rewritten product title */
  rewritten_title?: string;

  /** AI-generated review content */
  review_content?: string;

  /** AI-generated social media caption */
  social_caption?: string;

  /** Hashtags for social media (JSON array stored as text) */
  hashtags?: string;

  /** Full product URL on source platform */
  product_url: string;

  /** Source platform type */
  source_type: SourceType;

  /** Keyword used to find this product */
  source_keyword: string;

  /** When product was crawled */
  crawled_at: Date;

  /** When record was created in database */
  created_at?: Date;

  /** Optional: Original price before discount */
  original_price?: number;

  /** Optional: Shop name */
  shop_name?: string;

  /** Optional: Rating (0-5) */
  rating?: number;

  /** Optional: Number of reviews */
  review_count?: number;

  /** Optional: Number of items sold */
  sold_count?: number;

  /** Optional: Product category */
  category?: string;

  /** Current processing status */
  status?: ProductStatus;

  /** Optional: Error message if processing failed */
  error_message?: string;

  /** Optional: AI processing timestamp */
  processed_at?: Date;

  /** Optional: Confidence score from AI */
  confidence_score?: number;

  /** Optional: Trending score from AI */
  trending_score?: number;

  /** Optional: AI recommendation */
  recommendation?: string;
}

/** Zod schema for AffiliateProductRecord (database) */
export const AffiliateProductRecordSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  price: z.number().positive(),
  image_url: z.string().url(),
  original_description: z.string().optional(),
  rewritten_title: z.string().optional(),
  review_content: z.string().optional(),
  social_caption: z.string().optional(),
  hashtags: z.string().optional(), // JSON string
  product_url: z.string().url(),
  source_type: z.enum(SourceTypeEnum),
  source_keyword: z.string().min(1),
  crawled_at: z.date(),
  created_at: z.date().optional(),
  original_price: z.number().positive().optional(),
  shop_name: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  review_count: z.number().int().min(0).optional(),
  sold_count: z.number().int().min(0).optional(),
  category: z.string().optional(),
  status: z.enum(ProductStatusEnum).optional(),
  error_message: z.string().optional(),
  processed_at: z.date().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  trending_score: z.number().min(0).max(1).optional(),
  recommendation: z.string().optional(),
});

// ============================================
// Pipeline Flow Type Guards
// ============================================

/** Check if raw product is valid */
export function isValidShopeeRawProduct(data: unknown): data is ShopeeRawProduct {
  return ShopeeRawProductSchema.safeParse(data).success;
}

/** Check if normalized product is valid */
export function isValidNormalizedProduct(data: unknown): data is NormalizedProduct {
  return NormalizedProductSchema.safeParse(data).success;
}

/** Check if AI processed product is valid */
export function isValidAiProcessedProduct(data: unknown): data is AiProcessedProduct {
  return AiProcessedProductSchema.safeParse(data).success;
}

// ============================================
// Type Conversions
// ============================================

/** Convert ShopeeRawProduct to NormalizedProduct */
export function normalizeProduct(raw: ShopeeRawProduct): NormalizedProduct {
  // Parse price from priceText (e.g., "₫1.200.000" -> 1200000)
  const price = parsePrice(raw.priceText);

  return {
    title: raw.title.trim(),
    price,
    imageUrl: raw.imageUrl,
    description: raw.description?.trim(),
    productUrl: raw.productUrl,
    sourceType: raw.sourceType,
    sourceKeyword: raw.sourceKeyword,
    crawledAt: raw.crawledAt,
    shopName: raw.shopName,
    platformProductId: raw.shopeeProductId,
    rating: raw.rating,
    reviewCount: raw.reviewCount,
    soldCount: raw.soldCount,
  };
}

/** Convert NormalizedProduct to AffiliateProductRecord */
export function toAffiliateRecord(
  normalized: NormalizedProduct,
  aiProcessed?: AiProcessedProduct
): Omit<AffiliateProductRecord, 'id' | 'created_at'> {
  const base: Omit<AffiliateProductRecord, 'id' | 'created_at'> = {
    title: normalized.title,
    price: normalized.price,
    image_url: normalized.imageUrl,
    original_description: normalized.description,
    product_url: normalized.productUrl,
    source_type: normalized.sourceType,
    source_keyword: normalized.sourceKeyword,
    crawled_at: normalized.crawledAt,
    original_price: normalized.originalPrice,
    shop_name: normalized.shopName,
    rating: normalized.rating,
    review_count: normalized.reviewCount,
    sold_count: normalized.soldCount,
    category: normalized.category,
    status: 'pending',
  };

  if (aiProcessed) {
    return {
      ...base,
      rewritten_title: aiProcessed.rewrittenTitle,
      review_content: aiProcessed.reviewContent,
      social_caption: aiProcessed.socialCaption,
      hashtags: JSON.stringify(aiProcessed.hashtags),
      processed_at: aiProcessed.processedAt,
      confidence_score: aiProcessed.confidenceScore,
      trending_score: aiProcessed.trendingScore,
      recommendation: aiProcessed.recommendation,
      status: 'ai_completed',
    };
  }

  return base;
}

/** Parse price string to number */
export function parsePrice(priceText: string): number {
  // Remove currency symbol and non-numeric characters except dot
  const cleaned = priceText
    .replace(/[₫\$€£¥]/g, '')
    .replace(/[^\d.]/g, '')
    .trim();

  // Parse and return
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// ============================================
// Utility Types
// ============================================

/** Generic product with optional fields */
export type PartialProduct<T extends keyof AffiliateProductRecord = never> = Omit<
  Partial<AffiliateProductRecord>,
  T
>;

/** Product filter for database queries */
export interface ProductFilter {
  sourceType?: SourceType;
  sourceKeyword?: string;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  fromDate?: Date;
  toDate?: Date;
  minConfidence?: number;
  minTrending?: number;
}

/** Pagination params */
export interface PaginationParams {
  page: number;
  limit: number;
}

/** Paginated result */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// Export all types
// ============================================

export type {
  // Re-export for convenience
  SourceType,
  ProductStatus,
};
