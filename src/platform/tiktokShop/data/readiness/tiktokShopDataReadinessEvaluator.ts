/**
 * TikTok Shop Data Readiness Evaluator
 * Core evaluator for data layer readiness
 */

import type {
  TikTokShopSourceReadinessResult,
  TikTokShopDataBlocker,
  TikTokShopDataWarning,
  TikTokShopDataReadinessSummary,
  TikTokShopContextSupportMatrix,
  TikTokShopPromotionSupportMatrix,
} from '../types.js';
import { TikTokShopReadinessStatus } from '../types.js';
import { TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS } from '../constants.js';
import { logger } from '../../../../utils/logger.js';
import { buildTikTokShopContextSupportMatrix } from './tiktokShopContextSupportMatrix.js';
import { buildTikTokShopPromotionSupportMatrix } from './tiktokShopContextSupportMatrix.js';

/**
 * Evaluate overall TikTok Shop data readiness
 */
export async function evaluateTikTokShopDataReadiness(): Promise<TikTokShopSourceReadinessResult> {
  logger.info({ msg: 'Evaluating TikTok Shop data readiness' });

  const blockers: TikTokShopDataBlocker[] = [];
  const warnings: TikTokShopDataWarning[] = [];

  // Evaluate context readiness
  const contextResult = await evaluateTikTokShopContextReadiness();
  blockers.push(...contextResult.blockers);
  warnings.push(...contextResult.warnings);

  // Evaluate promotion source readiness
  const promotionResult = await evaluateTikTokShopPromotionSourceReadiness();
  blockers.push(...promotionResult.blockers);
  warnings.push(...promotionResult.warnings);

  // Calculate overall readiness score
  const contextScore = contextResult.readinessScore;
  const promotionScore = promotionResult.readinessScore;

  const overallScore = (contextScore * 0.6 + promotionScore * 0.4);

  // Determine readiness status
  let readinessStatus: TikTokShopReadinessStatus;
  if (overallScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.READY_THRESHOLD) {
    readinessStatus = TikTokShopReadinessStatus.READY;
  } else if (overallScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.PROCEED_CAUTIOUSLY_THRESHOLD) {
    readinessStatus = TikTokShopReadinessStatus.PROCEED_CAUTIOUSLY;
  } else if (overallScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.HOLD_THRESHOLD) {
    readinessStatus = TikTokShopReadinessStatus.HOLD;
  } else {
    readinessStatus = TikTokShopReadinessStatus.NOT_READY;
  }

  return {
    sourceKey: 'data-layer',
    readinessStatus,
    readinessScore: overallScore,
    blockers,
    warnings,
    metadata: {
      contextScore,
      promotionScore,
      evaluatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Evaluate context readiness for data layer
 */
export async function evaluateTikTokShopContextReadiness(): Promise<TikTokShopSourceReadinessResult> {
  logger.info({ msg: 'Evaluating TikTok Shop context readiness' });

  const blockers: TikTokShopDataBlocker[] = [];
  const warnings: TikTokShopDataWarning[] = [];

  // Build context support matrix
  const contextMatrix = await buildTikTokShopContextSupportMatrix();

  // Check product context
  const productCoverage = Object.values(contextMatrix.product).filter((f) => f.supported).length / Object.keys(contextMatrix.product).length;

  if (productCoverage < 0.5) {
    blockers.push({
      blockerId: 'insufficient-product-context',
      blockerType: 'source_gap',
      severity: 'critical',
      message: `Product context coverage is only ${(productCoverage * 100).toFixed(0)}% - below minimum threshold`,
    });
  } else if (productCoverage < 0.7) {
    warnings.push({
      warningId: 'low-product-context',
      warningType: 'coverage_gap',
      severity: 'medium',
      message: `Product context coverage is ${(productCoverage * 100).toFixed(0)}% - could be improved`,
    });
  }

  // Check seller context
  const sellerCoverage = Object.values(contextMatrix.seller).filter((f) => f.supported).length / Object.keys(contextMatrix.seller).length;

  if (sellerCoverage < 0.4) {
    blockers.push({
      blockerId: 'insufficient-seller-context',
      blockerType: 'source_gap',
      severity: 'high',
      message: `Seller context coverage is only ${(sellerCoverage * 100).toFixed(0)}% - below minimum threshold`,
    });
  } else if (sellerCoverage < 0.6) {
    warnings.push({
      warningId: 'low-seller-context',
      warningType: 'coverage_gap',
      severity: 'medium',
      message: `Seller context coverage is ${(sellerCoverage * 100).toFixed(0)}% - could be improved`,
    });
  }

  // Check category context
  const categoryCoverage = Object.values(contextMatrix.category).filter((f) => f.supported).length / Object.keys(contextMatrix.category).length;

  if (categoryCoverage < 0.3) {
    blockers.push({
      blockerId: 'insufficient-category-context',
      blockerType: 'source_gap',
      severity: 'high',
      message: `Category context coverage is only ${(categoryCoverage * 100).toFixed(0)}% - below minimum threshold`,
    });
  }

  // Check price context
  const priceCoverage = Object.values(contextMatrix.price).filter((f) => f.supported).length / Object.keys(contextMatrix.price).length;

  if (priceCoverage < 0.6) {
    warnings.push({
      warningId: 'low-price-context',
      warningType: 'coverage_gap',
      severity: 'medium',
      message: `Price context coverage is ${(priceCoverage * 100).toFixed(0)}% - could be improved`,
    });
  }

  // Calculate score
  const contextScore = (productCoverage * 0.4 + sellerCoverage * 0.3 + categoryCoverage * 0.15 + priceCoverage * 0.15);

  return {
    sourceKey: 'context-layer',
    readinessStatus: contextScore >= 0.5 ? TikTokShopReadinessStatus.PROCEED_CAUTIOUSLY : TikTokShopReadinessStatus.HOLD,
    readinessScore: contextScore,
    blockers,
    warnings,
    metadata: {
      contextMatrix,
      evaluatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Evaluate promotion source readiness
 */
export async function evaluateTikTokShopPromotionSourceReadiness(): Promise<TikTokShopSourceReadinessResult> {
  logger.info({ msg: 'Evaluating TikTok Shop promotion source readiness' });

  const blockers: TikTokShopDataBlocker[] = [];
  const warnings: TikTokShopDataWarning[] = [];

  // Build promotion support matrix
  const promotionMatrix = await buildTikTokShopPromotionSupportMatrix();

  // Check promotion type support
  const supportedTypes = promotionMatrix.promotionTypes.filter((t) => t.supported).length;
  const totalTypes = promotionMatrix.promotionTypes.length;

  if (supportedTypes === 0) {
    blockers.push({
      blockerId: 'no-promotion-types-supported',
      blockerType: 'source_gap',
      severity: 'critical',
      message: 'No promotion types are supported by current sources',
    });
  } else if (supportedTypes < totalTypes * 0.3) {
    warnings.push({
      warningId: 'limited-promotion-types',
      warningType: 'coverage_gap',
      severity: 'high',
      message: `Only ${supportedTypes} of ${totalTypes} promotion types are supported`,
    });
  }

  // Check constraint support
  const supportedConstraints = promotionMatrix.constraintSupport.filter((c) => c.supported).length;
  const totalConstraints = promotionMatrix.constraintSupport.length;

  if (supportedConstraints < totalConstraints * 0.5) {
    warnings.push({
      warningId: 'limited-constraint-support',
      warningType: 'coverage_gap',
      severity: 'medium',
      message: `Only ${supportedConstraints} of ${totalConstraints} promotion constraints are supported`,
    });
  }

  // Calculate score
  const typeScore = totalTypes > 0 ? supportedTypes / totalTypes : 0;
  const constraintScore = totalConstraints > 0 ? supportedConstraints / totalConstraints : 0;
  const promotionScore = typeScore * 0.7 + constraintScore * 0.3;

  return {
    sourceKey: 'promotion-source-layer',
    readinessStatus: promotionScore >= 0.5 ? TikTokShopReadinessStatus.PROCEED_CAUTIOUSLY : TikTokShopReadinessStatus.HOLD,
    readinessScore: promotionScore,
    blockers,
    warnings,
    metadata: {
      promotionMatrix,
      evaluatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Build data readiness summary
 */
export async function buildTikTokShopDataReadinessSummary(): Promise<TikTokShopDataReadinessSummary> {
  const dataResult = await evaluateTikTokShopDataReadiness();
  const contextResult = await evaluateTikTokShopContextReadiness();
  const promotionResult = await evaluateTikTokShopPromotionSourceReadiness();

  return {
    overallScore: dataResult.readinessScore,
    readinessStatus: dataResult.readinessStatus,
    contextScore: contextResult.readinessScore,
    promotionSourceScore: promotionResult.readinessScore,
    qualityScore: 0.5, // Would be calculated from quality metrics
    freshnessScore: 0.5, // Would be calculated from freshness metrics
  };
}

/**
 * Classify blockers and warnings by severity
 */
export function classifyTikTokShopDataBlockersAndWarnings(
  blockers: TikTokShopDataBlocker[],
  warnings: TikTokShopDataWarning[]
): {
  criticalBlockers: TikTokShopDataBlocker[];
  highBlockers: TikTokShopDataBlocker[];
  mediumWarnings: TikTokShopDataWarning[];
  lowWarnings: TikTokShopDataWarning[];
  canProceed: boolean;
  recommendation: 'proceed' | 'hold' | 'not_ready';
} {
  const criticalBlockers = blockers.filter((b) => b.severity === 'critical');
  const highBlockers = blockers.filter((b) => b.severity === 'high');
  const mediumWarnings = warnings.filter((w) => w.severity === 'medium');
  const lowWarnings = warnings.filter((w) => w.severity === 'low');

  let canProceed = true;
  let recommendation: 'proceed' | 'hold' | 'not_ready' = 'proceed';

  if (criticalBlockers.length > 0) {
    canProceed = false;
    recommendation = 'not_ready';
  } else if (highBlockers.length > 0) {
    canProceed = false;
    recommendation = 'hold';
  } else if (mediumWarnings.length > 5) {
    canProceed = true;
    recommendation = 'hold';
  }

  return {
    criticalBlockers,
    highBlockers,
    mediumWarnings,
    lowWarnings,
    canProceed,
    recommendation,
  };
}
