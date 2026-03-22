/**
 * TikTok Shop Detail Extraction Orchestrator
 * Orchestrates the detail extraction pipeline
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  TikTokShopDetailJob,
  TikTokShopDetailExtractionResult,
  TikTokShopDetailExtractionSummary,
  TikTokShopExtractedDetailFields,
  TikTokShopAcquisitionError,
  TikTokShopAcquisitionWarning,
} from '../types.js';
import {
  TikTokShopDetailJobStatus,
  TikTokShopDetailExtractionStatus,
  TikTokShopAcquisitionMode,
} from '../types.js';
import { TIKTOK_SHOP_DETAIL_CONFIG } from '../constants.js';
import { logger } from '../../../../utils/logger.js';
import { saveDetailJob, updateDetailJob } from '../repositories/tiktokDetailJobRepository.js';
import { saveRawDetailRecord } from '../repositories/tiktokRawDetailRepository.js';
import { extractTikTokShopRawDetailRecord } from './tiktokShopDetailExtractor.js';
import { buildTikTokShopDetailEvidence } from './tiktokShopDetailEvidenceBuilder.js';
import { normalizeTikTokShopRawDetailRecord } from './tiktokShopDetailNormalizer.js';
import { evaluateTikTokShopExtractionQuality } from '../quality/tiktokShopExtractionQualityEvaluator.js';

/**
 * Run detail extraction cycle
 */
export async function runTikTokShopDetailExtraction(
  referenceKeys: string[],
  options?: {
    mode?: TikTokShopAcquisitionMode;
    maxConcurrent?: number;
  }
): Promise<TikTokShopDetailExtractionResult[]> {
  logger.info({ msg: 'Starting TikTok Shop detail extraction', count: referenceKeys.length, options });

  const results: TikTokShopDetailExtractionResult[] = [];

  // Process in batches
  const batchSize = options?.maxConcurrent || TIKTOK_SHOP_DETAIL_CONFIG.MAX_CONCURRENT_DETAIL;

  for (let i = 0; i < referenceKeys.length; i += batchSize) {
    const batch = referenceKeys.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map((ref) => runTikTokShopDetailJob(ref, options?.mode || TikTokShopAcquisitionMode.BROWSER))
    );

    results.push(...batchResults);
  }

  return results;
}

/**
 * Run detail extraction for a single reference
 */
