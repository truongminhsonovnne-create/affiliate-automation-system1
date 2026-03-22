/**
 * TikTok Shop Retry Policy
 * Handles retry and backoff decisions
 */

import type { TikTokShopRetryDecision, TikTokShopAcquisitionError } from '../types.js';
import { TIKTOK_SHOP_RETRY_CONFIG } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Decide retry action
 */
export function decideTikTokShopRetry(
  error: TikTokShopAcquisitionError,
  retryCount: number
): TikTokShopRetryDecision {
  const maxRetries = TIKTOK_SHOP_RETRY_CONFIG.MAX_RETRIES;

  // Check if we should retry
  const shouldRetry = retryCount < maxRetries && error.retryable;

  if (!shouldRetry) {
    return {
      shouldRetry: false,
      retryCount,
      backoffMs: 0,
      maxRetries,
      reason: error.retryable
        ? 'Max retries exceeded'
        : 'Error is not retryable',
    };
  }

  // Calculate backoff
  const backoffMs = computeTikTokShopRetryBackoff(retryCount);

  return {
    shouldRetry: true,
    retryCount: retryCount + 1,
    backoffMs,
    maxRetries,
    reason: 'Retry allowed',
  };
}

/**
 * Compute retry backoff
 */
export function computeTikTokShopRetryBackoff(
  retryCount: number,
  options?: {
    initialBackoff?: number;
    multiplier?: number;
    jitter?: number;
    maxBackoff?: number;
  }
): number {
  const initial = options?.initialBackoff || TIKTOK_SHOP_RETRY_CONFIG.INITIAL_BACKOFF_MS;
  const multiplier = options?.multiplier || TIKTOK_SHOP_RETRY_CONFIG.BACKOFF_MULTIPLIER;
  const jitter = options?.jitter || TIKTOK_SHOP_RETRY_CONFIG.BACKOFF_JITTER;
  const maxBackoff = options?.maxBackoff || TIKTOK_SHOP_RETRY_CONFIG.MAX_BACKOFF_MS;

  // Exponential backoff
  let backoff = initial * Math.pow(multiplier, retryCount);

  // Add jitter
  const jitterAmount = backoff * jitter * (Math.random() * 2 - 1);
  backoff += jitterAmount;

  // Cap at max
  backoff = Math.min(backoff, maxBackoff);

  return Math.floor(backoff);
}

/**
 * Build retry decision
 */
export function buildTikTokShopRetryDecision(
  shouldRetry: boolean,
  retryCount: number,
  backoffMs: number,
  error: TikTokShopAcquisitionError
): TikTokShopRetryDecision {
  return {
    shouldRetry,
    retryCount,
    backoffMs,
    maxRetries: TIKTOK_SHOP_RETRY_CONFIG.MAX_RETRIES,
    reason: shouldRetry
      ? `Retrying (attempt ${retryCount + 1}/${TIKTOK_SHOP_RETRY_CONFIG.MAX_RETRIES})`
      : error.retryable
      ? 'Max retries exceeded'
      : 'Error not retryable',
  };
}
