/**
 * Affiliate Product Repository
 *
 * Database operations for affiliate_products table
 * using Supabase service role key.
 */

import { getSupabaseClient } from './supabaseClient.js';
import { log } from '../utils/logger.js';
import type {
  AffiliateProductRow,
  AffiliateProductInsert,
  AffiliateProductUpdate,
  ProductQueryFilter,
  QueryPagination,
  PaginatedResult,
  CreateAffiliateProductDTO,
  UpdateAIContentDTO,
} from '../types/database.js';

// ============================================
// Constants
// ============================================

const TABLE_NAME = 'affiliate_products';

// ============================================
// Repository Class
// ============================================

/**
 * Repository for affiliate products CRUD operations
 */
export class AffiliateProductRepository {
  private tableName = TABLE_NAME;

  // ============================================
  // Insert Operations
  // ============================================

  /**
   * Insert a single affiliate product
   */
  async insertAffiliateProduct(
    record: CreateAffiliateProductDTO
  ): Promise<AffiliateProductRow | null> {
    try {
      const client = getSupabaseClient();

      const insertData = this.mapToInsertData(record);

      const { data, error } = await client
        .from(this.tableName)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        log.error({ error, record: record.title }, 'Failed to insert affiliate product');
        return null;
      }

      log.debug({ id: data.id, title: data.title }, 'Product inserted successfully');
      return data as AffiliateProductRow;
    } catch (error) {
      log.error({ error }, 'Error inserting affiliate product');
      return null;
    }
  }

  /**
   * Insert multiple affiliate products
   */
  async insertManyAffiliateProducts(
    records: CreateAffiliateProductDTO[]
  ): Promise<number> {
    if (records.length === 0) {
      return 0;
    }

    try {
      const client = getSupabaseClient();

      const insertData = records.map((record) => this.mapToInsertData(record));

      const { data, error } = await client
        .from(this.tableName)
        .insert(insertData)
        .select();

      if (error) {
        log.error({ error, count: records.length }, 'Failed to batch insert products');
        return 0;
      }

      const insertedCount = data?.length || 0;
      log.info({ inserted: insertedCount, requested: records.length }, 'Batch insert completed');

      return insertedCount;
    } catch (error) {
      log.error({ error }, 'Error batch inserting products');
      return 0;
    }
  }

  // ============================================
  // Query Operations
  // ============================================

  /**
   * Find product by ID
   */
  async findById(id: string): Promise<AffiliateProductRow | null> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return data as AffiliateProductRow;
    } catch (error) {
      log.error({ error, id }, 'Error finding product by ID');
      return null;
    }
  }

  /**
   * Find product by product URL (to avoid duplicates)
   */
  async findByProductUrl(productUrl: string): Promise<AffiliateProductRow | null> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('product_url', productUrl)
        .single();

      if (error || !data) {
        return null;
      }

      return data as AffiliateProductRow;
    } catch (error) {
      // Not found is not an error
      return null;
    }
  }

  /**
   * Find products by filter with pagination
   */
  async findAll(
    filter: ProductQueryFilter,
    pagination: QueryPagination
  ): Promise<PaginatedResult<AffiliateProductRow>> {
    try {
      const client = getSupabaseClient();

      let query = client.from(this.tableName).select('*', { count: 'exact' });

      // Apply filters
      if (filter.sourceType) {
        query = query.eq('source_type', filter.sourceType);
      }
      if (filter.sourceKeyword) {
        query = query.eq('source_keyword', filter.sourceKeyword);
      }
      if (filter.status) {
        query = query.eq('status', filter.status);
      }
      if (filter.minPrice !== undefined) {
        query = query.gte('price', filter.minPrice);
      }
      if (filter.maxPrice !== undefined) {
        query = query.lte('price', filter.maxPrice);
      }
      if (filter.category) {
        query = query.eq('category', filter.category);
      }
      if (filter.fromDate) {
        const fromDate = filter.fromDate instanceof Date
          ? filter.fromDate.toISOString()
          : filter.fromDate;
        query = query.gte('created_at', fromDate);
      }
      if (filter.toDate) {
        const toDate = filter.toDate instanceof Date
          ? filter.toDate.toISOString()
          : filter.toDate;
        query = query.lte('created_at', toDate);
      }
      if (filter.minConfidence !== undefined) {
        query = query.gte('confidence_score', filter.minConfidence);
      }
      if (filter.minTrending !== undefined) {
        query = query.gte('trending_score', filter.minTrending);
      }

      // Apply pagination
      const offset = (pagination.page - 1) * pagination.limit;
      query = query.range(offset, offset + pagination.limit - 1);

      // Order by created_at desc
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        log.error({ error, filter }, 'Failed to fetch products');
        return this.emptyPaginatedResult(pagination);
      }

      return {
        data: (data || []) as AffiliateProductRow[],
        total: count || 0,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil((count || 0) / pagination.limit),
      };
    } catch (error) {
      log.error({ error }, 'Error fetching products');
      return this.emptyPaginatedResult(pagination);
    }
  }

  /**
   * Find products by source keyword
   */
  async findBySourceKeyword(keyword: string): Promise<AffiliateProductRow[]> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('source_keyword', keyword)
        .order('created_at', { ascending: false });

      if (error) {
        log.error({ error, keyword }, 'Failed to fetch products by keyword');
        return [];
      }

      return (data || []) as AffiliateProductRow[];
    } catch (error) {
      log.error({ error, keyword }, 'Error fetching products by keyword');
      return [];
    }
  }

  /**
   * Get pending products (not yet processed by AI)
   */
  async findPendingProducts(limit: number = 10): Promise<AffiliateProductRow[]> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .is('status', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        log.error({ error }, 'Failed to fetch pending products');
        return [];
      }

      return (data || []) as AffiliateProductRow[];
    } catch (error) {
      log.error({ error }, 'Error fetching pending products');
      return [];
    }
  }

  // ============================================
  // Update Operations
  // ============================================

  /**
   * Update a product by ID
   */
  async updateById(
    id: string,
    updateData: AffiliateProductUpdate
  ): Promise<boolean> {
    try {
      const client = getSupabaseClient();

      const { error } = await client
        .from(this.tableName)
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        log.error({ error, id }, 'Failed to update product');
        return false;
      }

      return true;
    } catch (error) {
      log.error({ error, id }, 'Error updating product');
      return false;
    }
  }

  /**
   * Update AI content for a product
   */
  async updateAIContent(
    id: string,
    aiContent: UpdateAIContentDTO
  ): Promise<boolean> {
    try {
      const client = getSupabaseClient();

      const updateData: Record<string, unknown> = {
        rewritten_title: aiContent.rewritten_title,
        review_content: aiContent.review_content,
        social_caption: aiContent.social_caption,
        hashtags: aiContent.hashtags ? JSON.stringify(aiContent.hashtags) : null,
        confidence_score: aiContent.confidence_score,
        trending_score: aiContent.trending_score,
        recommendation: aiContent.recommendation,
        processed_at: aiContent.processed_at instanceof Date
          ? aiContent.processed_at.toISOString()
          : aiContent.processed_at || new Date().toISOString(),
        status: 'ai_completed',
        updated_at: new Date().toISOString(),
      };

      const { error } = await client
        .from(this.tableName)
        .update(updateData)
        .eq('id', id);

      if (error) {
        log.error({ error, id }, 'Failed to update AI content');
        return false;
      }

      return true;
    } catch (error) {
      log.error({ error, id }, 'Error updating AI content');
      return false;
    }
  }

  // ============================================
  // Delete Operations
  // ============================================

  /**
   * Delete a product by ID
   */
  async deleteById(id: string): Promise<boolean> {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        log.error({ error, id }, 'Failed to delete product');
        return false;
      }

      return true;
    } catch (error) {
      log.error({ error, id }, 'Error deleting product');
      return false;
    }
  }

  /**
   * Delete multiple products by IDs
   */
  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(this.tableName)
        .delete()
        .in('id', ids)
        .select();

      if (error) {
        log.error({ error, count: ids.length }, 'Failed to delete products');
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      log.error({ error }, 'Error deleting products');
      return 0;
    }
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Count products by status
   */
  async countByStatus(): Promise<Record<string, number>> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('status', { count: 'exact' });

      if (error) {
        log.error({ error }, 'Failed to count products by status');
        return {};
      }

      const counts: Record<string, number> = {};
      for (const item of data || []) {
        const status = item.status || 'null';
        counts[status] = (counts[status] || 0) + 1;
      }

      return counts;
    } catch (error) {
      log.error({ error }, 'Error counting products by status');
      return {};
    }
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Map DTO to insert data
   */
  private mapToInsertData(dto: CreateAffiliateProductDTO): Record<string, unknown> {
    return {
      title: dto.title,
      price: dto.price,
      image_url: dto.image_url,
      original_description: dto.original_description || null,
      rewritten_title: dto.rewritten_title || null,
      review_content: dto.review_content || null,
      social_caption: dto.social_caption || null,
      hashtags: dto.hashtags ? JSON.stringify(dto.hashtags) : null,
      product_url: dto.product_url,
      source_type: dto.source_type,
      source_keyword: dto.source_keyword,
      crawled_at: dto.crawled_at instanceof Date
        ? dto.crawled_at.toISOString()
        : dto.crawled_at,
      original_price: dto.original_price || null,
      shop_name: dto.shop_name || null,
      rating: dto.rating || null,
      review_count: dto.review_count || null,
      sold_count: dto.sold_count || null,
      category: dto.category || null,
      status: dto.status || 'pending',
    };
  }

  /**
   * Create empty paginated result
   */
  private emptyPaginatedResult(
    pagination: QueryPagination
  ): PaginatedResult<AffiliateProductRow> {
    return {
      data: [],
      total: 0,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: 0,
    };
  }
}

