/**
 * Platform-Neutral Product Context Contract
 *
 * Standardizes product context across e-commerce platforms.
 */

import type { CommercePlatform } from '../types.js';

// ============================================================
// A. Context Types
// ============================================================

export interface CommerceSellerContext {
  sellerId: string;
  sellerName: string;
  sellerType: 'official_store' | 'mall' | 'third_party';
  rating?: number;
  isVerified: boolean;
}

export interface CommerceCategoryContext {
  categoryId: string;
  categoryName: string;
  parentCategoryId?: string;
  breadcrumbs: string[];
}

export interface CommercePriceContext {
  currentPrice: number;
  originalPrice?: number;
  discount?: number;
  currency: string;
  priceType: 'fixed' | 'dynamic' | 'auction';
}

export interface CommerceInventoryContext {
  stockLevel: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'pre_order';
  availableQuantity?: number;
}

export interface CommerceProductImage {
  url: string;
  type: 'main' | 'thumbnail' | 'gallery';
  alt?: string;
}

export interface CommerceProductContext {
  productId: string;
  platform: CommercePlatform;
  title: string;
  description?: string;
  seller: CommerceSellerContext;
  category: CommerceCategoryContext;
  price: CommercePriceContext;
  images: CommerceProductImage[];
  inventory: CommerceInventoryContext;
  metadata: Record<string, unknown>;
  fetchedAt: Date;
}

export type CommerceProductContextSource = 'crawl' | 'api' | 'cache' | 'user_input';

// ============================================================
// B. Context Resolution Types
// ============================================================

export interface PlatformProductContextQuery {
  platform: CommercePlatform;
  reference: string;
  source?: CommerceProductContextSource;
  includeMetadata?: boolean;
}

export interface PlatformProductContextResolutionResult {
  success: boolean;
  context?: CommerceProductContext;
  source: CommerceProductContextSource;
  confidence: number;
  errors: string[];
  resolvedAt: Date;
}

// ============================================================
// C. Context Normalization
// ============================================================

/**
 * Normalize product context to platform-neutral format
 */
export function normalizeProductContext(
  platform: CommercePlatform,
  rawContext: Record<string, unknown>
): CommerceProductContext | null {
  try {
    return {
      productId: String(rawContext.productId || rawContext.id || ''),
      platform,
      title: String(rawContext.title || rawContext.name || ''),
      description: rawContext.description ? String(rawContext.description) : undefined,
      seller: normalizeSellerContext(rawContext.seller),
      category: normalizeCategoryContext(rawContext.category),
      price: normalizePriceContext(rawContext.price, rawContext.currency),
      images: normalizeImagesContext(rawContext.images),
      inventory: normalizeInventoryContext(rawContext.inventory, rawContext.stock),
      metadata: rawContext.metadata ? Object(rawContext.metadata) : {},
      fetchedAt: new Date(),
    };
  } catch (error) {
    return null;
  }
}

// ============================================================
// D. Helper Functions
// ============================================================

function normalizeSellerContext(seller: unknown): CommerceSellerContext {
  const s = seller as Record<string, unknown> || {};
  return {
    sellerId: String(s.sellerId || s.shopId || ''),
    sellerName: String(s.sellerName || s.shopName || ''),
    sellerType: normalizeSellerType(s.sellerType),
    rating: s.rating ? Number(s.rating) : undefined,
    isVerified: Boolean(s.isVerified || s.verified),
  };
}

function normalizeSellerType(type: unknown): 'official_store' | 'mall' | 'third_party' {
  const typeStr = String(type).toLowerCase();
  if (typeStr.includes('official') || typeStr.includes('flagship')) {
    return 'official_store';
  }
  if (typeStr.includes('mall')) {
    return 'mall';
  }
  return 'third_party';
}

function normalizeCategoryContext(category: unknown): CommerceCategoryContext {
  const c = category as Record<string, unknown> || {};
  return {
    categoryId: String(c.categoryId || c.id || ''),
    categoryName: String(c.categoryName || c.name || ''),
    parentCategoryId: c.parentCategoryId ? String(c.parentCategoryId) : undefined,
    breadcrumbs: Array.isArray(c.breadcrumbs) ? c.breadcrumbs.map(String) : [],
  };
}

function normalizePriceContext(price: unknown, currency: unknown): CommercePriceContext {
  const p = price as Record<string, unknown> || {};
  const currentPrice = Number(p.currentPrice || p.price || p.sellingPrice || 0);
  const originalPrice = Number(p.originalPrice || p.listPrice || p.strikethroughPrice);
  const discount = originalPrice > 0 ? ((originalPrice - currentPrice) / originalPrice) * 100 : undefined;

  return {
    currentPrice,
    originalPrice: originalPrice > 0 ? originalPrice : undefined,
    discount: discount && discount > 0 ? discount : undefined,
    currency: String(currency || p.currency || 'USD'),
    priceType: normalizePriceType(p.priceType),
  };
}

function normalizePriceType(type: unknown): 'fixed' | 'dynamic' | 'auction' {
  const typeStr = String(type).toLowerCase();
  if (typeStr.includes('auction') || typeStr.includes('bid')) {
    return 'auction';
  }
  if (typeStr.includes('dynamic') || typeStr.includes('flash')) {
    return 'dynamic';
  }
  return 'fixed';
}

function normalizeImagesContext(images: unknown): CommerceProductImage[] {
  if (!Array.isArray(images)) {
    return [];
  }

  return images.slice(0, 10).map((img, index) => {
    const i = img as Record<string, unknown>;
    return {
      url: String(i.url || i.src || i.image || ''),
      type: index === 0 ? 'main' : 'gallery',
      alt: i.alt ? String(i.alt) : undefined,
    };
  });
}

function normalizeInventoryContext(inventory: unknown, stock: unknown): CommerceInventoryContext {
  const inv = inventory as Record<string, unknown> || {};
  const stockNum = Number(inv.stockLevel || inv.stock || inv.quantity || stock || 0);

  return {
    stockLevel: stockNum,
    stockStatus: normalizeStockStatus(stockNum, inv.stockStatus),
    availableQuantity: stockNum > 0 ? stockNum : undefined,
  };
}

function normalizeStockStatus(stockLevel: number, status: unknown): 'in_stock' | 'low_stock' | 'out_of_stock' | 'pre_order' {
  if (status) {
    const statusStr = String(status).toLowerCase();
    if (statusStr.includes('pre') || statusStr.includes('upcoming')) {
      return 'pre_order';
    }
    if (statusStr.includes('out') || statusStr.includes('sold')) {
      return 'out_of_stock';
    }
    if (statusStr.includes('low')) {
      return 'low_stock';
    }
  }

  if (stockLevel === 0) {
    return 'out_of_stock';
  }
  if (stockLevel < 10) {
    return 'low_stock';
  }
  return 'in_stock';
}

// ============================================================
// E. Context Validation
// ============================================================

export function validateProductContext(context: CommerceProductContext): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!context.productId) {
    errors.push('Product ID is required');
  }

  if (!context.platform) {
    errors.push('Platform is required');
  }

  if (!context.title) {
    errors.push('Product title is required');
  }

  if (!context.seller?.sellerId) {
    errors.push('Seller ID is required');
  }

  if (!context.price?.currentPrice) {
    errors.push('Current price is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
