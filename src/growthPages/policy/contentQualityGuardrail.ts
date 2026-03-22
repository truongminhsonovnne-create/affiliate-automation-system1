/**
 * Content Quality Guardrail
 *
 * Determines whether a page has enough quality content to be indexed
 * This prevents thin/template pages from being indexed
 */

import type { ShopData, CategoryData, VoucherHint, VoucherPattern } from '../types/index.js';
import { INDEXABILITY_POLICY, CONTENT_DENSITY_LIMITS } from '../constants/index.js';

export interface QualityCheckResult {
  isIndexable: boolean;
  qualityScore: number; // 0-100
  issues: QualityIssue[];
  passedChecks: string[];
}

export interface QualityIssue {
  type: 'missing_data' | 'thin_content' | 'no_unique_content' | 'no_voucher_data';
  severity: 'error' | 'warning';
  message: string;
}

/**
 * Check if shop page has enough quality content to be indexed
 */
export function checkShopPageQuality(shopData: ShopData | null, voucherHints: VoucherHint[]): QualityCheckResult {
  const issues: QualityIssue[] = [];
  const passedChecks: string[] = [];
  let qualityScore = 100;

  // Check 1: Shop data must exist
  if (!shopData) {
    issues.push({
      type: 'missing_data',
      severity: 'error',
      message: 'Shop data is missing',
    });
    qualityScore -= 50;
    return { isIndexable: false, qualityScore, issues, passedChecks };
  }

  // Check 2: Shop must have a name
  if (!shopData.name || shopData.name.length < 2) {
    issues.push({
      type: 'thin_content',
      severity: 'error',
      message: 'Shop name is missing or too short',
    });
    qualityScore -= 30;
  } else {
    passedChecks.push('Shop has valid name');
  }

  // Check 3: Shop must have a description (unique content)
  if (!shopData.description || shopData.description.length < CONTENT_DENSITY_LIMITS.MIN_DESCRIPTION_LENGTH) {
    issues.push({
      type: 'thin_content',
      severity: 'warning',
      message: 'Shop description is missing or too short',
    });
    qualityScore -= 20;
  } else {
    passedChecks.push('Shop has sufficient description');
  }

  // Check 4: Shop should have a category
  if (!shopData.category) {
    issues.push({
      type: 'thin_content',
      severity: 'warning',
      message: 'Shop category is missing',
    });
    qualityScore -= 10;
  } else {
    passedChecks.push('Shop has category');
  }

  // Check 5: Shop should have voucher hints or real data
  if (voucherHints.length === 0) {
    issues.push({
      type: 'no_voucher_data',
      severity: 'warning',
      message: 'No voucher data available for this shop',
    });
    qualityScore -= 15;
  } else {
    passedChecks.push('Shop has voucher data');
  }

  // Check 6: Description should not be generic (template-like)
  if (shopData.description) {
    const genericPatterns = [
      /dán link.*để tìm mã giảm giá/i,
      /tự động tìm.*mã giảm giá/i,
      /công cụ tìm mã/i,
    ];
    const isGeneric = genericPatterns.some(pattern => pattern.test(shopData.description || ''));
    if (isGeneric) {
      issues.push({
        type: 'no_unique_content',
        severity: 'warning',
        message: 'Shop description appears to be generic/template content',
      });
      qualityScore -= 20;
    } else {
      passedChecks.push('Shop has unique description');
    }
  }

  // Minimum quality threshold for indexing
  const isIndexable = qualityScore >= INDEXABILITY_POLICY.MIN_QUALITY_SCORE_THRESHOLD || passedChecks.includes('Shop has voucher data');

  return {
    isIndexable,
    qualityScore: Math.max(0, qualityScore),
    issues,
    passedChecks,
  };
}

/**
 * Check if category page has enough quality content to be indexed
 */
export function checkCategoryPageQuality(
  categoryData: CategoryData | null,
  voucherPatterns: VoucherPattern[]
): QualityCheckResult {
  const issues: QualityIssue[] = [];
  const passedChecks: string[] = [];
  let qualityScore = 100;

  // Check 1: Category data must exist
  if (!categoryData) {
    issues.push({
      type: 'missing_data',
      severity: 'error',
      message: 'Category data is missing',
    });
    qualityScore -= 50;
    return { isIndexable: false, qualityScore, issues, passedChecks };
  }

  // Check 2: Category must have a name
  if (!categoryData.name || categoryData.name.length < 2) {
    issues.push({
      type: 'thin_content',
      severity: 'error',
      message: 'Category name is missing or too short',
    });
    qualityScore -= 30;
  } else {
    passedChecks.push('Category has valid name');
  }

  // Check 3: Category must have a description (unique content)
  if (!categoryData.description || categoryData.description.length < CONTENT_DENSITY_LIMITS.MIN_DESCRIPTION_LENGTH) {
    issues.push({
      type: 'thin_content',
      severity: 'warning',
      message: 'Category description is missing or too short',
    });
    qualityScore -= 20;
  } else {
    passedChecks.push('Category has sufficient description');
  }

  // Check 4: Category should have shop count
  if (!categoryData.shopCount || categoryData.shopCount < 1) {
    issues.push({
      type: 'thin_content',
      severity: 'warning',
      message: 'Category has no shops',
    });
    qualityScore -= 10;
  } else {
    passedChecks.push('Category has shop data');
  }

  // Check 5: Category should have voucher patterns or real data
  if (voucherPatterns.length === 0) {
    issues.push({
      type: 'no_voucher_data',
      severity: 'warning',
      message: 'No voucher patterns available for this category',
    });
    qualityScore -= 15;
  } else {
    passedChecks.push('Category has voucher data');
  }

  // Check 6: Description should not be generic
  if (categoryData.description) {
    const genericPatterns = [
      /tìm mã giảm giá.*trên shopee/i,
      /dán link.*để tìm mã/i,
      /công cụ tìm mã/i,
    ];
    const isGeneric = genericPatterns.some(pattern => pattern.test(categoryData.description || ''));
    if (isGeneric) {
      issues.push({
        type: 'no_unique_content',
        severity: 'warning',
        message: 'Category description appears to be generic/template content',
      });
      qualityScore -= 20;
    } else {
      passedChecks.push('Category has unique description');
    }
  }

  // Minimum quality threshold for indexing
  const isIndexable = qualityScore >= INDEXABILITY_POLICY.MIN_QUALITY_SCORE_THRESHOLD || passedChecks.includes('Category has voucher data');

  return {
    isIndexable,
    qualityScore: Math.max(0, qualityScore),
    issues,
    passedChecks,
  };
}

/**
 * Determine robots directive based on quality check
 */
export function getRobotsDirective(isIndexable: boolean): string {
  if (isIndexable) {
    return 'index, follow';
  }
  return 'noindex, follow';
}
