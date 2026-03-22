/**
 * Shopee Pipeline - Quality Gate
 *
 * Evaluates product quality before persistence.
 */

import type {
  ShopeeCanonicalProduct,
  ShopeeQualityGateResult,
  ShopeePersistenceDecision,
  PipelineLogger,
} from './types.js';
import { PIPELINE_QUALITY } from './constants.js';

/**
 * Evaluate Shopee product quality
 */
export function evaluateShopeeProductQuality(
  product: ShopeeCanonicalProduct,
  options: {
    /** Minimum quality score */
    minQualityScore?: number;
    /** Custom logger */
    logger?: PipelineLogger;
  } = {}
): ShopeeQualityGateResult {
  const minScore = options.minQualityScore ?? PIPELINE_QUALITY.MIN_QUALITY_SCORE;
  const logger = options.logger;

  const reasons: string[] = [];
  const warnings: string[] = [];
  const missingCritical: string[] = [];

  let score = 100;

  // Check critical fields
  if (!product.title || product.title.length < PIPELINE_QUALITY.MIN_TITLE_LENGTH) {
    score -= 30;
    reasons.push('Title missing or too short');
    missingCritical.push('title');
  }

  if (!product.productUrl) {
    score -= 30;
    reasons.push('Product URL missing');
    missingCritical.push('productUrl');
  }

  if (!product.price || !product.price.priceVnd || product.price.priceVnd <= 0) {
    score -= 25;
    reasons.push('Price invalid or missing');
    missingCritical.push('price');
  }

  // Check important fields
  if (!product.externalProductId) {
    score -= 10;
    warnings.push('External product ID missing');
  }

  if (!product.media || !product.media.images || product.media.images.length < PIPELINE_QUALITY.MIN_IMAGES) {
    score -= 15;
    warnings.push(`Insufficient images (${product.media?.images?.length || 0})`);
  }

  if (!product.seller || !product.seller.name) {
    score -= 10;
    warnings.push('Seller information missing');
  }

  if (!product.description) {
    score -= 5;
    warnings.push('Description missing');
  }

  // Check title quality
  if (product.title) {
    // Check for suspicious titles
    const suspiciousPatterns = ['test', 'demo', 'placeholder', 'xxx', 'yyy'];
    const isSuspicious = suspiciousPatterns.some(p =>
      product.title.toLowerCase().includes(p)
    );
    if (isSuspicious) {
      score -= 20;
      reasons.push('Title appears suspicious');
    }

    // Check for very short titles
    if (product.title.length < 10) {
      score -= 10;
      warnings.push('Title is very short');
    }
  }

  // Check price quality
  if (product.price) {
    // Check for unrealistic prices
    if (product.price.priceVnd > 100000000) {
      score -= 15;
      warnings.push('Price seems unrealistically high');
    }
    if (product.price.priceVnd < 1000) {
      score -= 10;
      warnings.push('Price seems unrealistically low');
    }
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  // Determine decision
  let decision: ShopeePersistenceDecision;
  if (score >= minScore && missingCritical.length === 0) {
    decision = 'insert';
  } else if (score >= minScore / 2 && missingCritical.length <= 1) {
    decision = 'update';
  } else {
    decision = 'reject';
  }

  const pass = decision === 'insert' || decision === 'update';

  const severity: 'pass' | 'warning' | 'fail' = pass
    ? (warnings.length > 0 ? 'warning' : 'pass')
    : 'fail';

  logger?.debug('Quality gate evaluation', {
    productId: product.externalProductId,
    score,
    decision,
    missingCritical,
  });

  return {
    pass,
    score,
    severity,
    reasons,
    warnings,
    missingCriticalFields: missingCritical,
    decision,
  };
}

/**
 * Determine if product should be persisted
 */
export function shouldPersistShopeeProduct(
  product: ShopeeCanonicalProduct,
  qualityResult: ShopeeQualityGateResult,
  options: {
    /** Prefer better quality (for upsert) */
    preferBetterQuality?: boolean;
    /** Existing product quality score */
    existingQualityScore?: number;
    /** Custom logger */
    logger?: PipelineLogger;
  } = {}
): {
  shouldPersist: boolean;
  decision: ShopeePersistenceDecision;
  reason: string;
} {
  const { preferBetterQuality = true, existingQualityScore, logger } = options;

  // If quality gate failed, reject
  if (qualityResult.decision === 'reject') {
    return {
      shouldPersist: false,
      decision: 'reject',
      reason: `Quality gate failed: ${qualityResult.reasons.join(', ')}`,
    };
  }

  // If no existing product, insert
  if (!existingQualityScore) {
    return {
      shouldPersist: true,
      decision: qualityResult.decision,
      reason: 'New product',
    };
  }

  // If prefer better quality is enabled, compare
  if (preferBetterQuality) {
    if (qualityResult.score >= existingQualityScore) {
      return {
        shouldPersist: true,
        decision: 'update',
        reason: `New quality (${qualityResult.score}) >= existing (${existingQualityScore})`,
      };
    } else {
      return {
        shouldPersist: false,
        decision: 'skip',
        reason: `Existing quality (${existingQualityScore}) > new (${qualityResult.score})`,
      };
    }
  }

  // Default: persist
  return {
    shouldPersist: true,
    decision: qualityResult.decision,
    reason: 'Default persistence decision',
  };
}

/**
 * Build quality gate summary
 */
export function buildQualityGateSummary(
  results: ShopeeQualityGateResult[]
): {
  total: number;
  passed: number;
  failed: number;
  averageScore: number;
  insert: number;
  update: number;
  skip: number;
  reject: number;
  commonReasons: string[];
  commonWarnings: string[];
} {
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;

  const scores = results.map(r => r.score);
  const averageScore = scores.reduce((a, b) => a + b, 0) / total;

  const insert = results.filter(r => r.decision === 'insert').length;
  const update = results.filter(r => r.decision === 'update').length;
  const skip = results.filter(r => r.decision === 'skip').length;
  const reject = results.filter(r => r.decision === 'reject').length;

  // Collect common reasons
  const reasonCounts = new Map<string, number>();
  const warningCounts = new Map<string, number>();

  for (const result of results) {
    for (const reason of result.reasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    }
    for (const warning of result.warnings) {
      warningCounts.set(warning, (warningCounts.get(warning) || 0) + 1);
    }
  }

  const commonReasons = Array.from(reasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason]) => reason);

  const commonWarnings = Array.from(warningCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([warning]) => warning);

  return {
    total,
    passed,
    failed,
    averageScore: Math.round(averageScore),
    insert,
    update,
    skip,
    reject,
    commonReasons,
    commonWarnings,
  };
}
