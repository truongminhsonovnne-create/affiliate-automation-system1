/**
 * TikTok Shop Preview Event Recorder
 *
 * Records preview events with idempotency and proper session tracking.
 */

import { v4 as uuidv4 } from 'uuid';
import { tiktokPreviewSessionRepository } from '../repositories/tiktokPreviewSessionRepository.js';
import {
  buildPreviewSurfaceViewedEvent,
  buildPreviewInputSubmittedEvent,
  buildPreviewResolutionAttemptedEvent,
  buildPreviewResolutionSupportedEvent,
  buildPreviewResolutionPartialEvent,
  buildPreviewResolutionUnavailableEvent,
  buildPreviewCandidateViewedEvent,
  buildPreviewCopyAttemptedEvent,
  buildPreviewOpenAttemptedEvent,
  buildPreviewBlockedByGateEvent,
  buildPreviewAbandonedEvent,
  buildPreviewErrorEvent,
  validateTikTokPreviewEvent,
} from './tiktokPreviewEventModel.js';
import type {
  TikTokShopPreviewEventType,
  TikTokShopPreviewSupportState,
  CreateTikTokShopPreviewEventInput,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * Preview Event Recorder
 */
export class TikTokPreviewEventRecorder {
  /**
   * Record a preview event
   */
  async recordTikTokPreviewEvent(
    input: CreateTikTokShopPreviewEventInput
  ): Promise<string> {
    // Validate event
    const validation = validateTikTokPreviewEvent(input);
    if (!validation.valid) {
      throw new Error(`Invalid preview event: ${validation.errors.join(', ')}`);
    }

    // Create event in database
    const event = await tiktokPreviewSessionRepository.createEvent(input);

    // Update session last_seen_at if session exists
    if (input.sessionId) {
      await tiktokPreviewSessionRepository.updateSession(input.sessionId, {});
    }

    logger.info({
      msg: 'Recorded TikTok preview event',
      eventId: event.id,
      eventType: input.eventType,
      sessionId: input.sessionId,
    });

    return event.id;
  }

  /**
   * Record surface viewed event
   */
  async recordSurfaceViewed(
    sessionKey: string | undefined,
    surface: string,
    supportState: TikTokShopPreviewSupportState,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    let sessionId: string | undefined;

    if (sessionKey) {
      const session = await tiktokPreviewSessionRepository.getSessionByKey(sessionKey);
      sessionId = session?.id;
    }

    const eventInput = buildPreviewSurfaceViewedEvent(sessionId, surface, supportState, metadata);
    return this.recordTikTokPreviewEvent(eventInput);
  }

  /**
   * Record input submitted event
   */
  async recordInputSubmitted(
    sessionKey: string | undefined,
    inputType: string,
    supportState: TikTokShopPreviewSupportState,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    let sessionId: string | undefined;

    if (sessionKey) {
      const session = await tiktokPreviewSessionRepository.getSessionByKey(sessionKey);
      sessionId = session?.id;
    }

    const eventInput = buildPreviewInputSubmittedEvent(sessionId, inputType, supportState, metadata);
    return this.recordTikTokPreviewEvent(eventInput);
  }

  /**
   * Record resolution attempted event
   */
  async recordResolutionAttempted(
    sessionKey: string | undefined,
    resolutionType: string,
    supportState: TikTokShopPreviewSupportState,
    resolutionRunId?: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    let sessionId: string | undefined;

    if (sessionKey) {
      const session = await tiktokPreviewSessionRepository.getSessionByKey(sessionKey);
      sessionId = session?.id;
    }

    const eventInput = buildPreviewResolutionAttemptedEvent(
      sessionId,
      resolutionType,
      supportState,
      resolutionRunId,
      metadata
    );
    return this.recordTikTokPreviewEvent(eventInput);
  }

  /**
   * Record resolution outcome
   */
  async recordResolutionOutcome(
    sessionKey: string | undefined,
    resolutionRunId: string,
    outcome: 'supported' | 'partial' | 'unavailable',
    metadata?: Record<string, unknown>
  ): Promise<string> {
    let sessionId: string | undefined;

    if (sessionKey) {
      const session = await tiktokPreviewSessionRepository.getSessionByKey(sessionKey);
      sessionId = session?.id;
    }

    let eventInput: CreateTikTokShopPreviewEventInput;

    switch (outcome) {
      case 'supported':
        eventInput = buildPreviewResolutionSupportedEvent(sessionId, resolutionRunId, metadata);
        break;
      case 'partial':
        eventInput = buildPreviewResolutionPartialEvent(sessionId, resolutionRunId, metadata);
        break;
      case 'unavailable':
        eventInput = buildPreviewResolutionUnavailableEvent(sessionId, resolutionRunId, metadata);
        break;
    }

    return this.recordTikTokPreviewEvent(eventInput);
  }

  /**
   * Record candidate viewed event
   */
  async recordCandidateViewed(
    sessionKey: string | undefined,
    candidateId: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    let sessionId: string | undefined;

    if (sessionKey) {
      const session = await tiktokPreviewSessionRepository.getSessionByKey(sessionKey);
      sessionId = session?.id;
    }

    const eventInput = buildPreviewCandidateViewedEvent(sessionId, candidateId, metadata);
    return this.recordTikTokPreviewEvent(eventInput);
  }

  /**
   * Record copy attempted event
   */
  async recordCopyAttempted(
    sessionKey: string | undefined,
    contentType: string,
    success: boolean,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    let sessionId: string | undefined;

    if (sessionKey) {
      const session = await tiktokPreviewSessionRepository.getSessionByKey(sessionKey);
      sessionId = session?.id;
    }

    const eventInput = buildPreviewCopyAttemptedEvent(sessionId, contentType, success, metadata);
    return this.recordTikTokPreviewEvent(eventInput);
  }

  /**
   * Record open attempted event
   */
  async recordOpenAttempted(
    sessionKey: string | undefined,
    targetUrl: string,
    success: boolean,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    let sessionId: string | undefined;

    if (sessionKey) {
      const session = await tiktokPreviewSessionRepository.getSessionByKey(sessionKey);
      sessionId = session?.id;
    }

    const eventInput = buildPreviewOpenAttemptedEvent(sessionId, targetUrl, success, metadata);
    return this.recordTikTokPreviewEvent(eventInput);
  }

  /**
   * Record gate blocked event
   */
  async recordGateBlocked(
    sessionKey: string | undefined,
    gateReason: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    let sessionId: string | undefined;

    if (sessionKey) {
      const session = await tiktokPreviewSessionRepository.getSessionByKey(sessionKey);
      sessionId = session?.id;
    }

    const eventInput = buildPreviewBlockedByGateEvent(sessionId, gateReason, metadata);
    return this.recordTikTokPreviewEvent(eventInput);
  }

  /**
   * Record abandonment event
   */
  async recordAbandoned(
    sessionKey: string | undefined,
    dropoffPoint: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    let sessionId: string | undefined;

    if (sessionKey) {
      const session = await tiktokPreviewSessionRepository.getSessionByKey(sessionKey);
      sessionId = session?.id;
    }

    const eventInput = buildPreviewAbandonedEvent(sessionId, dropoffPoint, metadata);
    return this.recordTikTokPreviewEvent(eventInput);
  }

  /**
   * Record error event
   */
  async recordError(
    sessionKey: string | undefined,
    errorCode: string,
    errorMessage: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    let sessionId: string | undefined;

    if (sessionKey) {
      const session = await tiktokPreviewSessionRepository.getSessionByKey(sessionKey);
      sessionId = session?.id;
    }

    const eventInput = buildPreviewErrorEvent(sessionId, errorCode, errorMessage, metadata);
    return this.recordTikTokPreviewEvent(eventInput);
  }

  /**
   * Record session activity (alias for backward compatibility)
   */
  async recordTikTokPreviewSessionActivity(
    sessionKey: string,
    eventType: TikTokShopPreviewEventType,
    payload?: Record<string, unknown>
  ): Promise<string> {
    const session = await tiktokPreviewSessionRepository.getSessionByKey(sessionKey);
    const eventInput = {
      sessionId: session?.id,
      eventType,
      eventPayload: payload,
    };

    return this.recordTikTokPreviewEvent(eventInput);
  }

  /**
   * Record resolution outcome (alias for backward compatibility)
   */
  async recordTikTokPreviewResolutionOutcome(
    sessionKey: string,
    resolutionRunId: string,
    supportState: TikTokShopPreviewSupportState,
    payload?: Record<string, unknown>
  ): Promise<string> {
    const outcome = supportState === 'supported'
      ? 'supported'
      : supportState === 'partially_supported'
        ? 'partial'
        : 'unavailable';

    return this.recordResolutionOutcome(sessionKey, resolutionRunId, outcome, payload);
  }

  /**
   * Record interaction signal (alias for backward compatibility)
   */
  async recordTikTokPreviewInteractionSignal(
    sessionKey: string,
    signalType: string,
    payload?: Record<string, unknown>
  ): Promise<string> {
    const eventTypeMap: Record<string, TikTokShopPreviewEventType> = {
      candidate_viewed: 'preview_candidate_viewed',
      copy_attempted: 'preview_copy_attempted',
      open_attempted: 'preview_open_attempted',
    };

    const eventType = eventTypeMap[signalType] || 'preview_candidate_viewed';

    const session = await tiktokPreviewSessionRepository.getSessionByKey(sessionKey);
    const eventInput = {
      sessionId: session?.id,
      eventType,
      eventPayload: payload,
    };

    return this.recordTikTokPreviewEvent(eventInput);
  }
}

/**
 * Recorder singleton
 */
export const tiktokPreviewEventRecorder = new TikTokPreviewEventRecorder();
