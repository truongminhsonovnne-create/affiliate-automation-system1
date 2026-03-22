// =============================================================================
// Voucher Ingestion Service
// Production-grade orchestration for voucher data ingestion
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  VoucherIngestionResult,
  VoucherIngestionRun,
  VoucherIngestionRunStatus,
  VoucherRawInput,
  VoucherNormalizedRecord,
} from '../types.js';
import { VOUCHER_INGESTION } from '../constants.js';
import { normalizeVoucherRecords } from './voucherCatalogNormalizer.js';
import { getVoucherSourceAdapter } from './sourceAdapters/voucherSourceAdapters.js';
import { voucherIngestionRunRepository } from '../repositories/voucherIngestionRunRepository.js';
import { voucherCatalogSourceRepository } from '../repositories/voucherCatalogSourceRepository.js';
import { voucherCatalogRepository } from '../repositories/voucherCatalogRepository.js';
import { voucherCatalogVersionRepository } from '../repositories/voucherCatalogVersionRepository.js';
import { recordVoucherIngestionStarted, recordVoucherIngestionCompleted, recordVoucherIngestionFailed } from '../observability/voucherDataEvents.js';
import { logger } from '../../utils/logger.js';

export interface RunVoucherIngestionOptions {
  since?: Date;
  limit?: number;
  batchSize?: number;
  skipValidation?: boolean;
  skipNormalization?: boolean;
  triggeredBy?: string;
  importMode?: 'full' | 'incremental';
}

export interface IngestVoucherRecordsOptions {
  sourceId: string;
  rawItems: VoucherRawInput[];
  context?: {
    triggeredBy?: string;
    skipValidation?: boolean;
    skipNormalization?: boolean;
  };
}

/**
 * Run voucher catalog ingestion for a specific source
 */
