/**
 * Affiliate Content Repository
 *
 * Database operations for affiliate_contents table
 */

import { getSupabaseClient } from '../supabaseClient.js';
import { log } from '../../utils/logger.js';
import type { AffiliateContent, CreateAffiliateContentDTO } from '../../types/database.js';

// ============================================
// Constants
// ============================================

const TABLE_NAME = 'affiliate_contents';

// ============================================
// Repository Class
// ============================================

export class AffiliateContentRepository {
  private tableName = TABLE_NAME;

  // ============================================
  // Insert Operations
  // ============================================

  /**
   * Insert a new affiliate content
   */
  async insertAffiliateContent(
    data: CreateAffiliateContentDTO
  ): Promise<AffiliateContent | null> {
    try {
      const client = getSupabaseClient();

      const insertData = {
        product_id: data.product_id,
        rewritten_title: data.rewritten_title || null,
        review_content: data.review_content || null,
        social_caption: data.social_caption || null,
        hashtags: data.hashtags || null,
        ai_model: data.ai_model || null,
        prompt_version: data.prompt_version || null,
        confidence_score: data.confidence_score || null,
        trending_score: data.trending_score || null,
        recommendation: data.recommendation || null,
      };

      const { data: result, error } = await client
        .from(this.tableName)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        log.error({ error, productId: data.product_id }, 'Failed to insert affiliate content');
        return null;
      }

      log.debug({ id: result.id }, 'Content inserted successfully');
      return result as AffiliateContent;
    } catch (error) {
      log.error({ error }, 'Error inserting affiliate content');
      return null;
    }
  }

  /**
   * Insert multiple affiliate contents
   */
  async insertManyAffiliateContents(
    contents: CreateAffiliateContentDTO[]
  ): Promise<number> {
    if (contents.length === 0) {
      return 0;
    }

    try {
      const client = getSupabaseClient();

      const insertData = contents.map((c) => ({
        product_id: c.product_id,
        rewritten_title: c.rewritten_title || null,
        review_content: c.review_content || null,
        social_caption: c.social_caption || null,
        hashtags: c.hashtags || null,
        ai_model: c.ai_model || null,
        prompt_version: c.prompt_version || null,
        confidence_score: c.confidence_score || null,
        trending_score: c.trending_score || null,
        recommendation: c.recommendation || null,
      }));

      const { data, error } = await client
        .from(this.tableName)
        .insert(insertData)
        .select();

      if (error) {
        log.error({ error, count: contents.length }, 'Failed to batch insert contents');
        return 0;
      }

      const insertedCount = data?.length || 0;
      log.info({ inserted: insertedCount }, 'Batch insert contents completed');

      return insertedCount;
    } catch (error) {
      log.error({ error }, 'Error batch inserting contents');
      return 0;
    }
  }

  // ============================================
  // Query Operations
  // ============================================

  /**
   * Find content by ID
   */
  async findById(id: string): Promise<AffiliateContent | null> {
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

      return data as AffiliateContent;
    } catch (error) {
      log.error({ error, id }, 'Error finding content by ID');
      return null;
    }
  }

  /**
   * Find contents by product ID
   */
  async findContentsByProductId(productId: string): Promise<AffiliateContent[]> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) {
        log.error({ error, productId }, 'Failed to fetch contents by product ID');
        return [];
      }

      return (data || []) as AffiliateContent[];
    } catch (error) {
      log.error({ error, productId }, 'Error fetching contents by product ID');
      return [];
    }
  }

  /**
   * Find latest content for a product
   */
  async findLatestByProductId(productId: string): Promise<AffiliateContent | null> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return data as AffiliateContent;
    } catch (error) {
      return null;
    }
  }

  // ============================================
  // Update Operations
  // ============================================

  /**
   * Update content by ID
   */
  async updateById(
    id: string,
    updateData: Partial<CreateAffiliateContentDTO>
  ): Promise<boolean> {
    try {
      const client = getSupabaseClient();

      const { error } = await client
        .from(this.tableName)
        .update(updateData)
        .eq('id', id);

      if (error) {
        log.error({ error, id }, 'Failed to update content');
        return false;
      }

      return true;
    } catch (error) {
      log.error({ error, id }, 'Error updating content');
      return false;
    }
  }

  // ============================================
  // Delete Operations
  // ============================================

  /**
   * Delete content by ID
   */
  async deleteById(id: string): Promise<boolean> {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        log.error({ error, id }, 'Failed to delete content');
        return false;
      }

      return true;
    } catch (error) {
      log.error({ error, id }, 'Error deleting content');
      return false;
    }
  }

  /**
   * Delete all contents for a product
   */
  async deleteByProductId(productId: string): Promise<number> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(this.tableName)
        .delete()
        .eq('product_id', productId)
        .select();

      if (error) {
        log.error({ error, productId }, 'Failed to delete contents by product ID');
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      log.error({ error, productId }, 'Error deleting contents by product ID');
      return 0;
    }
  }

  // ============================================
  // Utility Operations
  // ============================================

  /**
   * Count contents
   */
  async count(): Promise<number> {
    try {
      const client = getSupabaseClient();
      const { count, error } = await client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        log.error({ error }, 'Failed to count contents');
        return 0;
      }

      return count || 0;
    } catch (error) {
      log.error({ error }, 'Error counting contents');
      return 0;
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

let repositoryInstance: AffiliateContentRepository | null = null;

export function getAffiliateContentRepository(): AffiliateContentRepository {
  if (!repositoryInstance) {
    repositoryInstance = new AffiliateContentRepository();
  }
  return repositoryInstance;
}

// ============================================
// Convenience Functions
// ============================================

export async function insertAffiliateContent(
  data: CreateAffiliateContentDTO
): Promise<AffiliateContent | null> {
  return getAffiliateContentRepository().insertAffiliateContent(data);
}

export async function findContentsByProductId(
  productId: string
): Promise<AffiliateContent[]> {
  return getAffiliateContentRepository().findContentsByProductId(productId);
}

export default AffiliateContentRepository;
