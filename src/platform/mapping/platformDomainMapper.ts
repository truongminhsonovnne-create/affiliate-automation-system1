/**
 * Platform Domain Mapper
 *
 * Maps existing domain models to platform-neutral contracts.
 */

import type { CommercePlatform } from '../types.js';
import type { CommerceProductReference, CommerceProductContext, CommercePromotion } from '../contracts/index.js';

/**
 * Map Shopee reference to commerce reference
 */
export function mapShopeeReferenceToCommerceReference(shopeeData: {
  productId?: string;
  shopId?: string;
  itemId?: string;
  url?: string;
}): CommerceProductReference {
  return {
    referenceId: `shopee_${shopeeData.productId || shopeeData.itemId || ''}`,
    platform: 'shopee',
    identifiers: [{
      platform: 'shopee',
      productId: shopeeData.productId || shopeeData.itemId || '',
      productUrl: shopeeData.url,
    }],
    normalizedForm: shopeeData.url || shopeeData.productId || '',
    referenceType: shopeeData.url ? 'url' : 'id',
  };
}

/**
 * Map Shopee product context to commerce context
 */
export function mapShopeeProductContextToCommerceContext(shopeeData: {
  itemid?: string;
  shopid?: string;
  name?: string;
  description?: string;
  price?: number | string;
  price_before_discount?: number | string;
  currency?: string;
  images?: string[];
  shop_name?: string;
  shop_rating?: number;
  categoryid?: number;
  category_name?: string;
  stock?: number;
}): CommerceProductContext {
  const price = typeof shopeeData.price === 'string' ? parseFloat(shopeeData.price) : shopeeData.price || 0;
  const originalPrice = typeof shopeeData.price_before_discount === 'string'
    ? parseFloat(shopeeData.price_before_discount)
    : shopeeData.price_before_discount || 0;

  return {
    productId: `${shopeeData.shopid}_${shopeeData.itemid}`,
    platform: 'shopee',
    title: shopeeData.name || '',
    description: shopeeData.description,
    seller: {
      sellerId: String(shopeeData.shopid || ''),
      sellerName: shopeeData.shop_name || '',
      sellerType: 'third_party',
      rating: shopeeData.shop_rating,
      isVerified: false,
    },
    category: {
      categoryId: String(shopeeData.categoryid || ''),
      categoryName: shopeeData.category_name || '',
      breadcrumbs: [],
    },
    price: {
      currentPrice: price / 100000, // Shopee uses long integers
      originalPrice: originalPrice > 0 ? originalPrice / 100000 : undefined,
      currency: shopeeData.currency || 'VND',
      priceType: 'fixed',
    },
    images: shopeeData.images ? shopeeData.images.map((url, i) => ({
      url,
      type: i === 0 ? 'main' : 'gallery',
    })) : [],
    inventory: {
      stockLevel: shopeeData.stock || 0,
      stockStatus: shopeeData.stock ? (shopeeData.stock > 0 ? 'in_stock' : 'out_of_stock') : 'out_of_stock',
    },
    metadata: {},
    fetchedAt: new Date(),
  };
}

/**
 * Map Shopee voucher to commerce promotion
 */
export function mapShopeeVoucherToCommercePromotion(shopeeData: {
  voucher_code?: string;
  voucher_id?: string;
  discount_value?: number;
  discount_percentage?: number;
  min_spend?: number;
  max_discount?: number;
  start_time?: number;
  end_time?: number;
  apply_to_all_products?: boolean;
  shop_id?: string;
}): CommercePromotion {
  return {
    promotionId: String(shopeeData.voucher_id || shopeeData.voucher_code || ''),
    platform: 'shopee',
    promotionCode: shopeeData.voucher_code,
    promotionType: 'voucher',
    title: `Shopee Voucher: ${shopeeData.voucher_code}`,
    scope: shopeeData.apply_to_all_products ? 'global' : 'seller',
    benefit: {
      discountType: shopeeData.discount_percentage ? 'percentage' : 'fixed_amount',
      discountValue: shopeeData.discount_percentage || shopeeData.discount_value || 0,
      maxDiscount: shopeeData.max_discount ? shopeeData.max_discount / 100000 : undefined,
    },
    eligibility: {
      eligibilityType: 'all',
      conditions: shopeeData.min_spend ? [{
        type: 'min_spend',
        operator: 'gte',
        value: shopeeData.min_spend / 100000,
      }] : [],
    },
    startDate: shopeeData.start_time ? new Date(shopeeData.start_time * 1000) : new Date(),
    endDate: shopeeData.end_time ? new Date(shopeeData.end_time * 1000) : new Date(),
    isStackable: false,
    metadata: {
      shopId: shopeeData.shop_id,
    },
    createdAt: new Date(),
  };
}

/**
 * Map commercial flow to platform-neutral model
 */
export function mapCommercialFlowToPlatformNeutralModel(platform: CommercePlatform, flowData: {
  surfaceId?: string;
  productId?: string;
  sessionId?: string;
  userId?: string;
  action?: string;
}): {
  surfaceId: string;
  referenceId: string;
  sessionId: string;
  userId?: string;
  actionType: string;
} {
  return {
    surfaceId: flowData.surfaceId || `${platform}_default`,
    referenceId: flowData.productId || '',
    sessionId: flowData.sessionId || '',
    userId: flowData.userId,
    actionType: flowData.action || 'click',
  };
}

/**
 * Detect platform from URL or identifier
 */
export function detectPlatformFromUrl(url: string): CommercePlatform | null {
  const lower = url.toLowerCase();

  if (lower.includes('shopee')) return 'shopee';
  if (lower.includes('tiktok') || lower.includes('shop.tiktok')) return 'tiktok_shop';
  if (lower.includes('lazada')) return 'lazada';
  if (lower.includes('tokopedia')) return 'tokopedia';

  return null;
}
