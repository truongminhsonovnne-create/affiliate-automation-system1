/**
 * TikTok Shop Product Context Model
 *
 * Models product context for TikTok Shop with rich data for promotion resolution.
 */

import type {
  TikTokShopProductContext,
  TikTokShopSellerContext,
  TikTokShopCategoryContext,
  TikTokShopPriceContext,
  TikTokShopInventoryContext,
} from '../types.js';

/**
 * Build TikTok Shop product context
 */
export function buildTikTokShopProductContext(
  rawData: Record<string, unknown>
): TikTokShopProductContext | null {
  try {
    const productId = String(rawData.productId || rawData.itemId || '');
    const title = String(rawData.title || rawData.name || '');

    if (!productId || !title) {
      return null;
    }

    return {
      productId,
      title,
      description: rawData.description ? String(rawData.description) : undefined,
      seller: buildTikTokShopSellerContext(rawData.seller || rawData.shop),
      category: buildTikTokShopCategoryContext(rawData.category),
      price: buildTikTokShopPriceContext(rawData.price, rawData.currency),
      images: buildTikTokShopImagesContext(rawData.images),
      inventory: buildTikTokShopInventoryContext(rawData.inventory, rawData.stock),
      metadata: rawData.metadata ? Object(rawData.metadata) : {},
      fetchedAt: new Date(),
    };
  } catch {
    return null;
  }
}

/**
 * Build TikTok Shop seller context
 */
export function buildTikTokShopSellerContext(
  seller: unknown
): TikTokShopSellerContext {
  const s = seller as Record<string, unknown> || {};

  const shopId = String(s.shopId || s.id || '');
  const shopName = String(s.shopName || s.name || '');

  // Determine shop type
  let shopType: 'official' | 'verified' | 'regular' = 'regular';
  if (s.isOfficial || s.is_flagship) {
    shopType = 'official';
  } else if (s.isVerified || s.verified) {
    shopType = 'verified';
  }

  return {
    shopId,
    secShopId: s.secShopId ? String(s.secShopId) : undefined,
    shopName,
    shopType,
    rating: s.rating ? Number(s.rating) : undefined,
    followerCount: s.followerCount ? Number(s.followerCount) : undefined,
    productCount: s.productCount ? Number(s.productCount) : undefined,
    isActive: s.isActive !== false,
  };
}

/**
 * Build TikTok Shop category context
 */
export function buildTikTokShopCategoryContext(
  category: unknown
): TikTokShopCategoryContext {
  const c = category as Record<string, unknown> || {};

  return {
    categoryId: String(c.categoryId || c.id || ''),
    categoryName: String(c.categoryName || c.name || ''),
    breadcrumbs: Array.isArray(c.breadcrumbs)
      ? c.breadcrumbs.map(String)
      : c.breadcrumb
        ? [String(c.breadcrumb)]
        : [],
  };
}

/**
 * Build TikTok Shop price context
 */
export function buildTikTokShopPriceContext(
  price: unknown,
  currency: unknown
): TikTokShopPriceContext {
  const p = price as Record<string, unknown> || {};

  // Handle different price formats
  let currentPrice = 0;
  let originalPrice: number | undefined;

  if (typeof p === 'number') {
    currentPrice = p;
  } else if (typeof p === 'string') {
    currentPrice = parseFloat(p);
  } else if (typeof p === 'object') {
    currentPrice = Number(p.price || p.currentPrice || p.sellingPrice || 0);
    originalPrice = Number(p.originalPrice || p.listPrice || p.strikePrice);
  }

  // Calculate discount
  let discount: number | undefined;
  if (originalPrice && originalPrice > 0 && currentPrice > 0) {
    discount = ((originalPrice - currentPrice) / originalPrice) * 100;
  }

  // Determine price type
  let priceType: 'fixed' | 'range' | 'dynamic' = 'fixed';
  if (p.minPrice || p.maxPrice) {
    priceType = 'range';
  } else if (p.isDynamic || p.isFlashSale) {
    priceType = 'dynamic';
  }

  return {
    currentPrice,
    originalPrice: originalPrice && originalPrice > 0 ? originalPrice : undefined,
    discount: discount && discount > 0 ? discount : undefined,
    currency: String(currency || p.currency || 'USD'),
    priceType,
    minPrice: p.minPrice ? Number(p.minPrice) : undefined,
    maxPrice: p.maxPrice ? Number(p.maxPrice) : undefined,
  };
}

/**
 * Build TikTok Shop inventory context
 */
export function buildTikTokShopInventoryContext(
  inventory: unknown,
  stock: unknown
): TikTokShopInventoryContext {
  const inv = inventory as Record<string, unknown> || {};
  const stockNum = Number(inv.stockLevel || inv.stock || inv.quantity || stock || 0);

  let stockStatus: TikTokShopInventoryContext['stockStatus'] = 'in_stock';

  if (inv.stockStatus) {
    const status = String(inv.stockStatus).toLowerCase();
    if (status.includes('pre') || status.includes('upcoming')) {
      stockStatus = 'pre_order';
    } else if (status.includes('out') || status.includes('sold')) {
      stockStatus = 'out_of_stock';
    } else if (status.includes('low')) {
      stockStatus = 'low_stock';
    } else if (status.includes('unavailable') || status.includes('disable')) {
      stockStatus = 'unavailable';
    }
  } else if (stockNum === 0) {
    stockStatus = 'out_of_stock';
  } else if (stockNum < 10) {
    stockStatus = 'low_stock';
  }

  return {
    stockLevel: stockNum,
    stockStatus,
    availableQuantity: stockNum > 0 ? stockNum : undefined,
  };
}

/**
 * Build images context
 */
function buildTikTokShopImagesContext(
  images: unknown
): TikTokShopProductContext['images'] {
  if (!Array.isArray(images)) {
    return [];
  }

  return images.slice(0, 10).map((img, index) => {
    const i = img as Record<string, unknown>;
    return {
      url: String(i.url || i.src || i.image || ''),
      type: index === 0 ? 'main' : 'gallery',
    };
  });
}

/**
 * Check if product context has required fields for promotion resolution
 */
export function hasPromotionResolutionContext(context: TikTokShopProductContext): {
  canResolve: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  if (!context.productId) missingFields.push('productId');
  if (!context.seller?.shopId) missingFields.push('seller.shopId');
  if (!context.price?.currentPrice) missingFields.push('price.currentPrice');
  if (!context.category?.categoryId) missingFields.push('category.categoryId');

  return {
    canResolve: missingFields.length === 0,
    missingFields,
  };
}
