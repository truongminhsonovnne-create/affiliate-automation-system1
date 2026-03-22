/**
 * TikTok Shop Acquisition Orchestrator
 * Main orchestrator for data acquisition runs
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  TikTokShopAcquisitionResult,
  TikTokShopAcquisitionRun,
  TikTokShopDataBlocker,
  TikTokShopDataWarning,
  TikTokShopNormalizationResult,
  TikTokShopEnrichmentResult,
} from '../types.js';
import { TikTokShopAcquisitionRunStatus, TikTokShopNormalizationStatus, TikTokShopEnrichmentStatus } from '../types.js';
import { TIKTOK_SHOP_ACQUISITION_CONFIG } from '../constants.js';
import { logger } from '../../../../utils/logger.js';
import { getActiveTikTokShopSources } from '../sourceRegistry/tiktokShopSourceRegistry.js';
import { saveTikTokShopAcquisitionRun, updateAcquisitionRun } from '../repositories/tiktokAcquisitionRunRepository.js';
import { normalizeTikTokShopProductRecords } from '../normalization/tiktokShopProductNormalizer.js';
import { enrichTikTokShopProductContext } from '../enrichment/tiktokShopContextEnrichmentService.js';
import {
  createTikTokShopManualSampleSource,
  createTikTokShopImportFileSource,
  createTikTokShopApiProductSource,
  createTikTokShopApiPromotionSource,
  createTikTokShopWebScraperSource,
  createTikTokShopAffiliateApiSource,
} from '../sources/tiktokShopPlaceholderApiSource.js';
import { saveProductSnapshot } from '../repositories/tiktokProductSnapshotRepository.js';

/**
 * Get source adapter by source key
 */
function getSourceAdapter(sourceKey: string) {
  const adapters = {
    manual_sample: createTikTokShopManualSampleSource(),
    import_file: createTikTokShopImportFileSource(),
    tiktok_api_product: createTikTokShopApiProductSource(),
    tiktok_api_promotion: createTikTokShopApiPromotionSource(),
    tiktok_web_scraper: createTikTokShopWebScraperSource(),
    tiktok_affiliate_api: createTikTokShopAffiliateApiSource(),
  };

  return adapters[sourceKey as keyof typeof adapters] || null;
}

/**
 * Run acquisition for a specific TikTok Shop source
 */
