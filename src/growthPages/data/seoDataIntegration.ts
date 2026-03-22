/**
 * SEO Data Integration Service
 *
 * Aggregates data from multiple sources for SEO surface generation:
 * - Voucher Catalog (voucher data, patterns)
 * - Affiliate Products (shop info, categories)
 * - Crawl Jobs (freshness signals)
 *
 * This service provides a clean interface for growth pages to access
 * real data while maintaining quality gates.
 */

import { createClient } from '@supabase/supabase-js';
import type { VoucherNormalizedRecord, VoucherPlatform } from '../../voucherData/types.js';
import type { AffiliateProduct } from '../../types/database.js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ============================================================================
// Types
// ============================================================================

export interface SeoShopSignal {
  shopId: string;
  shopName: string;
  shopSlug: string;
  category?: string;
  productCount: number;
  voucherCount: number;
  lastUpdated: Date | null;
  avgRating?: number;
}

export interface SeoCategorySignal {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  shopCount: number;
  voucherCount: number;
  lastUpdated: Date | null;
}

export interface SeoVoucherSignal {
  code: string;
  description: string;
  discount: string;
  minSpend?: number;
  frequency: 'common' | 'occasional' | 'rare';
}

export interface SeoDataQuality {
  hasRealData: boolean;
  dataFreshness: 'fresh' | 'stale' | 'unknown';
  recordCount: number;
  lastUpdated: Date | null;
}

/**
 * Result of fetching shop data for SEO
 */
export interface ShopSeoDataResult {
  success: boolean;
  shop?: SeoShopSignal;
  vouchers: SeoVoucherSignal[];
  quality: SeoDataQuality;
  error?: string;
}

/**
 * Result of fetching category data for SEO
 */
export interface CategorySeoDataResult {
  success: boolean;
  category?: SeoCategorySignal;
  voucherPatterns: SeoVoucherSignal[];
  relatedShops: SeoShopSignal[];
  quality: SeoDataQuality;
  error?: string;
}

/**
 * Eligible entity for SEO indexing
 */
export interface EligibleSeoEntity {
  type: 'shop' | 'category';
  slug: string;
  name: string;
  quality: SeoDataQuality;
}

// ============================================================================
// Voucher Catalog Queries
// ============================================================================

/**
 * Get voucher signals for a specific shop
 */
async function getVouchersForShop(shopId: string): Promise<SeoVoucherSignal[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('voucher_catalog')
      .select('code, description, discount_value, min_spend, applicable_shop_ids, campaign_name')
      .contains('applicable_shop_ids', [shopId])
      .eq('is_active', true)
      .eq('platform', 'shopee')
      .limit(10);

    if (error || !data) return [];

    return data.map(v => ({
      code: v.code,
      description: v.description || v.campaign_name || 'Voucher',
      discount: v.discount_value ? `Giảm ${v.discount_value}%` : 'Voucher',
      minSpend: v.min_spend,
      frequency: 'common' as const,
    }));
  } catch {
    return [];
  }
}

/**
 * Get voucher signals for a specific category
 */
async function getVouchersForCategory(categoryName: string): Promise<SeoVoucherSignal[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('voucher_catalog')
      .select('code, description, discount_value, min_spend, applicable_category_ids, campaign_name')
      .contains('applicable_category_ids', [categoryName.toLowerCase()])
      .eq('is_active', true)
      .eq('platform', 'shopee')
      .limit(10);

    if (error || !data) return [];

    // Aggregate to find patterns
    const patternMap = new Map<string, SeoVoucherSignal>();
    data.forEach(v => {
      const key = v.code.substring(0, 8);
      if (!patternMap.has(key)) {
        patternMap.set(key, {
          code: v.code,
          description: v.description || v.campaign_name || 'Voucher',
          discount: v.discount_value ? `Giảm ${v.discount_value}%` : 'Voucher',
          minSpend: v.min_spend,
          frequency: data.length > 3 ? 'common' : 'occasional',
        });
      }
    });

    return Array.from(patternMap.values());
  } catch {
    return [];
  }
}

/**
 * Get common voucher patterns from catalog
 */
