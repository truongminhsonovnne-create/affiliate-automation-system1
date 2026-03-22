/**
 * Shopee Detail Extraction - Selectors
 *
 * Production-grade selector registry for Shopee product detail page.
 */

// ============================================
// Selector Definitions
// ============================================

/**
 * Detail page selectors
 */
export const SHOPEE_DETAIL_SELECTORS = {
  // ========================================
  // Title
  // ========================================
  title: {
    primary: [
      '.product-title',
      '.pdp-mod-product-title',
      'h1[class*="product-title"]',
    ],
    fallback: [
      '[data-sqe="product-title"]',
      'h1',
    ],
    description: 'Product title',
  },

  // ========================================
  // Price
  // ========================================
  price: {
    primary: [
      '.product-price',
      '.pdp-product-price',
      '[data-sqe="product-price"]',
    ],
    fallback: [
      '.price',
      '[class*="price"]',
    ],
    description: 'Current price',
  },

  // ========================================
  // Original Price
  // ========================================
  originalPrice: {
    primary: [
      '.product-price__original-price',
      '.original-price',
      '.pdp-product-price-original',
    ],
    fallback: [
      '[data-sqe="original-price"]',
      '[class*="original"]',
    ],
    description: 'Original price before discount',
  },

  // ========================================
  // Discount
  // ========================================
  discount: {
    primary: [
      '.product-price__discount',
      '.discount-badge',
      '.pdp-badge-discount',
    ],
    fallback: [
      '[data-sqe="discount"]',
      '[class*="discount"]',
    ],
    description: 'Discount percentage badge',
  },

  // ========================================
  // Images
  // ========================================
  images: {
    primary: [
      '.product-image-gallery',
      '.pdp-product-image',
      '.product-images',
    ],
    fallback: [
      '[data-sqe="product-image"]',
      '.product-image img',
      'img[class*="product"]',
    ],
    description: 'Product image gallery',
  },

  imageThumbnails: {
    primary: [
      '.product-image-thumbnails',
      '.pdp-product-thumbnail',
    ],
    fallback: [
      '[data-sqe="product-thumbnail"]',
      '[class*="thumbnail"]',
    ],
    description: 'Product image thumbnails',
  },

  // ========================================
  // Description
  // ========================================
  description: {
    primary: [
      '.product-description',
      '.pdp-product-description',
      '[data-sqe="product-description"]',
    ],
    fallback: [
      '[class*="description"]',
      '#product-description',
    ],
    description: 'Product description content',
  },

  // ========================================
  // Seller Info
  // ========================================
  sellerName: {
    primary: [
      '.product-seller-name',
      '.seller-name',
      '.pdp-seller-name',
    ],
    fallback: [
      '[data-sqe="seller-name"]',
      '[class*="seller"]',
    ],
    description: 'Seller/shop name',
  },

  sellerLocation: {
    primary: [
      '.seller-location',
      '.shop-location',
    ],
    fallback: [
      '[data-sqe="seller-location"]',
      '[class*="location"]',
    ],
    description: 'Seller location',
  },

  sellerRating: {
    primary: [
      '.seller-rating',
      '.shop-rating',
    ],
    fallback: [
      '[data-sqe="seller-rating"]',
      '[class*="rating"]',
    ],
    description: 'Seller rating',
  },

  // ========================================
  // Stats (Sold, Rating)
  // ========================================
  soldCount: {
    primary: [
      '.product-sold-count',
      '.pdp-product-sold-count',
    ],
    fallback: [
      '[data-sqe="sold-count"]',
      '[class*="sold"]',
    ],
    description: 'Number of items sold',
  },

  rating: {
    primary: [
      '.product-rating',
      '.pdp-product-rating',
    ],
    fallback: [
      '[data-sqe="rating"]',
      '[class*="rating"]',
    ],
    description: 'Product rating',
  },

  ratingCount: {
    primary: [
      '.product-rating-count',
      '.pdp-product-rating-count',
    ],
    fallback: [
      '[data-sqe="rating-count"]',
      '[class*="rating-count"]',
    ],
    description: 'Total ratings count',
  },

  // ========================================
  // Category/Breadcrumb
  // ========================================
  categoryPath: {
    primary: [
      '.product-breadcrumb',
      '.pdp-breadcrumb',
    ],
    fallback: [
      '[data-sqe="breadcrumb"]',
      '[class*="breadcrumb"]',
    ],
    description: 'Category breadcrumb',
  },

  // ========================================
  // Badges
  // ========================================
  badges: {
    primary: [
      '.product-badges',
      '.pdp-product-badges',
    ],
    fallback: [
      '[data-sqe="product-badges"]',
      '[class*="badge"]',
    ],
    description: 'Product badges (free shipping, etc)',
  },

  // ========================================
  // Page Container
  // ========================================
  pageContainer: {
    primary: [
      '.product-page',
      '.pdp-page',
      'main',
    ],
    fallback: [
      'body',
    ],
    description: 'Detail page container',
  },
} as const;

/**
 * Get selector for a field
 */
export function getDetailSelector(
  field: keyof typeof SHOPEE_DETAIL_SELECTORS
): string | null {
  const selectorSet = SHOPEE_DETAIL_SELECTORS[field];

  if (selectorSet?.primary?.[0]) {
    return selectorSet.primary[0];
  }

  if (selectorSet?.fallback?.[0]) {
    return selectorSet.fallback[0];
  }

  return null;
}

/**
 * Get all selectors for a field (primary + fallback)
 */
export function getAllDetailSelectors(
  field: keyof typeof SHOPEE_DETAIL_SELECTORS
): string[] {
  const selectorSet = SHOPEE_DETAIL_SELECTORS[field];

  return [
    ...(selectorSet?.primary || []),
    ...(selectorSet?.fallback || []),
  ];
}

/**
 * Get all image selectors
 */
export function getImageSelectors(): string[] {
  return [
    ...getAllDetailSelectors('images'),
    ...getAllDetailSelectors('imageThumbnails'),
  ];
}

/**
 * Selector profile for logging
 */
export interface DetailSelectorProfile {
  selectors: {
    [K in keyof typeof SHOPEE_DETAIL_SELECTORS]: string | null;
  };
}

/**
 * Create selector profile
 */
export function createDetailSelectorProfile(): DetailSelectorProfile {
  const fields = Object.keys(SHOPEE_DETAIL_SELECTORS) as Array<keyof typeof SHOPEE_DETAIL_SELECTORS>;

  const selectors: Record<string, string | null> = {};

  for (const field of fields) {
    selectors[field] = getDetailSelector(field);
  }

  return { selectors } as DetailSelectorProfile;
}
