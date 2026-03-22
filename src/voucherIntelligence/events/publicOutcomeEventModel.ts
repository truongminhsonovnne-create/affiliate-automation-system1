/**
 * Public Outcome Event Model
 *
 * Standardizes event model for public voucher flow
 * - Typed events
 * - Privacy-safe
 * - Usable for realtime and batch analysis
 */

import {
  VoucherOutcomeEventType,
  VoucherOutcomeSignal,
  VoucherOutcomeAttributionContext,
  Platform,
  isVoucherOutcomeEventType,
} from '../types/index.js';
import { EVENT_TYPE_WEIGHTS } from '../constants/index.js';

// ============================================================================
// Event Builder Types
// ============================================================================

export interface ResolutionViewedEventParams {
  outcomeId: string;
  platform: Platform;
  normalizedUrl: string;
  bestVoucherId?: string;
  shownVoucherIds: string[];
  sessionId?: string;
  attributionContext?: VoucherOutcomeAttributionContext;
  productContext?: Record<string, unknown>;
}

export interface VoucherInteractionEventParams {
  outcomeId: string;
  eventType: VoucherOutcomeEventType;
  voucherId?: string;
  sessionId?: string;
  userId?: string;
  eventPayload?: Record<string, unknown>;
  eventOrder?: number;
}

export interface NoMatchViewedEventParams {
  outcomeId: string;
  normalizedUrl: string;
  sessionId?: string;
  attributionContext?: VoucherOutcomeAttributionContext;
}

// ============================================================================
// Event Builders
// ============================================================================

/**
 * Build a voucher outcome signal event
 */
export function buildVoucherOutcomeEvent(params: {
  outcomeId: string;
  eventType: string;
  voucherId?: string;
  sessionId?: string;
  userId?: string;
  eventPayload?: Record<string, unknown>;
  eventOrder?: number;
}): VoucherOutcomeSignal {
  if (!isVoucherOutcomeEventType(params.eventType)) {
    throw new Error(`Invalid event type: ${params.eventType}`);
  }

  return {
    id: crypto.randomUUID(),
    outcomeId: params.outcomeId,
    eventType: params.eventType as VoucherOutcomeEventType,
    voucherId: params.voucherId,
    eventPayload: params.eventPayload,
    eventOrder: params.eventOrder,
    sessionId: params.sessionId,
    userId: params.userId,
    createdAt: new Date(),
  };
}

/**
 * Build resolution viewed event
 */
export function buildResolutionViewedEvent(params: ResolutionViewedEventParams): VoucherOutcomeSignal {
  return buildVoucherOutcomeEvent({
    outcomeId: params.outcomeId,
    eventType: VoucherOutcomeEventType.RESOLUTION_VIEWED,
    sessionId: params.sessionId,
    eventPayload: {
      platform: params.platform,
      normalizedUrl: params.normalizedUrl,
      bestVoucherId: params.bestVoucherId,
      shownVoucherIds: params.shownVoucherIds,
      productContext: params.productContext,
      attributionContext: params.attributionContext,
    },
    eventOrder: 0,
  });
}

/**
 * Build best voucher viewed event
 */
export function buildBestVoucherViewedEvent(params: {
  outcomeId: string;
  voucherId: string;
  sessionId?: string;
}): VoucherOutcomeSignal {
  return buildVoucherOutcomeEvent({
    outcomeId: params.outcomeId,
    eventType: VoucherOutcomeEventType.BEST_VOUCHER_VIEWED,
    voucherId: params.voucherId,
    sessionId: params.sessionId,
    eventOrder: 1,
  });
}

/**
 * Build candidate voucher viewed event
 */
export function buildCandidateViewedEvent(params: {
  outcomeId: string;
  voucherId: string;
  sessionId?: string;
  eventOrder?: number;
}): VoucherOutcomeSignal {
  return buildVoucherOutcomeEvent({
    outcomeId: params.outcomeId,
    eventType: VoucherOutcomeEventType.CANDIDATE_VIEWED,
    voucherId: params.voucherId,
    sessionId: params.sessionId,
    eventOrder: params.eventOrder || 2,
  });
}

/**
 * Build voucher copied event
 */
export function buildVoucherCopiedEvent(params: {
  outcomeId: string;
  voucherId: string;
  sessionId?: string;
  copySuccess?: boolean;
  errorMessage?: string;
}): VoucherOutcomeSignal {
  const eventType = params.copySuccess !== false
    ? VoucherOutcomeEventType.VOUCHER_COPIED
    : VoucherOutcomeEventType.VOUCHER_COPY_FAILED;

  return buildVoucherOutcomeEvent({
    outcomeId: params.outcomeId,
    eventType,
    voucherId: params.voucherId,
    sessionId: params.sessionId,
    eventPayload: params.copySuccess === false ? { errorMessage: params.errorMessage } : undefined,
    eventOrder: 10,
  });
}