async function getCommonVoucherPatterns(limit: number = 5): Promise<SeoVoucherSignal[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('voucher_catalog')
      .select('code, description, discount_value, min_spend, campaign_name')
      .eq('is_active', true)
      .eq('platform', 'shopee')
      .eq('freshness_status', 'fresh')
      .order('created_at', { ascending: false })
      .limit(limit * 2);

    if (error || !data) return [];

    // Get unique patterns
    const patterns: SeoVoucherSignal[] = [];
    const seenCodes = new Set<string>();

    for (const v of data) {
      const codeKey = v.code.substring(0, 6);
      if (!seenCodes.has(codeKey)) {
        seenCodes.add(codeKey);
        patterns.push({
          code: v.code,
          description: v.description || v.campaign_name || 'Voucher Shopee',
          discount: v.discount_value ? `Giảm ${v.discount_value}%` : 'Voucher',
          minSpend: v.min_spend || undefined,
          frequency: patterns.length < 3 ? 'common' : 'occasional',
        });
        if (patterns.length >= limit) break;
      }
    }

    return patterns;
  } catch {
    return [];
  }
}

// ============================================================================
// Affiliate Product Queries
// ============================================================================

/**
 * Get shop signals from affiliate products
 */
async function getShopSignalsFromProducts(): Promise<SeoShopSignal[]> {
  if (!supabase) return [];

  try {
    // Get distinct shops with product counts
    const { data, error } = await supabase
      .from('affiliate_products')
      .select('shop_name, category, COUNT(*) as product_count, MAX(crawled_at) as last_crawled')
      .eq('platform', 'shopee')
      .not('shop_name', 'is', null)
      .group('shop_name, category')
      .order('product_count', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data
      .filter(p => p.shop_name && p.shop_name.length > 2)
      .map(p => ({
        shopId: generateShopId(p.shop_name!),
        shopName: p.shop_name!,
        shopSlug: generateSlug(p.shop_name!),
        category: p.category || undefined,
        productCount: Number(p.product_count) || 0,
        voucherCount: 0, // Will be enriched separately
        lastUpdated: p.last_crawled ? new Date(p.last_crawled) : null,
      }));
  } catch {
    return [];
  }
}

/**
 * Get category signals from affiliate products
 */
async function getCategorySignalsFromProducts(): Promise<SeoCategorySignal[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('affiliate_products')
      .select('category, COUNT(*) as product_count, MAX(crawled_at) as last_crawled')
      .eq('platform', 'shopee')
      .not('category', 'is', null)
      .group('category')
      .order('product_count', { ascending: false })
      .limit(30);

    if (error || !data) return [];

    return data
      .filter(c => c.category && c.category.length > 1)
      .map(c => ({
        categoryId: generateCategoryId(c.category!),
        categoryName: c.category!,
        categorySlug: generateSlug(c.category!),
        shopCount: 0, // Would need separate query
        productCount: Number(c.product_count) || 0,
        lastUpdated: c.last_crawled ? new Date(c.last_crawled) : null,
      }));
  } catch {
    return [];
  }
}

// ============================================================================
// Public API - Main Integration Functions
// ============================================================================

/**
 * Get shop SEO data - combines product data with voucher data
 */
export async function getShopSeoData(shopSlug: string): Promise<ShopSeoDataResult> {
  // Get shop from products
  const shops = await getShopSignalsFromProducts();
  const shop = shops.find(s => s.shopSlug === shopSlug);

  if (!shop) {
    return {
      success: false,
      vouchers: [],
      quality: {
        hasRealData: false,
        dataFreshness: 'unknown',
        recordCount: 0,
        lastUpdated: null,
      },
      error: 'Shop not found',
    };
  }

  // Get vouchers for this shop
  const vouchers = await getVouchersForShop(shop.shopId);

  // Determine quality
  const hasRealData = shop.productCount > 0 || vouchers.length > 0;
  const dataFreshness = hasRealData
    ? (shop.lastUpdated && (Date.now() - shop.lastUpdated.getTime()) < 7 * 24 * 60 * 60 * 1000)
      ? 'fresh'
      : 'stale'
    : 'unknown';

  return {
    success: true,
    shop: {
      ...shop,
      voucherCount: vouchers.length,
    },
    vouchers,
    quality: {
      hasRealData,
      dataFreshness,
      recordCount: shop.productCount + vouchers.length,
      lastUpdated: shop.lastUpdated,
    },
  };
}

