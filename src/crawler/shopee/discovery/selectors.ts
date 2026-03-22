/**
 * Shopee Discovery Crawler - Selectors
 *
 * Production-grade selector registry for Shopee listing pages.
 * Provides fallback selectors with clear documentation.
 */

// ============================================
// Selector Definitions
// ============================================

/**
 * Selector set for a specific page type
 */
export interface SelectorSet {
  /** Primary selectors */
  primary: string[];
  /** Fallback selectors */
  fallback: string[];
  /** Description */
  description: string;
}

/**
 * All selectors for Shopee listing pages
 */
export const SHOPEE_SELECTORS = {
  // ========================================
  // Flash Sale Page Selectors
  // ========================================

  flashSale: {
    card: {
      primary: [
        // Main flash sale product grid
        '.flash-sale-item-page-1Fe6R',
        // Alternative: grid container
        '.shopee-search-item-result .item-card-wrapper',
      ],
      fallback: [
        // Generic fallback
        '[data-sqe="item"]',
        // Grid items
        '.grid-view .item-card-wrapper',
        // Any product card in flash sale
        '.flash-sale-page .item-card-wrapper',
      ],
      description: 'Flash sale product card container',
    },

    title: {
      primary: [
        '.product-name',
        '.flash-sale-item-page-1Fe6R .product-name',
      ],
      fallback: [
        // Generic fallback
        '[data-sqe="name"]',
        'a.product-title',
      ],
      description: 'Product title text',
    },

    price: {
      primary: [
        '.price',
        '.flash-sale-item-page-1Fe6R .price',
      ],
      fallback: [
        '[data-sqe="price"]',
        '.item-card .price',
      ],
      description: 'Product price',
    },

    image: {
      primary: [
        '.product-img',
        '.flash-sale-item-page-1Fe6R .product-img img',
      ],
      fallback: [
        '[data-sqe="image"] img',
        '.item-card img',
      ],
      description: 'Product image',
    },

    link: {
      primary: [
        'a.product-name',
        '.flash-sale-item-page-1Fe6R a',
      ],
      fallback: [
        '[data-sqe="name"] a',
        '.item-card-wrapper a',
      ],
      description: 'Product link',
    },

    badges: {
      primary: [
        '.badge-container',
        '.product-badges',
      ],
      fallback: [
        '[data-sqe="badge"]',
        '.discount-badge',
      ],
      description: 'Product badges (discount, etc)',
    },

    container: {
      primary: [
        '.flash-sale-page',
        '.flash-sale-item-page-1Fe6R',
      ],
      fallback: [
        'main',
        'body',
      ],
      description: 'Flash sale page container',
    },
  },

  // ========================================
  // Search Page Selectors
  // ========================================

  search: {
    card: {
      primary: [
        // Main search result grid
        '.shopee-search-item-result__items',
        '.shopee-search-item-result .item-card-wrapper',
      ],
      fallback: [
        // Generic fallback
        '[data-sqe="item"]',
        // Mobile specific
        '.mobile-search-results .item-card-wrapper',
        // Desktop fallback
        '.search-items .item-card',
      ],
      description: 'Search result product card container',
    },

    title: {
      primary: [
        '.product-name',
        '.search-item-product-name',
      ],
      fallback: [
        '[data-sqe="name"]',
        '.item-card .product-name',
        'a.product-title',
      ],
      description: 'Product title text',
    },

    price: {
      primary: [
        '.price',
        '.item-card .price',
      ],
      fallback: [
        '[data-sqe="price"]',
        '.search-item-price',
      ],
      description: 'Product price',
    },

    image: {
      primary: [
        '.product-img img',
        '.search-item-img img',
      ],
      fallback: [
        '[data-sqe="image"] img',
        '.item-card img',
      ],
      description: 'Product image',
    },

    link: {
      primary: [
        'a.product-name',
        'a.search-item-link',
      ],
      fallback: [
        '[data-sqe="name"] a',
        '.item-card-wrapper a',
      ],
      description: 'Product link',
    },

    badges: {
      primary: [
        '.badge-container',
        '.product-badges',
      ],
      fallback: [
        '[data-sqe="badge"]',
        '.discount-badge',
        '.item-card .badge',
      ],
      description: 'Product badges',
    },

    container: {
      primary: [
        '.shopee-search-item-result',
        '.search-page',
      ],
      fallback: [
        'main',
        'body',
      ],
      description: 'Search page container',
    },
  },

  // ========================================
  // Generic/Common Selectors
  // ========================================

  generic: {
    card: {
      primary: [
        // Most common selector pattern
        '.item-card-wrapper',
        // Grid container
        '[data-sqe="item"]',
      ],
      fallback: [
        // Ultra generic
        '.shopee-item-card',
        '.product-card',
        // Last resort
        '[class*="product"]',
      ],
      description: 'Generic product card (fallback)',
    },

    title: {
      primary: [
        '[data-sqe="name"]',
        '.product-name',
      ],
      fallback: [
        '.item-card .product-name',
        '[class*="product-name"]',
      ],
      description: 'Generic product title',
    },

    price: {
      primary: [
        '[data-sqe="price"]',
        '.price',
      ],
      fallback: [
        '.item-card .price',
        '[class*="price"]',
      ],
      description: 'Generic product price',
    },

    image: {
      primary: [
        '[data-sqe="image"] img',
        '.product-img',
      ],
      fallback: [
        '.item-card img',
        '[class*="product"] img',
      ],
      description: 'Generic product image',
    },

    link: {
      primary: [
        '[data-sqe="name"] a',
        'a.product-name',
      ],
      fallback: [
        '.item-card-wrapper a',
        '[class*="product"] a',
      ],
      description: 'Generic product link',
    },
  },
} as const;

