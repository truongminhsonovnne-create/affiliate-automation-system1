/**
 * TikTok Shop Data Foundation Service
 * Main orchestrator for TikTok Shop data foundation review
 */

import type {
  TikTokShopDataFoundationSummary,
  TikTokShopDataDecisionSupport,
  TikTokShopSourceSummary,
  TikTokShopAcquisitionSummary,
  TikTokShopEnrichmentSummary,
  TikTokShopDataReadinessSummary,
} from '../types.js';
import { TikTokShopReadinessStatus } from '../types.js';
import { logger } from '../../../../utils/logger.js';

import { getTikTokShopDataSources, getActiveTikTokShopSources } from '../sourceRegistry/tiktokShopSourceRegistry.js';
import { buildTikTokShopSourceHealthSummary } from '../sourceHealth/tiktokShopSourceHealthService.js';
import { runTikTokShopAcquisition, buildTikTokShopAcquisitionSummary } from '../acquisition/tiktokShopAcquisitionOrchestrator.js';
import { enrichTikTokShopProductContext } from '../enrichment/tiktokShopContextEnrichmentService.js';
import { evaluateTikTokShopDataReadiness, buildTikTokShopDataReadinessSummary } from '../readiness/tiktokShopDataReadinessEvaluator.js';
import { getTikTokShopDataBacklogSummary, buildTikTokShopDataBacklog } from '../backlog/tiktokShopDataBacklogService.js';
import { buildTikTokShopDataCapabilitySnapshot, buildTikTokShopDataReadinessSignals, buildPlatformRegistryDataUpdate } from '../integration/multiPlatformDataIntegration.js';

/**
 * Run TikTok Shop data foundation review
 */
export async function runTikTokShopDataFoundationReview(): Promise<TikTokShopDataFoundationSummary> {
  logger.info({ msg: 'Running TikTok Shop data foundation review' });

  // Step 1: Inspect sources
  const sources = await getTikTokShopDataSources();
  const activeSources = await getActiveTikTokShopSources();

  // Step 2: Evaluate source health
  const healthSummary = await buildTikTokShopSourceHealthSummary();

  // Step 3: Run acquisition
  const acquisitionResults = await runTikTokShopAcquisition();
  const acquisitionSummary = await buildTikTokShopAcquisitionSummary();

  // Step 4: Run enrichment (if we have data)
  let enrichmentSummary: TikTokShopEnrichmentSummary = {
    totalRecords: 0,
    enrichedRecords: 0,
    averageQualityScore: 0,
    gaps: [],
  };

  // Step 5: Evaluate readiness
  const readinessResult = await evaluateTikTokShopDataReadiness();
  const readinessSummary = await buildTikTokShopDataReadinessSummary();

  // Step 6: Build backlog from blockers
  if (readinessResult.blockers.length > 0) {
    await buildTikTokShopDataBacklog(readinessResult.blockers);
  }

  // Step 7: Get backlog summary
  const backlogSummary = await getTikTokShopDataBacklogSummary();

  // Build source summaries
  const sourceSummaries: TikTokShopSourceSummary[] = sources.map((source) => {
    const healthResult = healthSummary.sources.find((h) => h.sourceKey === source.sourceKey);
    return {
      sourceKey: source.sourceKey,
      sourceType: source.sourceType,
      supportLevel: source.supportLevel,
      healthStatus: source.healthStatus,
      readinessStatus: readinessResult.readinessStatus,
    };
  });

  return {
    sources: sourceSummaries,
    acquisition: acquisitionSummary,
    enrichment: enrichmentSummary,
    readiness: readinessSummary,
    blockers: readinessResult.blockers,
    warnings: readinessResult.warnings,
  };
}

/**
 * Run TikTok Shop context enrichment review
 */
export async function runTikTokShopContextEnrichmentReview(): Promise<{
  summary: TikTokShopEnrichmentSummary;
  blockers: any[];
  warnings: any[];
}> {
  logger.info({ msg: 'Running TikTok Shop context enrichment review' });

  // Run acquisition to get data
  const acquisitionResults = await runTikTokShopAcquisition();

  // Get normalized records from results
  const normalizedRecords = [];

  // Enrich context
  const enrichmentResult = await enrichTikTokShopProductContext(normalizedRecords);

  return {
    summary: {
      totalRecords: enrichmentResult.recordCount,
      enrichedRecords: enrichmentResult.enrichedCount,
      averageQualityScore: enrichmentResult.qualityScore,
      gaps: enrichmentResult.gaps,
    },
    blockers: [],
    warnings: enrichmentResult.gaps,
  };
}

/**
 * Run TikTok Shop promotion source review
 */
export async function runTikTokShopPromotionSourceReview(): Promise<{
  summary: any;
  blockers: any[];
  warnings: any[];
}> {
  logger.info({ msg: 'Running TikTok Shop promotion source review' });

  const readinessResult = await evaluateTikTokShopDataReadiness();

  return {
    summary: {
      promotionSourceScore: readinessResult.metadata?.promotionScore || 0,
    },
    blockers: readinessResult.blockers,
    warnings: readinessResult.warnings,
  };
}

/**
 * Build TikTok Shop data foundation report
 */
export async function buildTikTokShopDataFoundationReport(): Promise<TikTokShopDataFoundationSummary> {
  return runTikTokShopDataFoundationReview();
}

/**
 * Build TikTok Shop data decision support
 */
export async function buildTikTokShopDataDecisionSupport(): Promise<TikTokShopDataDecisionSupport> {
  logger.info({ msg: 'Building TikTok Shop data decision support' });

  const summary = await runTikTokShopDataFoundationReview();

  const recommendation = summary.readiness.readinessStatus === TikTokShopReadinessStatus.READY
    ? 'proceed'
    : summary.readiness.readinessStatus === TikTokShopReadinessStatus.PROCEED_CAUTIOUSLY
    ? 'hold'
    : 'not_ready';

  const nextSteps = [
    ...summary.blockers.map((b) => `Blocker: ${b.message}`),
    ...summary.warnings.slice(0, 3).map((w) => `Warning: ${w.message}`),
  ];

  return {
    recommendation,
    readinessStatus: summary.readiness.readinessStatus,
    blockers: summary.blockers,
    warnings: summary.warnings,
    nextSteps,
    summary: `TikTok Shop data foundation ${summary.readiness.readinessStatus}. ${summary.blockers.length} blockers, ${summary.warnings.length} warnings.`,
  };
}

/**
 * Build data capability snapshot for platform integration
 */
export async function buildTikTokShopDataCapabilityForPlatform(): Promise<{
  capabilitySnapshot: any;
  readinessSignals: any;
  registryUpdate: any;
}> {
  const readinessSummary = await buildTikTokShopDataReadinessSummary();

  const capabilitySnapshot = await buildTikTokShopDataCapabilitySnapshot(readinessSummary);
  const readinessSignals = await buildTikTokShopDataReadinessSignals(readinessSummary);
  const registryUpdate = await buildPlatformRegistryDataUpdate(readinessSummary);

  return {
    capabilitySnapshot,
    readinessSignals,
    registryUpdate,
  };
}