/**
 * Get category SEO data
 */
export async function getCategorySeoData(categorySlug: string): Promise<CategorySeoDataResult> {
  // Get category from products
  const categories = await getCategorySignalsFromProducts();
  const category = categories.find(c => c.categorySlug === categorySlug);

  if (!category) {
    return {
      success: false,
      voucherPatterns: [],
      relatedShops: [],
      quality: {
        hasRealData: false,
        dataFreshness: 'unknown',
        recordCount: 0,
        lastUpdated: null,
      },
      error: 'Category not found',
    };
  }

  // Get voucher patterns for this category
  const voucherPatterns = await getVouchersForCategory(category.categoryName);

  // Get related shops in this category
  const shops = await getShopSignalsFromProducts();
  const relatedShops = shops
    .filter(s => s.category === category.categoryName)
    .slice(0, 5)
    .map(s => ({ ...s, voucherCount: 0 }));

  // Determine quality
  const hasRealData = category.productCount > 0 || voucherPatterns.length > 0 || relatedShops.length > 0;
  const dataFreshness = hasRealData
    ? (category.lastUpdated && (Date.now() - category.lastUpdated.getTime()) < 7 * 24 * 60 * 60 * 1000)
      ? 'fresh'
      : 'stale'
    : 'unknown';

  return {
    success: true,
    category: {
      ...category,
      shopCount: relatedShops.length,
      voucherCount: voucherPatterns.length,
    },
    voucherPatterns,
    relatedShops,
    quality: {
      hasRealData,
      dataFreshness,
      recordCount: category.productCount + voucherPatterns.length + relatedShops.length,
      lastUpdated: category.lastUpdated,
    },
  };
}

/**
 * Get eligible SEO entities (for sitemap)
 */
export async function getEligibleSeoEntities(
  type: 'shop' | 'category',
  minQualityThreshold: number = 3
): Promise<EligibleSeoEntity[]> {
  const eligible: EligibleSeoEntity[] = [];

  if (type === 'shop') {
    const shops = await getShopSignalsFromProducts();
    for (const shop of shops) {
      if (shop.productCount >= minQualityThreshold) {
        eligible.push({
          type: 'shop',
          slug: shop.shopSlug,
          name: shop.shopName,
          quality: {
            hasRealData: shop.productCount > 0,
            dataFreshness: shop.lastUpdated
              ? (Date.now() - shop.lastUpdated.getTime() < 7 * 24 * 60 * 60 * 1000 ? 'fresh' : 'stale')
              : 'unknown',
            recordCount: shop.productCount,
            lastUpdated: shop.lastUpdated,
          },
        });
      }
    }
  } else {
    const categories = await getCategorySignalsFromProducts();
    for (const cat of categories) {
      if (cat.productCount >= minQualityThreshold) {
        eligible.push({
          type: 'category',
          slug: cat.categorySlug,
          name: cat.categoryName,
          quality: {
            hasRealData: cat.productCount > 0,
            dataFreshness: cat.lastUpdated
              ? (Date.now() - cat.lastUpdated.getTime() < 7 * 24 * 60 * 60 * 1000 ? 'fresh' : 'stale')
              : 'unknown',
            recordCount: cat.productCount,
            lastUpdated: cat.lastUpdated,
          },
        });
      }
    }
  }

  return eligible;
}

/**
 * Get top entities for internal linking
 */
export async function getTopEntitiesForLinking(limit: number = 5): Promise<{
  topShops: SeoShopSignal[];
  topCategories: SeoCategorySignal[];
}> {
  const [shops, categories] = await Promise.all([
    getShopSignalsFromProducts(),
    getCategorySignalsFromProducts(),
  ]);

  return {
    topShops: shops.slice(0, limit),
    topCategories: categories.slice(0, limit),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateShopId(shopName: string): string {
  return `shop_${generateSlug(shopName)}`;
}

function generateCategoryId(categoryName: string): string {
  return `cat_${generateSlug(categoryName)}`;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