/**
 * Build open Shopee clicked event
 */
export function buildOpenShopeeClickedEvent(params: {
  outcomeId: string;
  voucherId?: string;
  sessionId?: string;
}): VoucherOutcomeSignal {
  return buildVoucherOutcomeEvent({
    outcomeId: params.outcomeId,
    eventType: VoucherOutcomeEventType.OPEN_SHOPEE_CLICKED,
    voucherId: params.voucherId,
    sessionId: params.sessionId,
    eventOrder: 20,
  });
}

/**
 * Build no-match viewed event
 */
export function buildNoMatchViewedEvent(params: NoMatchViewedEventParams): VoucherOutcomeSignal {
  return buildVoucherOutcomeEvent({
    outcomeId: params.outcomeId,
    eventType: VoucherOutcomeEventType.NO_MATCH_VIEWED,
    sessionId: params.sessionId,
    eventPayload: {
      normalizedUrl: params.normalizedUrl,
      attributionContext: params.attributionContext,
    },
    eventOrder: 0,
  });
}

/**
 * Build fallback clicked event
 */
export function buildFallbackClickedEvent(params: {
  outcomeId: string;
  fallbackOption?: string;
  sessionId?: string;
}): VoucherOutcomeSignal {
  return buildVoucherOutcomeEvent({
    outcomeId: params.outcomeId,
    eventType: VoucherOutcomeEventType.FALLBACK_CLICKED,
    sessionId: params.sessionId,
    eventPayload: {
      fallbackOption: params.fallbackOption,
    },
    eventOrder: 30,
  });
}

// ============================================================================
// Event Validation
// ============================================================================

/**
 * Validate voucher outcome event
 */
export function validateVoucherOutcomeEvent(event: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!event || typeof event !== 'object') {
    return { valid: false, errors: ['Event must be an object'] };
  }

  const e = event as Record<string, unknown>;

  if (!e.eventType || typeof e.eventType !== 'string') {
    errors.push('eventType is required');
  } else if (!isVoucherOutcomeEventType(e.eventType)) {
    errors.push(`Invalid event type: ${e.eventType}`);
  }

  if (!e.outcomeId || typeof e.outcomeId !== 'string') {
    errors.push('outcomeId is required');
  }

  if (e.eventOrder !== undefined && typeof e.eventOrder !== 'number') {
    errors.push('eventOrder must be a number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Event Weight Helpers
// ============================================================================

/**
 * Get event weight for quality scoring
 */
export function getEventTypeWeight(eventType: VoucherOutcomeEventType): number {
  return EVENT_TYPE_WEIGHTS[eventType] || 0.1;
}

// ============================================================================
// Privacy-Safe Event Creation
// ============================================================================

/**
 * Create privacy-safe event context (strips PII)
 */
export function createPrivacySafeContext(params: {
  sessionId?: string;
  attributionContext?: VoucherOutcomeAttributionContext;
}): {
  sessionIdHash?: string;
  attributionContext?: VoucherOutcomeAttributionContext;
} {
  // Hash session ID for privacy
  const sessionIdHash = params.sessionId
    ? hashString(params.sessionId)
    : undefined;

  return {
    sessionIdHash,
    attributionContext: params.attributionContext,
  };
}

/**
 * Simple string hash for anonymization
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// ============================================================================
// Event Factory
// ============================================================================

/**
 * Create event from raw client data (with privacy protection)
 */
export function createEventFromClientData(params: {
  eventType: string;
  outcomeId: string;
  voucherId?: string;
  rawSessionId?: string;
  rawUserId?: string;
  eventPayload?: Record<string, unknown>;
}): VoucherOutcomeSignal | null {
  // Validate event type
  if (!isVoucherOutcomeEventType(params.eventType)) {
    console.warn(`Invalid event type from client: ${params.eventType}`);
    return null;
  }

  // Create privacy-safe context
  const privacyContext = createPrivacySafeContext({
    sessionId: params.rawSessionId,
  });

  return buildVoucherOutcomeEvent({
    outcomeId: params.outcomeId,
    eventType: params.eventType,
    voucherId: params.voucherId,
    sessionId: privacyContext.sessionIdHash,
    eventPayload: sanitizeEventPayload(params.eventPayload),
  });
}

/**
 * Sanitize event payload (remove sensitive data)
 */
function sanitizeEventPayload(payload?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!payload) return undefined;

  const sensitiveKeys = ['password', 'token', 'secret', 'email', 'phone', 'address'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