// ============================================
// Singleton Instance
// ============================================

let repositoryInstance: AffiliateProductRepository | null = null;

/**
 * Get repository singleton instance
 */
export function getAffiliateProductRepository(): AffiliateProductRepository {
  if (!repositoryInstance) {
    repositoryInstance = new AffiliateProductRepository();
  }
  return repositoryInstance;
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Insert a single product
 */
export async function insertAffiliateProduct(
  record: CreateAffiliateProductDTO
): Promise<AffiliateProductRow | null> {
  const repo = getAffiliateProductRepository();
  return repo.insertAffiliateProduct(record);
}

/**
 * Insert multiple products
 */
export async function insertManyAffiliateProducts(
  records: CreateAffiliateProductDTO[]
): Promise<number> {
  const repo = getAffiliateProductRepository();
  return repo.insertManyAffiliateProducts(records);
}

/**
 * Find product by ID
 */
export async function findAffiliateProductById(
  id: string
): Promise<AffiliateProductRow | null> {
  const repo = getAffiliateProductRepository();
  return repo.findById(id);
}

/**
 * Find products by filter
 */
export async function findAllAffiliateProducts(
  filter: ProductQueryFilter,
  pagination: QueryPagination
): Promise<PaginatedResult<AffiliateProductRow>> {
  const repo = getAffiliateProductRepository();
  return repo.findAll(filter, pagination);
}

/**
 * Update AI content
 */
export async function updateAffiliateProductAIContent(
  id: string,
  aiContent: UpdateAIContentDTO
): Promise<boolean> {
  const repo = getAffiliateProductRepository();
  return repo.updateAIContent(id, aiContent);
}

// ============================================
// Export
// ============================================

export type {
  CreateAffiliateProductDTO,
  UpdateAIContentDTO,
  ProductQueryFilter,
  QueryPagination,
  PaginatedResult,
};

export { AffiliateProductRepository };