export async function runTikTokShopSourceAcquisition(
  sourceKey: string,
  options?: {
    runType?: 'full' | 'incremental' | 'dry_run' | 'validation';
    batchSize?: number;
    timeout?: number;
    validateOnly?: boolean;
  }
): Promise<TikTokShopAcquisitionResult> {
  logger.info({ msg: 'Starting TikTok Shop source acquisition', sourceKey, options });

  const runId = uuidv4();
  const startTime = Date.now();
  const errors: TikTokShopDataError[] = [];
  const warnings: TikTokShopDataWarning[] = [];
  const blockers: TikTokShopDataBlocker[] = [];

  // Get adapter
  const adapter = getSourceAdapter(sourceKey);
  if (!adapter) {
    return {
      success: false,
      sourceKey,
      runId,
      itemsSeen: 0,
      itemsNormalized: 0,
      itemsEnriched: 0,
      itemsFailed: 0,
      errors: [{ errorId: uuidv4(), errorType: 'source_unavailable', message: `Unknown source key: ${sourceKey}`, timestamp: new Date() }],
      warnings: [],
    };
  }

  // Check if source is available
  const isAvailable = await adapter.isAvailable();
  if (!isAvailable) {
    blockers.push({
      blockerId: 'source-unavailable',
      blockerType: 'source_unavailable',
      severity: 'critical',
      message: `Source ${sourceKey} is not available`,
      sourceKey,
    });

    return {
      success: false,
      sourceKey,
      runId,
      itemsSeen: 0,
      itemsNormalized: 0,
      itemsEnriched: 0,
      itemsFailed: 0,
      errors: [],
      warnings: [],
      blockers,
    };
  }

  // Create run record
  let run: TikTokShopAcquisitionRun;
  try {
    run = await saveTikTokShopAcquisitionRun({
      id: runId,
      sourceId: '', // Will be updated later
      runType: options?.runType || 'full',
      runStatus: TikTokShopAcquisitionRunStatus.RUNNING,
      itemsSeen: 0,
      itemsNormalized: 0,
      itemsEnriched: 0,
      itemsFailed: 0,
      startedAt: new Date(),
    });
  } catch (error) {
    logger.error({ msg: 'Failed to create acquisition run record', sourceKey, error });
    return {
      success: false,
      sourceKey,
      runId,
      itemsSeen: 0,
      itemsNormalized: 0,
      itemsEnriched: 0,
      itemsFailed: 0,
      errors: [{ errorId: uuidv4(), errorType: 'persistence_failed', message: 'Failed to create run record', timestamp: new Date() }],
      warnings: [],
    };
  }

  try {
    // Step 1: Load raw data
    logger.info({ msg: 'Loading raw data from source', sourceKey });
    const rawDataResult = await adapter.loadRawData({ limit: options?.batchSize });

    if (!rawDataResult.success) {
      blockers.push({
        blockerId: 'load-failed',
        blockerType: 'source_unavailable',
        severity: 'critical',
        message: `Failed to load raw data: ${rawDataResult.errors.join(', ')}`,
        sourceKey,
      });

      await updateAcquisitionRun(runId, {
        runStatus: TikTokShopAcquisitionRunStatus.FAILED,
        finishedAt: new Date(),
        errorSummary: rawDataResult.errors.join('; '),
      });

      return {
        success: false,
        sourceKey,
        runId,
        itemsSeen: rawDataResult.totalCount,
        itemsNormalized: 0,
        itemsEnriched: 0,
        itemsFailed: rawDataResult.totalCount,
        errors: rawDataResult.errors.map((e) => ({
          errorId: uuidv4(),
          errorType: 'validation_failed',
          message: e,
          timestamp: new Date(),
          sourceKey,
        })),
        warnings: [],
        blockers,
      };
    }

    const itemsSeen = rawDataResult.records.length;

    // Step 2: Validate raw payload
    logger.info({ msg: 'Validating raw payload', sourceKey, itemsSeen });
    const validationResult = adapter.validateSourcePayload(rawDataResult.records);

    if (!validationResult.isValid) {
      warnings.push(...validationResult.errors.map((e) => ({
        warningId: uuidv4(),
        warningType: 'field_incomplete' as const,
        severity: 'medium' as const,
        message: e,
        sourceKey,
      })));
    }

    // If validate only, return here
    if (options?.validateOnly) {
      await updateAcquisitionRun(runId, {
        runStatus: TikTokShopAcquisitionRunStatus.COMPLETED,
        finishedAt: new Date(),
        itemsSeen,
        itemsNormalized: 0,
        itemsEnriched: 0,
      });

      return {
        success: true,
        sourceKey,
        runId,
        itemsSeen,
        itemsNormalized: 0,
        itemsEnriched: 0,
        itemsFailed: 0,
        errors: [],
        warnings,
      };
    }

    // Step 3: Normalize records
    logger.info({ msg: 'Normalizing records', sourceKey, itemsSeen });
    const normalizedRecords = adapter.normalizeSourcePayload(rawDataResult.records);

    const successfulNormalization = normalizedRecords.filter(
      (r) => r.normalizationStatus === TikTokShopNormalizationStatus.NORMALIZED
    );
    const failedNormalization = normalizedRecords.filter(
      (r) => r.normalizationStatus === TikTokShopNormalizationStatus.FAILED
    );

    // Save product snapshots
    logger.info({ msg: 'Saving product snapshots', sourceKey, count: normalizedRecords.length });
    for (const record of normalizedRecords) {
      try {
        await saveProductSnapshot({
          canonicalReferenceKey: record.canonicalReferenceKey,
          sourceId: undefined, // Will be set from source
          productPayload: record.normalizedData as unknown as Record<string, unknown>,
          normalizationStatus: record.normalizationStatus,
          enrichmentStatus: TikTokShopEnrichmentStatus.PENDING,
          freshnessStatus: 'fresh',
          snapshotTime: new Date(),
        });
      } catch (error) {
        logger.error({
          msg: 'Failed to save product snapshot',
          referenceKey: record.canonicalReferenceKey,
          error,
        });
      }
    }

    // Step 4: Enrich context
    logger.info({ msg: 'Enriching product context', sourceKey, count: successfulNormalization.length });
    let itemsEnriched = 0;
    let enrichmentQualityScore = 0;

    if (successfulNormalization.length > 0) {
      const enrichmentResult = await enrichTikTokShopProductContext(successfulNormalization);
      itemsEnriched = enrichmentResult.enrichedCount;
      enrichmentQualityScore = enrichmentResult.qualityScore;
      warnings.push(...enrichmentResult.gaps.map((g) => ({
        warningId: uuidv4(),
        warningType: 'field_missing' as const,
        severity: g.severity === 'critical' || g.severity === 'high' ? 'medium' as const : 'low' as const,
        message: g.message,
        field: g.field,
        sourceKey,
      })));
    }

    // Update run record
    await updateAcquisitionRun(runId, {
      runStatus: TikTokShopAcquisitionRunStatus.COMPLETED,
      finishedAt: new Date(),
      itemsSeen,
      itemsNormalized: successfulNormalization.length,
      itemsEnriched,
      itemsFailed: failedNormalization.length,
    });

    const duration = Date.now() - startTime;
    logger.info({
      msg: 'Acquisition completed',
      sourceKey,
      duration,
      itemsSeen,
      itemsNormalized: successfulNormalization.length,
      itemsEnriched,
      itemsFailed: failedNormalization.length,
    });

    return {
      success: true,
      sourceKey,
      runId,
      itemsSeen,
      itemsNormalized: successfulNormalization.length,
      itemsEnriched,
      itemsFailed: failedNormalization.length,
      errors: [],
      warnings,
      metadata: {
        duration,
        enrichmentQualityScore,
      },
    };
  } catch (error) {
    logger.error({ msg: 'Acquisition failed', sourceKey, error });

    await updateAcquisitionRun(runId, {
      runStatus: TikTokShopAcquisitionRunStatus.FAILED,
      finishedAt: new Date(),
      errorSummary: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      sourceKey,
      runId,
      itemsSeen: 0,
      itemsNormalized: 0,
      itemsEnriched: 0,
      itemsFailed: 0,
      errors: [{
        errorId: uuidv4(),
        errorType: 'acquisition_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        sourceKey,
      }],
      warnings,
      blockers,
    };
  }
}

/**
 * Run acquisition for all active sources
 */
export async function runAllActiveTikTokShopSourceAcquisitions(
  options?: {
    runType?: 'full' | 'incremental' | 'dry_run' | 'validation';
    batchSize?: number;
    timeout?: number;
    validateOnly?: boolean;
  }
): Promise<TikTokShopAcquisitionResult[]> {
  logger.info({ msg: 'Running acquisition for all active sources', options });

  const activeSources = await getActiveTikTokShopSources();
  const results: TikTokShopAcquisitionResult[] = [];

  for (const source of activeSources) {
    try {
      const result = await runTikTokShopSourceAcquisition(source.sourceKey, options);
      results.push(result);
    } catch (error) {
      logger.error({
        msg: 'Failed to run acquisition for source',
        sourceKey: source.sourceKey,
        error,
      });
      results.push({
        success: false,
        sourceKey: source.sourceKey,
        itemsSeen: 0,
        itemsNormalized: 0,
        itemsEnriched: 0,
        itemsFailed: 0,
        errors: [{
          errorId: uuidv4(),
          errorType: 'acquisition_failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          sourceKey: source.sourceKey,
        }],
        warnings: [],
      });
    }
  }

  return results;
}

/**
 * Run TikTok Shop acquisition (main entry point)
 */
export async function runTikTokShopAcquisition(
  sourceKey?: string,
  options?: {
    runType?: 'full' | 'incremental' | 'dry_run' | 'validation';
    batchSize?: number;
    timeout?: number;
    validateOnly?: boolean;
  }
): Promise<TikTokShopAcquisitionResult | TikTokShopAcquisitionResult[]> {
  if (sourceKey) {
    return runTikTokShopSourceAcquisition(sourceKey, options);
  }
  return runAllActiveTikTokShopSourceAcquisitions(options);
}

/**
 * Build acquisition summary from results
 */
export async function buildTikTokShopAcquisitionSummary(): Promise<{
  totalSources: number;
  successfulRuns: number;
  failedRuns: number;
  totalItemsSeen: number;
  totalItemsNormalized: number;
  totalItemsEnriched: number;
  averageQualityScore: number;
  blockers: TikTokShopDataBlocker[];
  warnings: TikTokShopDataWarning[];
}> {
  const results = await runAllActiveTikTokShopSourceAcquisitions();

  const summary = {
    totalSources: results.length,
    successfulRuns: 0,
    failedRuns: 0,
    totalItemsSeen: 0,
    totalItemsNormalized: 0,
    totalItemsEnriched: 0,
    averageQualityScore: 0,
    blockers: [] as TikTokShopDataBlocker[],
    warnings: [] as TikTokShopDataWarning[],
  };

  let totalQualityScore = 0;

  for (const result of results) {
    if (result.success) {
      summary.successfulRuns++;
    } else {
      summary.failedRuns++;
    }

    summary.totalItemsSeen += result.itemsSeen;
    summary.totalItemsNormalized += result.itemsNormalized;
    summary.totalItemsEnriched += result.itemsEnriched;

    if (result.metadata?.enrichmentQualityScore) {
      totalQualityScore += result.metadata.enrichmentQualityScore as number;
    }

    summary.blockers.push(...result.blockers);
    summary.warnings.push(...result.warnings);
  }

  if (results.length > 0) {
    summary.averageQualityScore = totalQualityScore / results.length;
  }

  return summary;
}
