// =============================================================================
// Conversion Analytics Events
// Production-grade analytics for conversion funnel
// =============================================================================

import logger from '../../../utils/logger';

/**
 * Track best voucher viewed event
 */
export function trackBestVoucherViewed(params: {
  sessionId: string;
  voucherId: string;
  discountValue: string;
}): void {
  logger.info('Best voucher viewed', {
    event: 'best_voucher_viewed',
    ...params,
  });
}

/**
 * Track candidate viewed event
 */
export function trackCandidateViewed(params: {
  sessionId: string;
  voucherId: string;
  rank: number;
}): void {
  logger.info('Candidate viewed', {
    event: 'candidate_viewed',
    ...params,
  });
}

/**
 * Track copy intent event
 */
export function trackCopyIntent(params: {
  sessionId: string;
  voucherId: string;
}): void {
  logger.info('Copy intent', {
    event: 'copy_intent',
    ...params,
  });
}

/**
 * Track copy success event
 */
export function trackCopySuccess(params: {
  sessionId: string;
  voucherId: string;
  code: string;
}): void {
  logger.info('Copy success', {
    event: 'copy_success',
    ...params,
  });
}

/**
 * Track copy failure event
 */
export function trackCopyFailure(params: {
  sessionId: string;
  voucherId: string;
  error: string;
}): void {
  logger.warn('Copy failure', {
    event: 'copy_failure',
    ...params,
  });
}

/**
 * Track open Shopee intent event
 */
export function trackOpenShopeeIntent(params: {
  sessionId: string;
  voucherId?: string;
}): void {
  logger.info('Open Shopee intent', {
    event: 'open_shopee_intent',
    ...params,
  });
}

/**
 * Track open Shopee success event
 */
export function trackOpenShopeeSuccess(params: {
  sessionId: string;
  voucherId?: string;
  targetUrl: string;
}): void {
  logger.info('Open Shopee success', {
    event: 'open_shopee_success',
    ...params,
  });
}

/**
 * Track no match viewed event
 */
export function trackNoMatchViewed(params: {
  sessionId: string;
  requestId: string;
}): void {
  logger.info('No match viewed', {
    event: 'no_match_viewed',
    ...params,
  });
}

/**
 * Track fallback interacted event
 */
export function trackFallbackInteracted(params: {
  sessionId: string;
  voucherId?: string;
}): void {
  logger.info('Fallback interacted', {
    event: 'fallback_interacted',
    ...params,
  });
}
