/**
 * Shopee Pipeline - Batch Execution
 *
 * Handles concurrent batch processing with controlled parallelism.
 */

import type {
  ShopeeBatchExecutionResult,
  PipelineLogger,
} from './types.js';

/**
 * Batch executor configuration
 */
export interface BatchExecutorOptions<TItem, TResult> {
  /** Items to process */
  items: TItem[];

  /** Concurrency level */
  concurrency: number;

  /** Batch size */
  batchSize?: number;

  /** Execute function for each item */
  execute: (item: TItem, index: number) => Promise<{
    ok: boolean;
    result?: TResult;
    error?: string;
  }>;

  /** Custom logger */
  logger?: PipelineLogger;

  /** Abort signal */
  signal?: AbortSignal;
}

/**
 * Execute batch with concurrency control
 */
export async function executeBatch<TItem, TResult>(
  options: BatchExecutorOptions<TItem, TResult>
): Promise<ShopeeBatchExecutionResult<TResult>> {
  const {
    items,
    concurrency,
    batchSize = concurrency,
    execute,
    logger,
    signal,
  } = options;

  const startTime = Date.now();
  const results: Array<{
    item: TItem;
    ok: boolean;
    error?: string;
    durationMs: number;
    result?: TResult;
  }> = [];

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  // Process in chunks based on concurrency
  for (let i = 0; i < items.length; i += batchSize) {
    // Check for abort signal
    if (signal?.aborted) {
      logger?.warn('Batch execution aborted', {
        processed: results.length,
        total: items.length,
      });
      break;
    }

    const chunk = items.slice(i, i + batchSize);

    // Process chunk with controlled concurrency
    const chunkPromises = chunk.map(async (item, chunkIndex) => {
      const globalIndex = i + chunkIndex;
      const itemStartTime = Date.now();

      try {
        const execResult = await execute(item, globalIndex);

        return {
          item,
          ok: execResult.ok,
          result: execResult.result,
          error: execResult.error,
          durationMs: Date.now() - itemStartTime,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger?.debug('Item execution failed', {
          index: globalIndex,
          error: errorMessage,
        });

        return {
          item,
          ok: false,
          error: errorMessage,
          durationMs: Date.now() - itemStartTime,
        };
      }
    });

    // Wait for chunk to complete
    const chunkResults = await Promise.all(chunkPromises);

    // Collect results
    for (const result of chunkResults) {
      results.push(result);

      if (result.ok) {
        succeeded++;
      } else if (result.error === 'skipped') {
        skipped++;
      } else {
        failed++;
      }
    }

    logger?.debug('Batch chunk completed', {
      processed: results.length,
      total: items.length,
      succeeded,
      failed,
      skipped,
    });
  }

  return {
    total: items.length,
    succeeded,
    failed,
    skipped,
    results,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Execute with retry logic
 */
export async function executeWithRetry<TItem, TResult>(
  item: TItem,
  executeFn: (item: TItem) => Promise<{ ok: boolean; result?: TResult; error?: string }>,
  options: {
    maxRetries: number;
    backoffMs: number;
    signal?: AbortSignal;
    logger?: PipelineLogger;
    onRetry?: (attempt: number, error: string) => void;
  }
): Promise<{
  ok: boolean;
  result?: TResult;
  error?: string;
  attempts: number;
}> {
  const { maxRetries, backoffMs, signal, logger, onRetry } = options;

  let lastError = 'Unknown error';
  let attempts = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check for abort
    if (signal?.aborted) {
      return {
        ok: false,
        error: 'Aborted',
        attempts: attempt + 1,
      };
    }

    attempts = attempt + 1;

    try {
      const result = await executeFn(item);

      if (result.ok) {
        return {
          ok: true,
          result: result.result,
          attempts,
        };
      }

      // Non-retryable error
      if (!isRetryableError(result.error)) {
        return {
          ok: false,
          error: result.error,
          attempts,
        };
      }

      lastError = result.error || 'Unknown error';
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      if (!isRetryableError(lastError)) {
        return {
          ok: false,
          error: lastError,
          attempts,
        };
      }
    }

    // Retry with backoff (except on last attempt)
    if (attempt < maxRetries) {
      const delay = calculateBackoff(attempt, backoffMs);
      logger?.debug('Retrying after backoff', {
        attempt: attempt + 1,
        maxRetries,
        delayMs: delay,
      });

      onRetry?.(attempt + 1, lastError);
      await sleep(delay);
    }
  }

  return {
    ok: false,
    error: `Failed after ${attempts} attempts: ${lastError}`,
    attempts,
  };
}

/**
 * Check if error is retryable
 */
function isRetryableError(error?: string): boolean {
  if (!error) return false;

  const retryablePatterns = [
    'timeout',
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'network',
    'fetch failed',
    'page error',
    'navigation',
    'socket',
  ];

  const lowerError = error.toLowerCase();
  return retryablePatterns.some(pattern => lowerError.includes(pattern.toLowerCase()));
}

/**
 * Calculate exponential backoff
 */
function calculateBackoff(attempt: number, baseDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create bounded executor with semaphore pattern
 */
export function createBoundedExecutor<TItem, TResult>(
  executeFn: (item: TItem) => Promise<TResult>,
  concurrency: number
): (item: TItem) => Promise<TResult> {
  let running = 0;
  const queue: Array<{
    item: TItem;
    resolve: (value: TResult) => void;
    reject: (error: Error) => void;
  }> = [];

  const processQueue = async () => {
    while (queue.length > 0 && running < concurrency) {
      const next = queue.shift();
      if (!next) break;

      running++;
      const promise = executeFn(next.item);

      promise
        .then(next.resolve)
        .catch(next.reject)
        .finally(() => {
          running--;
          processQueue();
        });
    }
  };

  return (item: TItem): Promise<TResult> => {
    return new Promise((resolve, reject) => {
      queue.push({ item, resolve, reject });
      processQueue();
    });
  };
}
