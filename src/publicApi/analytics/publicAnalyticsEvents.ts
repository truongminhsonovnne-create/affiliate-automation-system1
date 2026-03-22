// =============================================================================
// Public Analytics Events
// Production-grade analytics events for public consumer flow
// =============================================================================

import { PublicAnalyticsEventInput } from '../types.js';
import { ANALYTICS_EVENTS } from '../constants.js';
import { logger } from '../../utils/logger.js';

/**
 * Track paste link submitted event
 */
export function trackPasteLinkSubmitted(params: {
  sessionId: string;
  userId?: string;
  inputLength: number;
  platform: 'web' | 'mobile' | 'api';
}): void {
  const event: PublicAnalyticsEventInput = {
    eventName: ANALYTICS_EVENTS.PASTE_LINK_SUBMITTED,
    sessionId: params.sessionId,
    userId: params.userId,
    properties: {
      inputLength: params.inputLength,
      platform: params.platform,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  logAnalyticsEvent(event);
}

/**
 * Track paste link pasted event
 */
export function trackPasteLinkPasted(params: {
  sessionId: string;
  userId?: string;
  platform: 'web' | 'mobile' | 'api';
}): void {
  const event: PublicAnalyticsEventInput = {
    eventName: ANALYTICS_EVENTS.PASTE_LINK_PASTED,
    sessionId: params.sessionId,
    userId: params.userId,
    properties: {
      platform: params.platform,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  logAnalyticsEvent(event);
}

/**
 * Track paste link submit clicked event
 */
export function trackPasteLinkSubmitClicked(params: {
  sessionId: string;
  userId?: string;
  platform: 'web' | 'mobile' | 'api';
}): void {
  const event: PublicAnalyticsEventInput = {
    eventName: ANALYTICS_EVENTS.PASTE_LINK_SUBMIT_CLICKED,
    sessionId: params.sessionId,
    userId: params.userId,
    properties: {
      platform: params.platform,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  logAnalyticsEvent(event);
}

/**
 * Track voucher resolved event
 */
export function trackVoucherResolved(params: {
  sessionId: string;
  userId?: string;
  requestId: string;
  status: 'success' | 'no_match' | 'error';
  latencyMs: number;
  candidateCount: number;
  platform: 'web' | 'mobile' | 'api';
}): void {
  const event: PublicAnalyticsEventInput = {
    eventName: ANALYTICS_EVENTS.VOUCHER_RESOLVED,
    sessionId: params.sessionId,
    userId: params.userId,
    properties: {
      requestId: params.requestId,
      status: params.status,
      latencyMs: params.latencyMs,
      candidateCount: params.candidateCount,
      platform: params.platform,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  logAnalyticsEvent(event);
}

/**
 * Track voucher copied event
 */
export function trackVoucherCopied(params: {
  sessionId: string;
  userId?: string;
  voucherId: string;
  voucherCode: string;
  platform: 'web' | 'mobile' | 'api';
}): void {
  const event: PublicAnalyticsEventInput = {
    eventName: ANALYTICS_EVENTS.VOUCHER_COPIED,
    sessionId: params.sessionId,
    userId: params.userId,
    properties: {
      voucherId: params.voucherId,
      voucherCode: params.voucherCode,
      platform: params.platform,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  logAnalyticsEvent(event);
}

/**
 * Track open Shopee clicked event
 */
export function trackOpenShopeeClicked(params: {
  sessionId: string;
  userId?: string;
  voucherId?: string;
  productUrl?: string;
  platform: 'web' | 'mobile' | 'api';
}): void {
  const event: PublicAnalyticsEventInput = {
    eventName: ANALYTICS_EVENTS.OPEN_SHOPEE_CLICKED,
    sessionId: params.sessionId,
    userId: params.userId,
    properties: {
      voucherId: params.voucherId,
      productUrl: params.productUrl,
      platform: params.platform,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  logAnalyticsEvent(event);
}

/**
 * Track resolution failed event
 */
export function trackResolutionFailed(params: {
  sessionId: string;
  userId?: string;
  requestId: string;
  errorCode: string;
  errorMessage: string;
  platform: 'web' | 'mobile' | 'api';
}): void {
  const event: PublicAnalyticsEventInput = {
    eventName: ANALYTICS_EVENTS.RESOLUTION_ERROR,
    sessionId: params.sessionId,
    userId: params.userId,
    properties: {
      requestId: params.requestId,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      platform: params.platform,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  logAnalyticsEvent(event);
}

/**
 * Track input validation error
 */
export function trackInputValidationError(params: {
  sessionId: string;
  userId?: string;
  errorCode: string;
  errorMessage: string;
  platform: 'web' | 'mobile' | 'api';
}): void {
  const event: PublicAnalyticsEventInput = {
    eventName: ANALYTICS_EVENTS.INPUT_VALIDATION_ERROR,
    sessionId: params.sessionId,
    userId: params.userId,
    properties: {
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      platform: params.platform,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  logAnalyticsEvent(event);
}

/**
 * Track rate limit exceeded
 */
export function trackRateLimitExceeded(params: {
  sessionId: string;
  ip?: string;
  platform: 'web' | 'mobile' | 'api';
}): void {
  const event: PublicAnalyticsEventInput = {
    eventName: ANALYTICS_EVENTS.RATE_LIMIT_EXCEEDED,
    sessionId: params.sessionId,
    properties: {
      ip: params.ip,
      platform: params.platform,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  logAnalyticsEvent(event);
}

/**
 * Internal function to track public resolution (called from service)
 */
export function trackPublicResolution(params: {
  requestId: string;
  status: string;
  latencyMs: number;
  servedFromCache: boolean;
  error?: string;
}): void {
  logger.debug(params, 'Public resolution tracked');
}

/**
 * Log analytics event (placeholder - connect to actual analytics backend)
 */
function logAnalyticsEvent(event: PublicAnalyticsEventInput): void {
  // In production, this would send to analytics backend
  logger.info(event, 'Analytics event logged');
}
