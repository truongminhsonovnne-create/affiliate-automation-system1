/**
 * TikTok Shop Preview Event Model
 *
 * Standardizes preview event model construction and validation.
 */

import type {
  TikTokShopPreviewEventType,
  TikTokShopPreviewSupportState,
  CreateTikTokShopPreviewEventInput,
  TikTokShopPreviewEvent,
} from '../types.js';

/**
 * Build a preview surface viewed event
 */
export function buildPreviewSurfaceViewedEvent(
  sessionId: string | undefined,
  surface: string,
  supportState: TikTokShopPreviewSupportState,
  metadata?: Record<string, unknown>
): CreateTikTokShopPreviewEventInput {
  return {
    sessionId,
    eventType: 'preview_surface_viewed',
    supportState,
    eventPayload: {
      surface,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Build a preview input submitted event
 */
export function buildPreviewInputSubmittedEvent(
  sessionId: string | undefined,
  inputType: string,
  supportState: TikTokShopPreviewSupportState,
  metadata?: Record<string, unknown>
): CreateTikTokShopPreviewEventInput {
  return {
    sessionId,
    eventType: 'preview_input_submitted',
    supportState,
    eventPayload: {
      inputType,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Build a preview resolution attempted event
 */
export function buildPreviewResolutionAttemptedEvent(
  sessionId: string | undefined,
  resolutionType: string,
  supportState: TikTokShopPreviewSupportState,
  resolutionRunId?: string,
  metadata?: Record<string, unknown>
): CreateTikTokShopPreviewEventInput {
  return {
    sessionId,
    eventType: 'preview_resolution_attempted',
    supportState,
    resolutionRunId,
    eventPayload: {
      resolutionType,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Build a preview resolution supported event
 */
export function buildPreviewResolutionSupportedEvent(
  sessionId: string | undefined,
  resolutionRunId: string,
  metadata?: Record<string, unknown>
): CreateTikTokShopPreviewEventInput {
  return {
    sessionId,
    eventType: 'preview_resolution_supported',
    supportState: 'supported',
    resolutionRunId,
    eventPayload: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Build a preview resolution partial event
 */
export function buildPreviewResolutionPartialEvent(
  sessionId: string | undefined,
  resolutionRunId: string,
  metadata?: Record<string, unknown>
): CreateTikTokShopPreviewEventInput {
  return {
    sessionId,
    eventType: 'preview_resolution_partial',
    supportState: 'partially_supported',
    resolutionRunId,
    eventPayload: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Build a preview resolution unavailable event
 */
export function buildPreviewResolutionUnavailableEvent(
  sessionId: string | undefined,
  resolutionRunId: string,
  metadata?: Record<string, unknown>
): CreateTikTokShopPreviewEventInput {
  return {
    sessionId,
    eventType: 'preview_resolution_unavailable',
    supportState: 'unsupported',
    resolutionRunId,
    eventPayload: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Build a preview candidate viewed event
 */
export function buildPreviewCandidateViewedEvent(
  sessionId: string | undefined,
  candidateId: string,
  metadata?: Record<string, unknown>
): CreateTikTokShopPreviewEventInput {
  return {
    sessionId,
    eventType: 'preview_candidate_viewed',
    eventPayload: {
      candidateId,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Build a preview copy attempted event
 */
export function buildPreviewCopyAttemptedEvent(
  sessionId: string | undefined,
  contentType: string,
  success: boolean,
  metadata?: Record<string, unknown>
): CreateTikTokShopPreviewEventInput {
  return {
    sessionId,
    eventType: 'preview_copy_attempted',
    eventPayload: {
      contentType,
      success,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Build a preview open attempted event
 */
export function buildPreviewOpenAttemptedEvent(
  sessionId: string | undefined,
  targetUrl: string,
  success: boolean,
  metadata?: Record<string, unknown>
): CreateTikTokShopPreviewEventInput {
  return {
    sessionId,
    eventType: 'preview_open_attempted',
    eventPayload: {
      targetUrl,
      success,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Build a preview blocked by gate event
 */
export function buildPreviewBlockedByGateEvent(
  sessionId: string | undefined,
  gateReason: string,
  metadata?: Record<string, unknown>
): CreateTikTokShopPreviewEventInput {
  return {
    sessionId,
    eventType: 'preview_blocked_by_gate',
    supportState: 'not_ready',
    eventPayload: {
      gateReason,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Build a preview abandoned event
 */
export function buildPreviewAbandonedEvent(
  sessionId: string | undefined,
  dropoffPoint: string,
  metadata?: Record<string, unknown>
): CreateTikTokShopPreviewEventInput {
  return {
    sessionId,
    eventType: 'preview_abandoned',
    eventPayload: {
      dropoffPoint,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Build a preview error event
 */
export function buildPreviewErrorEvent(
  sessionId: string | undefined,
  errorCode: string,
  errorMessage: string,
  metadata?: Record<string, unknown>
): CreateTikTokShopPreviewEventInput {
  return {
    sessionId,
    eventType: 'preview_error',
    eventPayload: {
      errorCode,
      errorMessage,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Build a generic preview event
 */
export function buildTikTokPreviewEvent(
  eventType: TikTokShopPreviewEventType,
  sessionId: string | undefined,
  payload?: Record<string, unknown>
): CreateTikTokShopPreviewEventInput {
  return {
    sessionId,
    eventType,
    eventPayload: {
      ...payload,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Validate preview event
 */
export function validateTikTokPreviewEvent(
  event: CreateTikTokShopPreviewEventInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!event.eventType) {
    errors.push('eventType is required');
  }

  const validEventTypes = [
    'preview_surface_viewed',
    'preview_input_submitted',
    'preview_resolution_attempted',
    'preview_resolution_supported',
    'preview_resolution_partial',
    'preview_resolution_unavailable',
    'preview_candidate_viewed',
    'preview_copy_attempted',
    'preview_open_attempted',
    'preview_blocked_by_gate',
    'preview_abandoned',
    'preview_error',
  ];

  if (event.eventType && !validEventTypes.includes(event.eventType)) {
    errors.push(`Invalid eventType: ${event.eventType}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get event category for aggregation
 */
export function getEventCategory(eventType: TikTokShopPreviewEventType): string {
  if (eventType.startsWith('preview_surface')) return 'exposure';
  if (eventType.startsWith('preview_input')) return 'engagement';
  if (eventType.startsWith('preview_resolution')) return 'resolution';
  if (eventType.startsWith('preview_candidate')) return 'conversion';
  if (eventType.startsWith('preview_copy')) return 'conversion';
  if (eventType.startsWith('preview_open')) return 'conversion';
  if (eventType.startsWith('preview_blocked')) return 'block';
  if (eventType.startsWith('preview_abandoned')) return 'dropoff';
  if (eventType.startsWith('preview_error')) return 'error';
  return 'unknown';
}

/**
 * Is event type a resolution outcome
 */
export function isResolutionOutcome(eventType: TikTokShopPreviewEventType): boolean {
  return [
    'preview_resolution_supported',
    'preview_resolution_partial',
    'preview_resolution_unavailable',
  ].includes(eventType);
}

/**
 * Is event type an interaction
 */
export function isInteractionEvent(eventType: TikTokShopPreviewEventType): boolean {
  return [
    'preview_candidate_viewed',
    'preview_copy_attempted',
    'preview_open_attempted',
  ].includes(eventType);
}
