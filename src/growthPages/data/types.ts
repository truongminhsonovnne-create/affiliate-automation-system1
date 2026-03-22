/**
 * Data Layer Types
 *
 * Shared types for data services
 */

export interface GetShopLandingOptions {
  includeVoucherHints?: boolean;
  includeRelated?: boolean;
  preview?: boolean;
  locale?: string;
}

export interface GetCategoryLandingOptions {
  includeVoucherPatterns?: boolean;
  includeRelated?: boolean;
  preview?: boolean;
  locale?: string;
}

export interface GetToolExplainerOptions {
  includeRelated?: boolean;
  preview?: boolean;
  locale?: string;
}

export interface ResolveRelatedOptions {
  limit?: number;
  excludeCurrent?: boolean;
}
