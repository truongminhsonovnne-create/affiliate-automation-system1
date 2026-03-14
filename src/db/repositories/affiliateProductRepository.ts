/**
 * Affiliate Product Repository
 *
 * Database operations for affiliate_products table
 */

import { getSupabaseClient } from '../supabaseClient.js';
import { log } from '../../utils/logger.js';
import type { AffiliateProduct, CreateAffiliateProductDTO } from '../../types/database.js';

// ============================================
// Constants
// ============================================

const TABLE_NAME = 'affiliate_products';

// ============================================
// Repository Class
// ============================================

export class AffiliateProductRepository {
  private tableName = TABLE_NAME;

  // ============================================
  // Insert Operations
  // ============================================

  /**
   * Insert a single affiliate product
   */
  async insertAffiliateProduct(
    data: CreateAffiliateProductDTO
  ): Promise<AffiliateProduct | null> {
    try {
      const client = getSupabaseClient();

      const insertData = {
        platform: data.platform,
        external_product_id: data.external_product_id || null,
        title: data.title,
        price: data.price || null,
        image_url: data.image_url || null,
        original_description: data.original_description || null,
        product_url: data.product_url,
        source_type: data.source_type,
        source_keyword: data.source_keyword || null,
        crawled_at: data.crawled_at instanceof Date
          ? data.crawled_at.toISOString()
          : data.crawled_at,
        original_price: data.original_price || null,
        shop_name: data.shop_name || null,
        rating: data.rating || null,
        review_count: data.review_count || null,
        sold_count: data.sold_count || null,
        category: data.category || null,
      };

      const { data: result, error } = await client
        .from(this.tableName)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        log.error({ error, title: data.title }, 'Failed to insert affiliate product');
        return null;
      }

      log.debug({ id: result.id, title: result.title }, 'Product inserted successfully');
      return result as AffiliateProduct;
    } catch (error) {
      log.error({ error }, 'Error inserting affiliate product');
      return null;
    }
  }

  /**
   * Insert multiple affiliate products
   */
  async insertManyAffiliateProducts(
    products: CreateAffiliateProductDTO[]
  ): Promise<number> {
    if (products.length === 0) {
      return 0;
    }

    try {
      const client = getSupabaseClient();

      const insertData = products.map((p) => ({
        platform: p.platform,
        external_product_id: p.external_product_id || null,
        title: p.title,
        price: p.price || null,
        image_url: p.image_url || null,
        original_description: p.original_description || null,
        product_url: p.product_url,
        source_type: p.source_type,
        source_keyword: p.source_keyword || null,
        crawled_at: p.crawled_at instanceof Date
          ? p.crawled_at.toISOString()
          : p.crawled_at,
        original_price: p.original_price || null,
        shop_name: p.shop_name || null,
        rating: p.rating || null,
        review_count: p.review_count || null,
        sold_count: p.sold_count || null,
        category: p.category || null,
      }));

      const { data, error } = await client
        .from(this.tableName)
        .insert(insertData)
        .select();

      if (error) {
        log.error({ error, count: products.length }, 'Failed to batch insert products');
        return 0;
      }

      const insertedCount = data?.length || 0;
      log.info({ inserted: insertedCount, requested: products.length }, 'Batch insert completed');

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
   * Find product by platform and product URL
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
   * Update product by ID
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
   * Delete product by ID
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
  // Utility Operations
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
}

// ============================================
// Singleton Instance
// ============================================

let repositoryInstance: AffiliateProductRepository | null = null;

export function getAffiliateProductRepository(): AffiliateProductRepository {
  if (!repositoryInstance) {
    repositoryInstance = new AffiliateProductRepository();
  }
  return repositoryInstance;
}

// ============================================
// Convenience Functions
// ============================================

export async function insertAffiliateProduct(
  data: CreateAffiliateProductDTO
): Promise<AffiliateProduct | null> {
  return getAffiliateProductRepository().insertAffiliateProduct(data);
}

export async function insertManyAffiliateProducts(
  products: CreateAffiliateProductDTO[]
): Promise<number> {
  return getAffiliateProductRepository().insertManyAffiliateProducts(products);
}

export async function findByPlatformAndUrl(
  platform: string,
  productUrl: string
): Promise<AffiliateProduct | null> {
  return getAffiliateProductRepository().findByPlatformAndUrl(platform, productUrl);
}

export async function getLatestProducts(limit: number = 50): Promise<AffiliateProduct[]> {
  return getAffiliateProductRepository().getLatestProducts(limit);
}

export default AffiliateProductRepository;
