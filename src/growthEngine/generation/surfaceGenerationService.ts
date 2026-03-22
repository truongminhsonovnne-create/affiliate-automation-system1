/**
 * Surface Generation Service
 *
 * Executes surface generation with governance guardrails and idempotency.
 */

import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceGenerationRecord,
  GrowthSurfaceGenerationDecision,
  GrowthGenerationStatus,
  GrowthSurfaceType,
} from '../types';
import {
  GENERATION_BATCH_CONFIG,
  GOVERNANCE_CONFIG,
} from '../constants';
import { evaluateGrowthSurfaceGenerationDecision } from '../eligibility/surfaceEligibilityEvaluator';

export interface GenerationRequest {
  surfaceId: string;
  surface: GrowthSurfaceInventoryRecord;
  payload?: Record<string, unknown>;
}

export interface GenerationResult {
  success: boolean;
  surfaceId: string;
  generationId?: string;
  error?: string;
  duration: number;
}

export interface BatchGenerationResult {
  batchId: string;
  totalRequested: number;
  successfulGenerations: number;
  failedGenerations: number;
  results: GenerationResult[];
  totalDuration: number;
}

/**
 * Execute generation for a single surface
 */
export async function executeSurfaceGeneration(
  request: GenerationRequest
): Promise<GenerationResult> {
  const startTime = Date.now();

  try {
    // Check governance before generation
    const governanceCheck = await validateGenerationGovernance(request.surface);
    if (!governanceCheck.allowed) {
      return {
        success: false,
        surfaceId: request.surfaceId,
        error: governanceCheck.reason,
        duration: Date.now() - startTime,
      };
    }

    // Create generation record
    const generationRecord = await createGenerationRecord(request);

    try {
      // Execute the generation (placeholder - would integrate with actual generation engine)
      const renderResult = await performSurfaceGeneration(request);

      // Update generation record with success
      await completeGenerationRecord(generationRecord.id, {
        status: GrowthGenerationStatus.COMPLETED,
        renderSummary: renderResult,
      });

      return {
        success: true,
        surfaceId: request.surfaceId,
        generationId: generationRecord.id,
        duration: Date.now() - startTime,
      };
    } catch (generationError) {
      // Mark generation as failed
      await completeGenerationRecord(generationRecord.id, {
        status: GrowthGenerationStatus.FAILED,
        error: generationError instanceof Error ? generationError.message : 'Unknown error',
      });

      return {
        success: false,
        surfaceId: request.surfaceId,
        generationId: generationRecord.id,
        error: generationError instanceof Error ? generationError.message : 'Generation failed',
        duration: Date.now() - startTime,
      };
    }
  } catch (error) {
    return {
      success: false,
      surfaceId: request.surfaceId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute batch generation with parallel processing
 */
export async function executeBatchGeneration(
  surfaces: GrowthSurfaceInventoryRecord[],
  options?: {
    maxParallel?: number;
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<BatchGenerationResult> {
  const batchId = crypto.randomUUID();
  const maxParallel = options?.maxParallel ?? GENERATION_BATCH_CONFIG.MAX_PARALLEL_GENERATIONS;
  const onProgress = options?.onProgress;

  const results: GenerationResult[] = [];
  let completed = 0;
  const total = surfaces.length;

  // Process in batches
  for (let i = 0; i < surfaces.length; i += maxParallel) {
    const batch = surfaces.slice(i, i + maxParallel);

    const batchResults = await Promise.all(
      batch.map(surface =>
        executeSurfaceGeneration({
          surfaceId: surface.id,
          surface,
        })
      )
    );

    results.push(...batchResults);
    completed += batch.length;

    if (onProgress) {
      onProgress(completed, total);
    }
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    batchId,
    totalRequested: total,
    successfulGenerations: successful,
    failedGenerations: failed,
    results,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
  };
}

/**
 * Retry failed generations
 */
export async function retryFailedGenerations(
  failedResults: GenerationResult[],
  maxAttempts?: number
): Promise<GenerationResult[]> {
  const attempts = maxAttempts ?? GENERATION_BATCH_CONFIG.MAX_RETRY_ATTEMPTS;
  const results: GenerationResult[] = [];

  for (const failed of failedResults) {
    if (failed.error && failed.surfaceId) {
      // Get surface data (would fetch from DB in real implementation)
      const surface = await getSurfaceById(failed.surfaceId);
      if (!surface) {
        results.push({
          ...failed,
          error: 'Surface not found',
        });
        continue;
      }

      // Retry with exponential backoff
      let lastError: string | undefined;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        if (attempt > 1) {
          // Exponential backoff
          const delay = GENERATION_BATCH_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt - 2);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await executeSurfaceGeneration({
          surfaceId: surface.id,
          surface,
        });

        if (result.success) {
          results.push(result);
          lastError = undefined;
          break;
        }

        lastError = result.error;
      }

      if (lastError) {
        results.push({
          success: false,
          surfaceId: failed.surfaceId,
          error: `Failed after ${attempts} attempts: ${lastError}`,
          duration: 0,
        });
      }
    }
  }

  return results;
}

/**
 * Check if generation is idempotent (recent generation exists)
 */
export async function checkIdempotency(
  surfaceId: string
): Promise<{ isIdempotent: boolean; existingGenerationId?: string }> {
  // Check for recent generation
  const recentGeneration = await findRecentGeneration(surfaceId);

  if (!recentGeneration) {
    return { isIdempotent: false };
  }

  const now = new Date();
  const windowMs = GENERATION_BATCH_CONFIG.IDEMPOTENCY_WINDOW_MS;
  const generationTime = recentGeneration.createdAt.getTime();

  if (now.getTime() - generationTime < windowMs) {
    return {
      isIdempotent: true,
      existingGenerationId: recentGeneration.id,
    };
  }

  return { isIdempotent: false };
}

// ============================================================================
// Governance Validation
// ============================================================================

interface GovernanceCheck {
  allowed: boolean;
  reason?: string;
  warnings?: string[];
}

async function validateGenerationGovernance(
  surface: GrowthSurfaceInventoryRecord
): Promise<GovernanceCheck> {
  const warnings: string[] = [];

  // Check quality threshold
  if (surface.qualityScore !== null && surface.qualityScore < GOVERNANCE_CONFIG.REVIEW_QUALITY_THRESHOLD) {
    const canProceed = GOVERNANCE_CONFIG.CRITICAL_LOW_USE_AUTOBLOCK;
    if (!canProceed) {
      return {
        allowed: false,
        reason: `Surface quality ${surface.qualityScore} below review threshold ${GOVERNANCE_CONFIG.REVIEW_QUALITY_THRESHOLD}`,
      };
    }
    warnings.push(`Surface quality below threshold - requires review`);
  }

  // Check if surface is blocked
  if (surface.pageStatus === 'blocked' || surface.pageStatus === 'deindexed') {
    return {
      allowed: false,
      reason: `Surface is ${surface.pageStatus}`,
    };
  }

  // Check generation decision
  const decision = evaluateGrowthSurfaceGenerationDecision(surface);
  if (!decision.canGenerate) {
    return {
      allowed: false,
      reason: decision.reasons.join('; '),
    };
  }

  return {
    allowed: true,
    warnings,
  };
}

// ============================================================================
// Simulated Database Operations
// ============================================================================

const generationRecords: Map<string, GrowthSurfaceGenerationRecord> = new Map();
const surfaces: Map<string, GrowthSurfaceInventoryRecord> = new Map();

async function createGenerationRecord(
  request: GenerationRequest
): Promise<GrowthSurfaceGenerationRecord> {
  const record: GrowthSurfaceGenerationRecord = {
    id: crypto.randomUUID(),
    surfaceInventoryId: request.surfaceId,
    generationStatus: GrowthGenerationStatus.PENDING,
    generationReason: request.payload?.reason as string | null ?? null,
    generationPayload: request.payload ?? null,
    renderSummary: null,
    createdAt: new Date(),
    completedAt: null,
  };

  generationRecords.set(record.id, record);
  return record;
}

async function completeGenerationRecord(
  generationId: string,
  updates: {
    status: GrowthGenerationStatus;
    renderSummary?: Record<string, unknown>;
    error?: string;
  }
): Promise<void> {
  const record = generationRecords.get(generationId);
  if (!record) return;

  record.generationStatus = updates.status;
  record.completedAt = new Date();

  if (updates.renderSummary) {
    record.renderSummary = updates.renderSummary;
  }

  generationRecords.set(generationId, record);
}

async function findRecentGeneration(
  surfaceId: string
): Promise<GrowthSurfaceGenerationRecord | null> {
  let latest: GrowthSurfaceGenerationRecord | null = null;

  for (const record of generationRecords.values()) {
    if (record.surfaceInventoryId === surfaceId) {
      if (!latest || record.createdAt > latest.createdAt) {
        latest = record;
      }
    }
  }

  return latest;
}

async function getSurfaceById(surfaceId: string): Promise<GrowthSurfaceInventoryRecord | null> {
  return surfaces.get(surfaceId) ?? null;
}

/**
 * Register surface for testing
 */
export function registerTestSurface(surface: GrowthSurfaceInventoryRecord): void {
  surfaces.set(surface.id, surface);
}

async function performSurfaceGeneration(
  request: GenerationRequest
): Promise<Record<string, unknown>> {
  // Placeholder for actual generation logic
  // In production, this would call the content generation engine

  return {
    generated: true,
    surfaceType: request.surface.surfaceType,
    routeKey: request.surface.routeKey,
    timestamp: new Date().toISOString(),
  };
}