/**
 * Get selectors for a specific page kind
 */
export function getSelectorsForPageKind(
  pageKind: 'flash_sale' | 'search'
): typeof SHOPEE_SELECTORS.flashSale | typeof SHOPEE_SELECTORS.search {
  switch (pageKind) {
    case 'flash_sale':
      return SHOPEE_SELECTORS.flashSale;
    case 'search':
      return SHOPEE_SELECTORS.search;
    default:
      return SHOPEE_SELECTORS.search;
  }
}

/**
 * Get the best available selector for a field
 * Tries primary first, then falls back
 */
export function getSelector(
  pageKind: 'flash_sale' | 'search' | 'generic',
  field: keyof typeof SHOPEE_SELECTORS.flashSale
): string | null {
  let selectorSet;

  switch (pageKind) {
    case 'flash_sale':
      selectorSet = SHOPEE_SELECTORS.flashSale[field];
      break;
    case 'search':
      selectorSet = SHOPEE_SELECTORS.search[field];
      break;
    default:
      selectorSet = SHOPEE_SELECTORS.generic[field];
  }

  // Return first primary selector
  if (selectorSet?.primary?.[0]) {
    return selectorSet.primary[0];
  }

  // Fallback to first fallback
  if (selectorSet?.fallback?.[0]) {
    return selectorSet.fallback[0];
  }

  return null;
}

/**
 * Get all selectors for a field (primary + fallback)
 */
export function getAllSelectors(
  pageKind: 'flash_sale' | 'search' | 'generic',
  field: keyof typeof SHOPEE_SELECTORS.flashSale
): string[] {
  let selectorSet;

  switch (pageKind) {
    case 'flash_sale':
      selectorSet = SHOPEE_SELECTORS.flashSale[field];
      break;
    case 'search':
      selectorSet = SHOPEE_SELECTORS.search[field];
      break;
    default:
      selectorSet = SHOPEE_SELECTORS.generic[field];
  }

  return [
    ...(selectorSet?.primary || []),
    ...(selectorSet?.fallback || []),
  ];
}

/**
 * Get card selectors with fallbacks
 */
export function getCardSelectors(pageKind: 'flash_sale' | 'search' | 'generic'): string[] {
  return getAllSelectors(pageKind, 'card');
}

/**
 * Selector profile for logging/debugging
 */
export interface SelectorProfile {
  pageKind: 'flash_sale' | 'search' | 'generic';
  selectors: {
    card: string[];
    title: string | null;
    price: string | null;
    image: string | null;
    link: string | null;
    badges: string | null;
  };
}

/**
 * Create selector profile for debugging
 */
export function createSelectorProfile(
  pageKind: 'flash_sale' | 'search' | 'generic'
): SelectorProfile {
  return {
    pageKind,
    selectors: {
      card: getCardSelectors(pageKind),
      title: getSelector(pageKind, 'title'),
      price: getSelector(pageKind, 'price'),
      image: getSelector(pageKind, 'image'),
      link: getSelector(pageKind, 'link'),
      badges: getSelector(pageKind, 'badges'),
    },
  };
}
