/**
 * TikTok Shop Discovery Orchestrator
 * Orchestrates the discovery pipeline
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  TikTokShopDiscoveryJob,
  TikTokShopDiscoverySeed,
  TikTokShopDiscoveryResult,
  TikTokShopDiscoverySummary,
  TikTokShopAcquisitionError,
  TikTokShopAcquisitionWarning,
} from '../types.js';
import {
  TikTokShopDiscoveryJobType,
  TikTokShopDiscoveryJobStatus,
} from '../types.js';
import { TIKTOK_SHOP_DISCOVERY_CONFIG } from '../constants.js';
import { logger } from '../../../../utils/logger.js';
import { saveDiscoveryJob, updateDiscoveryJob } from '../repositories/tiktokDiscoveryJobRepository.js';
import { saveDiscoveryCandidates } from '../repositories/tiktokDiscoveryCandidateRepository.js';
import { resolveTikTokShopDiscoverySeeds } from './tiktokShopDiscoverySeedResolver.js';
import { extractTikTokShopDiscoveryCandidates } from './tiktokShopCandidateExtractor.js';
import { normalizeTikTokShopDiscoveryCandidates } from './tiktokShopCandidateNormalizer.js';
import { dedupeTikTokShopCandidates } from './tiktokShopCandidateDeduper.js';

/**
 * Run full discovery cycle
 */
export async function runTikTokShopDiscovery(
  input?: {
    seedType?: string;
    seeds?: string[];
    categories?: string[];
    jobType?: TikTokShopDiscoveryJobType;
  }
): Promise<TikTokShopDiscoveryResult> {
  logger.info({ msg: 'Starting TikTok Shop discovery cycle', input });

  // Resolve seeds
  const seeds = await resolveTikTokShopDiscoverySeeds({
    seedType: input?.seedType as any,
    seeds: input?.seeds,
    categories: input?.categories,
  });

  // Create job
  const job = await saveDiscoveryJob({
    id: uuidv4(),
    jobType: input?.jobType || TikTokShopDiscoveryJobType.SEED_BASED,
    seedType: seeds[0]?.seedType || 'manual',
    seedPayload: { seeds: seeds.map((s) => s.seedValue) },
    jobStatus: TikTokShopDiscoveryJobStatus.RUNNING,
    itemsDiscovered: 0,
    itemsDeduped: 0,
    itemsFailed: 0,
    startedAt: new Date(),
  });

  try {
    const result = await runTikTokShopDiscoveryJob(job, seeds);

    // Update job status
    await updateDiscoveryJob(job.id, {
      jobStatus: TikTokShopDiscoveryJobStatus.COMPLETED,
      itemsDiscovered: result.itemsDiscovered,
      itemsDeduped: result.itemsDeduped,
      itemsFailed: result.itemsFailed,
      finishedAt: new Date(),
    });

    return result;
  } catch (error) {
    logger.error({ msg: 'Discovery failed', error });

    await updateDiscoveryJob(job.id, {
      jobStatus: TikTokShopDiscoveryJobStatus.FAILED,
      finishedAt: new Date(),
    });

    return {
      jobId: job.id,
      itemsDiscovered: 0,
      itemsDeduped: 0,
      itemsFailed: 0,
      candidates: [],
      errors: [{
        errorId: uuidv4(),
        errorType: 'discovery_failed' as any,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        retryable: false,
      }],
      warnings: [],
    };
  }
}

/**
 * Run discovery job
 */
export async function runTikTokShopDiscoveryJob(
  job: TikTokShopDiscoveryJob,
  seeds: TikTokShopDiscoverySeed[]
): Promise<TikTokShopDiscoveryResult> {
  logger.info({ msg: 'Running TikTok Shop discovery job', jobId: job.id, seedCount: seeds.length });

  const allCandidates: any[] = [];
  const errors: TikTokShopAcquisitionError[] = [];
  const warnings: TikTokShopAcquisitionWarning[] = [];

  // Process each seed
  for (const seed of seeds.slice(0, TIKTOK_SHOP_DISCOVERY_CONFIG.MAX_CANDIDATES_PER_JOB)) {
    try {
      // Extract candidates from seed
      const candidates = await discoverTikTokShopCandidatesFromSeed(seed);

      allCandidates.push(...candidates);
    } catch (error) {
      errors.push({
        errorId: uuidv4(),
        errorType: 'discovery_failed' as any,
        message: `Failed to discover from seed ${seed.seedValue}: ${error instanceof Error ? error.message : 'Unknown'}`,
        timestamp: new Date(),
        retryable: true,
      });
    }
  }

  // Normalize candidates
  const normalizedCandidates = normalizeTikTokShopDiscoveryCandidates(allCandidates);

  // Dedupe candidates
  const { deduped, duplicates } = dedupeTikTokShopCandidates(normalizedCandidates);

  if (duplicates > 0) {
    warnings.push({
      warningId: uuidv4(),
      warningType: 'deduplication',
      message: `Found ${duplicates} duplicate candidates`,
      severity: 'low',
    });
  }

  // Save candidates
  if (deduped.length > 0) {
    await saveDiscoveryCandidates(deduped.map((c) => ({
      ...c,
      discoveryJobId: job.id,
    })));
  }

  const result: TikTokShopDiscoveryResult = {
    jobId: job.id,
    itemsDiscovered: allCandidates.length,
    itemsDeduped: deduped.length,
    itemsFailed: errors.length,
    candidates: deduped,
    errors,
    warnings,
  };

  logger.info({
    msg: 'Discovery job completed',
    jobId: job.id,
    discovered: result.itemsDiscovered,
    deduped: result.itemsDeduped,
    failed: result.itemsFailed,
  });

  return result;
}

/**
 * Discover candidates from a seed
 */
export async function discoverTikTokShopCandidatesFromSeed(
  seed: TikTokShopDiscoverySeed
): Promise<any[]> {
  logger.info({ msg: 'Discovering candidates from seed', seedType: seed.seedType, seedValue: seed.seedValue });

  // For now, return empty candidates since we don't have actual browser/scraper implementation
  // In production, this would navigate to the seed URL and extract product links

  const candidates: any[] = [];

  // TODO: Implement actual discovery extraction
  // - Navigate to seed URL
  // - Extract product links
  // - Build candidate objects
  // - Return candidates

  logger.warn({
    msg: 'Discovery extraction not implemented - no actual crawling performed',
    seedValue: seed.seedValue,
  });

  return candidates;
}

/**
 * Build discovery summary
 */
export function buildTikTokShopDiscoverySummary(
  job: TikTokShopDiscoveryJob,
  result: TikTokShopDiscoveryResult
): TikTokShopDiscoverySummary {
  const duration = job.finishedAt && job.startedAt
    ? job.finishedAt.getTime() - job.startedAt.getTime()
    : 0;

  return {
    jobId: job.id,
    jobStatus: job.jobStatus,
    itemsDiscovered: result.itemsDiscovered,
    itemsDeduped: result.itemsDeduped,
    itemsFailed: result.itemsFailed,
    duration,
    errors: result.errors,
    warnings: result.warnings,
  };
}