export async function runTikTokShopDetailJob(
  referenceKey: string,
  mode: TikTokShopAcquisitionMode = TikTokShopAcquisitionMode.BROWSER
): Promise<TikTokShopDetailExtractionResult> {
  logger.info({ msg: 'Running TikTok Shop detail extraction', referenceKey, mode });

  // Create job
  const job = await saveDetailJob({
    id: uuidv4(),
    canonicalReferenceKey: referenceKey,
    jobStatus: TikTokShopDetailJobStatus.RUNNING,
    acquisitionMode: mode,
    extractionStatus: TikTokShopDetailExtractionStatus.EXTRACTING,
    startedAt: new Date(),
  });

  try {
    // Extract raw detail
    const extractedFields = await extractTikTokShopRawDetailRecord(referenceKey);

    // Build evidence
    const evidence = buildTikTokShopDetailEvidence(referenceKey, extractedFields);

    // Determine extraction status
    const extractionStatus = determineExtractionStatus(extractedFields);

    // Save raw record
    await saveRawDetailRecord({
      id: uuidv4(),
      detailJobId: job.id,
      canonicalReferenceKey: referenceKey,
      rawPayload: extractedFields as unknown as Record<string, unknown>,
      extractionStatus,
      extractionVersion: 'v1',
      evidencePayload: evidence as unknown as Record<string, unknown>,
    });

    // Evaluate quality
    const quality = evaluateTikTokShopExtractionQuality(extractedFields);

    // Update job
    await updateDetailJob(job.id, {
      jobStatus: TikTokShopDetailJobStatus.COMPLETED,
      extractionStatus,
      qualityScore: quality.overallScore,
      finishedAt: new Date(),
    });

    logger.info({
      msg: 'Detail extraction completed',
      referenceKey,
      extractionStatus,
      qualityScore: quality.overallScore,
    });

    return {
      jobId: job.id,
      referenceKey,
      extractionStatus,
      extractedFields,
      evidence,
      qualityScore: quality.overallScore,
      errors: [],
      warnings: quality.gaps.map((g) => ({
        warningId: uuidv4(),
        warningType: 'extraction_gap',
        message: g.message,
        severity: g.severity === 'critical' || g.severity === 'high' ? 'medium' as const : 'low' as const,
        field: g.field,
      })),
    };
  } catch (error) {
    logger.error({ msg: 'Detail extraction failed', referenceKey, error });

    await updateDetailJob(job.id, {
      jobStatus: TikTokShopDetailJobStatus.FAILED,
      extractionStatus: TikTokShopDetailExtractionStatus.FAILED,
      errorSummary: error instanceof Error ? error.message : 'Unknown error',
      finishedAt: new Date(),
    });

    return {
      jobId: job.id,
      referenceKey,
      extractionStatus: TikTokShopDetailExtractionStatus.FAILED,
      extractedFields: {},
      evidence: {
        url: referenceKey,
        timestamp: new Date(),
        selectors: {},
        fallbackSelectors: {},
        extractionMethod: 'failed',
        confidenceScores: {},
      },
      errors: [{
        errorId: uuidv4(),
        errorType: 'extraction_failed' as any,
        message: error instanceof Error ? error.message : 'Unknown error',
        referenceKey,
        timestamp: new Date(),
        retryable: false,
      }],
      warnings: [],
    };
  }
}

/**
 * Extract detail for a specific reference
 */
export async function extractTikTokShopDetailForReference(
  referenceKey: string
): Promise<TikTokShopDetailExtractionResult> {
  return runTikTokShopDetailJob(referenceKey);
}

/**
 * Build detail extraction summary
 */
export function buildTikTokShopDetailExtractionSummary(
  results: TikTokShopDetailExtractionResult[]
): {
  total: number;
  successful: number;
  failed: number;
  partial: number;
  averageQualityScore: number;
  errors: TikTokShopAcquisitionError[];
  warnings: TikTokShopAcquisitionWarning[];
} {
  const successful = results.filter((r) => r.extractionStatus === TikTokShopDetailExtractionStatus.EXTRACTED).length;
  const failed = results.filter((r) => r.extractionStatus === TikTokShopDetailExtractionStatus.FAILED).length;
  const partial = results.filter((r) => r.extractionStatus === TikTokShopDetailExtractionStatus.PARTIAL).length;

  const qualityScores = results.filter((r) => r.qualityScore !== undefined).map((r) => r.qualityScore!);
  const averageQualityScore = qualityScores.length > 0
    ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
    : 0;

  const errors = results.flatMap((r) => r.errors);
  const warnings = results.flatMap((r) => r.warnings);

  return {
    total: results.length,
    successful,
    failed,
    partial,
    averageQualityScore,
    errors,
    warnings,
  };
}

function determineExtractionStatus(fields: TikTokShopExtractedDetailFields): TikTokShopDetailExtractionStatus {
  const hasProductId = !!fields.productId;
  const hasTitle = !!fields.productTitle;
  const hasPrice = !!fields.price;

  // Count filled fields
  const fieldCount = Object.values(fields).filter((v) => v !== undefined && v !== null && (typeof v !== 'object' || Array.isArray(v) ? true : Object.keys(v).length > 0)).length;

  if (!hasProductId && !hasTitle && !hasPrice) {
    return TikTokShopDetailExtractionStatus.FAILED;
  }

  if (fieldCount < 3) {
    return TikTokShopDetailExtractionStatus.PARTIAL;
  }

  return TikTokShopDetailExtractionStatus.EXTRACTED;
}
