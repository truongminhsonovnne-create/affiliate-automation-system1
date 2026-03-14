/**
 * Database Types for Affiliate Products
 *
 * Type definitions matching the affiliate_products table schema
 * in Supabase PostgreSQL.
 */

import { SourceType, ProductStatus } from './product.js';

// ============================================
// Table Schema Types
// ============================================

/**
 * Database row type for affiliate_products table
 */
export interface AffiliateProductRow {
  /** UUID primary key */
  id: string;

  /** Product title */
  title: string;

  /** Product price in VND */
  price: number;

  /** Main product image URL */
  image_url: string;

  /** Original product description from platform */
  original_description: string | null;

  /** AI-rewritten product title */
  rewritten_title: string | null;

  /** AI-generated review content */
  review_content: string | null;

  /** AI-generated social media caption */
  social_caption: string | null;

  /** Hashtags as JSON array string */
  hashtags: string | null;

  /** Full product URL on source platform */
  product_url: string;

  /** Source platform type */
  source_type: SourceType;

  /** Keyword used to find this product */
  source_keyword: string;

  /** When product was crawled */
  crawled_at: string;

  /** When record was created in database */
  created_at: string;

  /** Original price before discount */
  original_price: number | null;

  /** Shop name */
  shop_name: string | null;

  /** Product rating (0-5) */
  rating: number | null;

  /** Number of reviews */
  review_count: number | null;

  /** Number of items sold */
  sold_count: number | null;

  /** Product category */
  category: string | null;

  /** Current processing status */
  status: ProductStatus | null;

  /** Error message if processing failed */
  error_message: string | null;

  /** AI processing timestamp */
  processed_at: string | null;

  /** Confidence score from AI */
  confidence_score: number | null;

  /** Trending score from AI */
  trending_score: number | null;

  /** AI recommendation */
  recommendation: string | null;
}

/**
 * Insert row type (without auto-generated fields)
 */
export type AffiliateProductInsert = Omit<
  AffiliateProductRow,
  'id' | 'created_at' | 'processed_at'
>;

/**
 * Update row type (partial update)
 */
export type AffiliateProductUpdate = Partial<Omit<AffiliateProductRow, 'id' | 'created_at'>>;

// ============================================
// Query Types
// ============================================

/**
 * Filter options for querying products
 */
export interface ProductQueryFilter {
  /** Filter by source type */
  sourceType?: SourceType;

  /** Filter by source keyword */
  sourceKeyword?: string;

  /** Filter by status */
  status?: ProductStatus;

  /** Minimum price */
  minPrice?: number;

  /** Maximum price */
  maxPrice?: number;

  /** Filter by category */
  category?: string;

  /** Filter from date */
  fromDate?: Date | string;

  /** Filter to date */
  toDate?: Date | string;

  /** Minimum confidence score */
  minConfidence?: number;

  /** Minimum trending score */
  minTrending?: number;
}

/**
 * Pagination parameters
 */
export interface QueryPagination {
  /** Page number (1-indexed) */
  page: number;

  /** Items per page */
  limit: number;
}

/**
 * Paginated query result
 */
export interface PaginatedResult<T> {
  /** Array of results */
  data: T[];

  /** Total count */
  total: number;

  /** Current page */
  page: number;

  /** Items per page */
  limit: number;

  /** Total pages */
  totalPages: number;
}

// ============================================
// Insert/Update DTOs
// ============================================

/**
 * DTO for creating a new affiliate product
 */
export interface CreateAffiliateProductDTO {
  title: string;
  price: number;
  image_url: string;
  original_description?: string;
  rewritten_title?: string;
  review_content?: string;
  social_caption?: string;
  hashtags?: string[];
  product_url: string;
  source_type: SourceType;
  source_keyword: string;
  crawled_at: Date | string;
  original_price?: number;
  shop_name?: string;
  rating?: number;
  review_count?: number;
  sold_count?: number;
  category?: string;
  status?: ProductStatus;
}

/**
 * DTO for updating AI content
 */
export interface UpdateAIContentDTO {
  rewritten_title?: string;
  review_content?: string;
  social_caption?: string;
  hashtags?: string[];
  confidence_score?: number;
  trending_score?: number;
  recommendation?: string;
  processed_at?: Date | string;
}

// ============================================
// Type Guards
// ============================================

/**
 * Check if row is valid AffiliateProductRow
 */
export function isAffiliateProductRow(data: unknown): data is AffiliateProductRow {
  if (typeof data !== 'object' || data === null) return false;

  const row = data as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.title === 'string' &&
    typeof row.price === 'number' &&
    typeof row.product_url === 'string'
  );
}

// ============================================
// Export
// ============================================

export type {
  AffiliateProductRow,
  AffiliateProductInsert,
  AffiliateProductUpdate,
  ProductQueryFilter,
  QueryPagination,
  PaginatedResult,
  CreateAffiliateProductDTO,
  UpdateAIContentDTO,
};