export async function runVoucherCatalogIngestion(
  sourceId: string,
  options?: RunVoucherIngestionOptions
): Promise<VoucherIngestionResult> {
  const startTime = Date.now();
  const runId = uuidv4();

  logger.info({ sourceId, runId, options }, 'Starting voucher catalog ingestion');

  // Load source configuration
  const source = await voucherCatalogSourceRepository.findById(sourceId);
  if (!source) {
    throw new Error(`Source not found: ${sourceId}`);
  }

  if (!source.isActive) {
    throw new Error(`Source is inactive: ${sourceId}`);
  }

  // Create ingestion run record
  const run: VoucherIngestionRun = {
    id: runId,
    sourceId,
    runStatus: 'running' as VoucherIngestionRunStatus,
    itemsSeen: 0,
    itemsInserted: 0,
    itemsUpdated: 0,
    itemsSkipped: 0,
    itemsFailed: 0,
    errorSummary: null,
    startedAt: new Date(),
    finishedAt: null,
    createdAt: new Date(),
  };

  await voucherIngestionRunRepository.create(run);
  recordVoucherIngestionStarted(sourceId, runId);

  let rawItems: VoucherRawInput[] = [];
  let normalizedRecords: VoucherNormalizedRecord[] = [];

  try {
    // Load raw data from source
    const adapter = getVoucherSourceAdapter(source.sourceType, {
      sourceConfig: source.sourceConfig,
      platform: source.platform,
    });

    rawItems = await adapter.loadRawVoucherData({
      since: options?.since,
      limit: options?.limit,
    });

    run.itemsSeen = rawItems.length;

    // Validate raw payload if not skipped
    if (!options?.skipValidation) {
      const validationResult = await adapter.validateRawSourcePayload(rawItems);
      if (!validationResult.valid) {
        const errorSummary = validationResult.errors
          .map((e) => `[${e.index}] ${e.code}: ${e.message}`)
          .join('; ');

        await finishRun(run, 'failed', { errorSummary });
        recordVoucherIngestionFailed(sourceId, runId, errorSummary);

        throw new Error(`Validation failed: ${errorSummary}`);
      }
    }

    // Normalize records
    if (!options?.skipNormalization) {
      const normalizeOptions = {
        sourceId,
        platform: source.platform,
        defaultValidityDays: 30,
        preserveRawData: true,
      };

      const normalizationResult = normalizeVoucherRecords(rawItems, normalizeOptions);
      normalizedRecords = normalizationResult.records;

      if (normalizationResult.errors.length > 0) {
        logger.warn({ errors: normalizationResult.errors }, 'Some records failed normalization');
      }
    } else {
      // Use raw items as-is (not recommended for production)
      normalizedRecords = rawItems.map((raw, index) => ({
        externalId: String(raw.id || index),
        sourceId,
        code: String(raw.code || ''),
        title: String(raw.title || ''),
        description: null,
        platform: source.platform,
        discountType: 'percentage' as const,
        discountValue: 0,
        minSpend: null,
        maxDiscount: null,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
        scope: 'global' as const,
        applicableShopIds: [],
        applicableCategoryIds: [],
        applicableProductIds: [],
        constraints: [],
        campaignName: null,
        campaignMetadata: null,
        sourceRawData: raw,
        freshnessStatus: 'unknown' as const,
        lastValidatedAt: null,
        qualityScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    }

    // Upsert normalized records
    const upsertResult = await upsertVoucherRecords(normalizedRecords, options?.batchSize);

    run.itemsInserted = upsertResult.inserted;
    run.itemsUpdated = upsertResult.updated;
    run.itemsSkipped = upsertResult.skipped;
    run.itemsFailed = upsertResult.failed;

    // Finish run successfully
    const status: VoucherIngestionRunStatus =
      upsertResult.failed > 0 ? 'completed_with_errors' : 'completed';

    await finishRun(run, status, {
      errorSummary: upsertResult.errors.length > 0 ? upsertResult.errors.join('; ') : null,
    });

    // Update source last synced timestamp
    await voucherCatalogSourceRepository.updateLastSynced(sourceId, new Date());

    const duration = Date.now() - startTime;
    recordVoucherIngestionCompleted(sourceId, runId, run.itemsSeen, run.itemsInserted, run.itemsUpdated, run.itemsFailed);

    logger.info(
      {
        sourceId,
        runId,
        duration,
        itemsSeen: run.itemsSeen,
        itemsInserted: run.itemsInserted,
        itemsUpdated: run.itemsUpdated,
        itemsFailed: run.itemsFailed,
      },
      'Voucher catalog ingestion completed'
    );

    return {
      success: status === 'completed',
      runId,
      itemsSeen: run.itemsSeen,
      itemsInserted: run.itemsInserted,
      itemsUpdated: run.itemsUpdated,
      itemsSkipped: run.itemsSkipped,
      itemsFailed: run.itemsFailed,
      errors: upsertResult.errors.map((e) => ({
        itemIndex: e.index,
        itemExternalId: e.externalId,
        errorCode: e.code,
        errorMessage: e.message,
        recoverable: e.recoverable,
      })),
      warnings: [],
      duration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await finishRun(run, 'failed', { errorSummary: errorMessage });
    recordVoucherIngestionFailed(sourceId, runId, errorMessage);

    logger.error({ sourceId, runId, error: errorMessage }, 'Voucher catalog ingestion failed');

    return {
      success: false,
      runId,
      itemsSeen: run.itemsSeen,
      itemsInserted: 0,
      itemsUpdated: 0,
      itemsSkipped: run.itemsSkipped,
      itemsFailed: run.itemsSeen,
      errors: [
        {
          itemIndex: 0,
          errorCode: 'INGESTION_FAILED',
          errorMessage,
          recoverable: false,
        },
      ],
      warnings: [],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Run ingestion for all active sources
 */
export async function runAllActiveVoucherSourceIngestions(
  options?: RunVoucherIngestionOptions
): Promise<{
  results: VoucherIngestionResult[];
  summary: {
    totalSources: number;
    successfulSources: number;
    failedSources: number;
    totalItemsProcessed: number;
  };
}> {
  const sources = await voucherCatalogSourceRepository.findActive();

  const results: VoucherIngestionResult[] = [];
  let successfulSources = 0;
  let failedSources = 0;
  let totalItemsProcessed = 0;

  for (const source of sources) {
    try {
      const result = await runVoucherCatalogIngestion(source.id, options);
      results.push(result);

      if (result.success) {
        successfulSources++;
      } else {
        failedSources++;
      }

      totalItemsProcessed += result.itemsSeen;
    } catch (error) {
      logger.error({ sourceId: source.id, error }, 'Failed to run ingestion for source');
      failedSources++;
    }
  }

  return {
    results,
    summary: {
      totalSources: sources.length,
      successfulSources,
      failedSources,
      totalItemsProcessed,
    },
  };
}

/**
 * Ingest voucher records directly (for API calls)
 */
export async function ingestVoucherRecords(
  rawItems: VoucherRawInput[],
  context: {
    sourceId: string;
    triggeredBy?: string;
    skipValidation?: boolean;
    skipNormalization?: boolean;
  }
): Promise<VoucherIngestionResult> {
  const startTime = Date.now();
  const runId = uuidv4();

  // Load source
  const source = await voucherCatalogSourceRepository.findById(context.sourceId);
  if (!source) {
    throw new Error(`Source not found: ${context.sourceId}`);
  }

  // Normalize records
  const normalizedRecords = context.skipNormalization
    ? rawItems.map((raw, index) => ({
        externalId: String(raw.id || index),
        sourceId: context.sourceId,
        code: String(raw.code || ''),
        title: String(raw.title || ''),
        description: null,
        platform: source.platform,
        discountType: 'percentage' as const,
        discountValue: 0,
        minSpend: null,
        maxDiscount: null,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
        scope: 'global' as const,
        applicableShopIds: [],
        applicableCategoryIds: [],
        applicableProductIds: [],
        constraints: [],
        campaignName: null,
        campaignMetadata: null,
        sourceRawData: raw,
        freshnessStatus: 'unknown' as const,
        lastValidatedAt: null,
        qualityScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    : normalizeVoucherRecords(rawItems, {
        sourceId: context.sourceId,
        platform: source.platform,
        defaultValidityDays: 30,
        preserveRawData: true,
      }).records;

  // Upsert records
  const upsertResult = await upsertVoucherRecords(normalizedRecords, VOUCHER_INGESTION.DEFAULT_BATCH_SIZE);

  return {
    success: upsertResult.failed === 0,
    runId,
    itemsSeen: rawItems.length,
    itemsInserted: upsertResult.inserted,
    itemsUpdated: upsertResult.updated,
    itemsSkipped: upsertResult.skipped,
    itemsFailed: upsertResult.failed,
    errors: upsertResult.errors.map((e) => ({
      itemIndex: e.index,
      itemExternalId: e.externalId,
      errorCode: e.code,
      errorMessage: e.message,
      recoverable: e.recoverable,
    })),
    warnings: [],
    duration: Date.now() - startTime,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

async function finishRun(
  run: VoucherIngestionRun,
  status: VoucherIngestionRunStatus,
  options: {
    errorSummary?: string | null;
  }
): Promise<void> {
  run.runStatus = status;
  run.finishedAt = new Date();
  run.errorSummary = options.errorSummary || null;

  await voucherIngestionRunRepository.update(run);
}

async function upsertVoucherRecords(
  records: VoucherNormalizedRecord[],
  batchSize: number = VOUCHER_INGESTION.DEFAULT_BATCH_SIZE
): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: { index: number; externalId: string; code: string; message: string; recoverable: boolean }[];
}> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: { index: number; externalId: string; code: string; message: string; recoverable: boolean }[] = [];

  // Process in batches
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      for (let j = 0; j < batch.length; j++) {
        const record = batch[j];
        const recordIndex = i + j;

        try {
          // Check if record exists
          const existing = await voucherCatalogRepository.findByExternalId(record.externalId, record.sourceId);

          if (existing) {
            // Create version snapshot before update
            if (shouldCreateVersion(existing, record)) {
              await voucherCatalogVersionRepository.create({
                voucherId: existing.id!,
                versionNumber: (existing.versionNumber || 1) + 1,
                snapshotPayload: existing as unknown as Record<string, unknown>,
                changeReason: 'Ingestion update',
                changedBy: 'system',
              });
            }

            // Update existing record
            await voucherCatalogRepository.update(existing.id!, record);
            updated++;
          } else {
            // Insert new record
            await voucherCatalogRepository.create(record);
            inserted++;
          }
        } catch (error) {
          failed++;
          errors.push({
            index: recordIndex,
            externalId: record.externalId,
            code: 'PERSISTENCE_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            recoverable: true,
          });
        }
      }
    } catch (error) {
      logger.error({ batchStart: i, error }, 'Batch processing failed');
      failed += batch.length;
    }
  }

  return { inserted, updated, skipped, failed, errors };
}

function shouldCreateVersion(existing: VoucherNormalizedRecord, updated: VoucherNormalizedRecord): boolean {
  // Create version if key fields changed
  const keyFields = ['code', 'discountValue', 'minSpend', 'endDate', 'isActive'];

  for (const field of keyFields) {
    if (existing[field as keyof VoucherNormalizedRecord] !== updated[field as keyof VoucherNormalizedRecord]) {
      return true;
    }
  }

  return false;
}
