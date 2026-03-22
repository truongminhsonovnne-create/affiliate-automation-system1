/**
 * TikTok Shop Acquisition Service
 * Main orchestrator for TikTok Shop acquisition foundation
 */

import type { TikTokShopAcquisitionFoundationSummary, TikTokShopAcquisitionDecisionSupport } from '../types.js';
import { logger } from '../../../../utils/logger.js';
import { runTikTokShopDiscovery } from '../discovery/tiktokShopDiscoveryOrchestrator.js';
import { runTikTokShopDetailExtraction } from '../detail/tiktokShopDetailOrchestrator.js';
import { evaluateTikTokShopAcquisitionHealth } from '../health/tiktokShopAcquisitionHealthService.js';
import { evaluateTikTokShopAcquisitionGovernance } from '../governance/tiktokShopAcquisitionGovernance.js';

/**
 * Run full acquisition foundation cycle
 */
export async function runTikTokShopAcquisitionFoundationCycle(
  options?: {
    runDiscovery?: boolean;
    runDetail?: boolean;
    referenceKeys?: string[];
    seeds?: string[];
  }
): Promise<TikTokShopAcquisitionFoundationSummary> {
  logger.info({ msg: 'Starting TikTok Shop acquisition foundation cycle', options });

  // Evaluate health
  const health = await evaluateTikTokShopAcquisitionHealth();

  // Evaluate governance
  const governance = await evaluateTikTokShopAcquisitionGovernance({
    healthScore: health.healthScore,
    errorRate: 1 - health.successRate,
    consecutiveFailures: 0,
  });

  // Run discovery if allowed
  let discoveryResult = null;
  if (options?.runDiscovery !== false && governance.canRunDiscovery) {
    try {
      discoveryResult = await runTikTokShopDiscovery({ seeds: options?.seeds });
    } catch (error) {
      logger.error({ msg: 'Discovery failed', error });
    }
  }

  // Run detail extraction if allowed
  let detailResult = null;
  if (options?.runDetail !== false && governance.canRunDetail && options?.referenceKeys) {
    try {
      detailResult = await runTikTokShopDetailExtraction(options.referenceKeys);
    } catch (error) {
      logger.error({ msg: 'Detail extraction failed', error });
    }
  }

  return {
    discovery: discoveryResult ? {
      jobId: discoveryResult.jobId,
      jobStatus: 'completed' as any,
      itemsDiscovered: discoveryResult.itemsDiscovered,
      itemsDeduped: discoveryResult.itemsDeduped,
      itemsFailed: discoveryResult.itemsFailed,
      duration: 0,
      errors: discoveryResult.errors,
      warnings: discoveryResult.warnings,
    } : null,
    detail: detailResult ? {
      jobId: detailResult[0]?.jobId || '',
      referenceKey: options?.referenceKeys?.[0] || '',
      extractionStatus: 'extracted' as any,
      qualityScore: 0,
      fieldsExtracted: 0,
      fieldsMissing: 0,
      duration: 0,
      errors: [],
      warnings: [],
    } : null,
    health,
    governance,
    quality: {
      overallScore: 0,
      titleScore: 0,
      sellerScore: 0,
      priceScore: 0,
      categoryScore: 0,
      promotionScore: 0,
      mediaScore: 0,
      evidenceScore: 0,
      status: 'acceptable' as any,
      gaps: [],
    },
    blockers: [],
    warnings: [],
  };
}

/**
 * Run discovery cycle
 */
export async function runTikTokShopDiscoveryCycle(input?: { seeds?: string[]; categories?: string[] }) {
  return runTikTokShopDiscovery(input);
}

/**
 * Run detail cycle
 */
export async function runTikTokShopDetailCycle(referenceKeys: string[]) {
  return runTikTokShopDetailExtraction(referenceKeys);
}

/**
 * Build acquisition foundation report
 */
export async function buildTikTokShopAcquisitionFoundationReport(): Promise<TikTokShopAcquisitionFoundationSummary> {
  return runTikTokShopAcquisitionFoundationCycle({ runDiscovery: false, runDetail: false });
}

/**
 * Build acquisition decision support
 */
export async function buildTikTokShopAcquisitionDecisionSupport(): Promise<TikTokShopAcquisitionDecisionSupport> {
  const health = await evaluateTikShopAcquisitionHealth();
  const governance = await evaluateTikTokShopAcquisitionGovernance({
    healthScore: health.healthScore,
    errorRate: 1 - health.successRate,
    consecutiveFailures: 0,
  });

  const recommendation = governance.shouldPause ? 'stop' : governance.shouldThrottle ? 'pause' : 'proceed';

  return {
    recommendation,
    readinessStatus: health.runtimeHealth,
    blockers: [],
    warnings: [],
    nextSteps: governance.reasons,
    summary: `TikTok Shop acquisition ${recommendation}. Health: ${health.healthScore.toFixed(2)}`,
  };
}
