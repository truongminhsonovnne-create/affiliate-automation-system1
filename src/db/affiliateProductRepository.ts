/**
 * Affiliate Product Repository
 *
 * Database operations for affiliate_products table
 * using Supabase service role key.
 */

import { getSupabaseClient } from './supabaseClient.js';
import { log } from '../utils/logger.js';
import type { AffiliateProduct, CreateAffiliateProductDTO } from '../types/database.js';

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
  ): Promise<AffiliateProduct | null> {
    try {
      const client = getSupabaseClient();

      const insertData = {
        platform: record.platform,
        external_product_id: record.external_product_id || null,
        title: record.title,
        price: record.price || null,
        image_url: record.image_url || null,
        original_description: record.original_description || null,
        product_url: record.product_url,
        source_type: record.source_type,
        source_keyword: record.source_keyword || null,
        crawled_at: record.crawled_at instanceof Date
          ? record.crawled_at.toISOString()
          : record.crawled_at,
        original_price: record.original_price || null,
        shop_name: record.shop_name || null,
        rating: record.rating || null,
        review_count: record.review_count || null,
        sold_count: record.sold_count || null,
        category: record.category || null,
      };

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
      return data as AffiliateProduct;
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

      const insertData = records.map((record) => ({
        platform: record.platform,
        external_product_id: record.external_product_id || null,
        title: record.title,
        price: record.price || null,
        image_url: record.image_url || null,
        original_description: record.original_description || null,
        product_url: record.product_url,
        source_type: record.source_type,
        source_keyword: record.source_keyword || null,
        crawled_at: record.crawled_at instanceof Date
          ? record.crawled_at.toISOString()
          : record.crawled_at,
        original_price: record.original_price || null,
        shop_name: record.shop_name || null,
        rating: record.rating || null,
        review_count: record.review_count || null,
        sold_count: record.sold_count || null,
        category: record.category || null,
      }));

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
  async findById(id: string): Promise<AffiliateProduct | null> {
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

      return data as AffiliateProduct;
    } catch (error) {
      log.error({ error, id }, 'Error finding product by ID');
      return null;
    }
  }

  /**
   * Find product by product URL (to avoid duplicates)
   */
  async findByProductUrl(productUrl: string): Promise<AffiliateProduct | null> {
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

      return data as AffiliateProduct;
    } catch (error) {
      // Not found is not an error
      return null;
    }
  }

  /**
   * Find product by platform and URL
   */
  async findByPlatformAndUrl(
    platform: string,
    productUrl: string
  ): Promise<AffiliateProduct | null> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('platform', platform)
        .eq('product_url', productUrl)
        .single();

      if (error || !data) {
        return null;
      }

      return data as AffiliateProduct;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get latest products
   */
  async getLatestProducts(limit: number = 50): Promise<AffiliateProduct[]> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        log.error({ error, limit }, 'Failed to get latest products');
        return [];
      }

      return (data || []) as AffiliateProduct[];
    } catch (error) {
      log.error({ error, limit }, 'Error getting latest products');
      return [];
    }
  }

  /**
   * Find products by platform
   */
  async findByPlatform(platform: string, limit: number = 50): Promise<AffiliateProduct[]> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('platform', platform)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        log.error({ error, platform }, 'Failed to fetch products by platform');
        return [];
      }

      return (data || []) as AffiliateProduct[];
    } catch (error) {
      log.error({ error, platform }, 'Error fetching products by platform');
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
    updateData: Partial<CreateAffiliateProductDTO>
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

  // ============================================
  // Statistics
  // ============================================

  /**
   * Count products
   */
  async count(): Promise<number> {
    try {
      const client = getSupabaseClient();
      const { count, error } = await client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        log.error({ error }, 'Failed to count products');
        return 0;
      }

      return count || 0;
    } catch (error) {
      log.error({ error }, 'Error counting products');
      return 0;
    }
  }

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
): Promise<AffiliateProduct | null> {
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
): Promise<AffiliateProduct | null> {
  const repo = getAffiliateProductRepository();
  return repo.findById(id);
}

/**
 * Find product by platform and URL
 */
export async function findByPlatformAndUrl(
  platform: string,
  productUrl: string
): Promise<AffiliateProduct | null> {
  const repo = getAffiliateProductRepository();
  return repo.findByPlatformAndUrl(platform, productUrl);
}

/**
 * Get latest products
 */
export async function getLatestProducts(limit: number = 50): Promise<AffiliateProduct[]> {
  const repo = getAffiliateProductRepository();
  return repo.getLatestProducts(limit);
}

// Re-export types for consumers
export type { CreateAffiliateProductDTO };
