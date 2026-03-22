/**
 * Commercial Intelligence Operational Events
 *
 * Structured operational events for commercial intelligence.
 */

import { logger } from '../../utils/logger.js';

/**
 * Operational Event Types
 */
export const CommercialEventType = {
  ATTRIBUTION_CYCLE_START: 'commercial.attribution.cycle.start',
  ATTRIBUTION_CYCLE_COMPLETE: 'commercial.attribution.cycle.complete',
  ATTRIBUTION_CYCLE_ERROR: 'commercial.attribution.cycle.error',

  GOVERNANCE_REVIEW_START: 'commercial.governance.review.start',
  GOVERNANCE_REVIEW_COMPLETE: 'commercial.governance.review.complete',
  GOVERNANCE_REVIEW_ERROR: 'commercial.governance.review.error',

  ANOMALY_DETECTION_START: 'commercial.anomaly.detection.start',
  ANOMALY_DETECTION_COMPLETE: 'commercial.anomaly.detection.complete',

  SESSION_CREATED: 'commercial.session.created',
  SESSION_UPDATED: 'commercial.session.updated',
  SESSION_EXPIRED: 'commercial.session.expired',

  EVENT_RECORDED: 'commercial.event.recorded',
  CLICK_ATTRIBUTED: 'commercial.click.attributed',
  CONVERSION_REPORTED: 'commercial.conversion.reported',

  GUARDRAIL_EVALUATED: 'commercial.guardrail.evaluated',
  GUARDRAIL_BREACHED: 'commercial.guardrail.breached',
} as const;

/**
 * Record operational event
 */
export function recordCommercialEvent(
  eventType: string,
  payload?: Record<string, unknown>
): void {
  logger.info({
    type: 'commercial_event',
    event: eventType,
    ...payload,
  });
}

/**
 * Attribution cycle events
 */
export const attributionEvents = {
  start: (params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.ATTRIBUTION_CYCLE_START, params);
  },
  complete: (params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.ATTRIBUTION_CYCLE_COMPLETE, params);
  },
  error: (error: string, params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.ATTRIBUTION_CYCLE_ERROR, { error, ...params });
  },
};

/**
 * Governance review events
 */
export const governanceEvents = {
  start: (params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.GOVERNANCE_REVIEW_START, params);
  },
  complete: (params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.GOVERNANCE_REVIEW_COMPLETE, params);
  },
  error: (error: string, params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.GOVERNANCE_REVIEW_ERROR, { error, ...params });
  },
};

/**
 * Anomaly detection events
 */
export const anomalyEvents = {
  start: (params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.ANOMALY_DETECTION_START, params);
  },
  complete: (params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.ANOMALY_DETECTION_COMPLETE, params);
  },
};

/**
 * Session events
 */
export const sessionEvents = {
  created: (sessionId: string, params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.SESSION_CREATED, { sessionId, ...params });
  },
  updated: (sessionId: string, params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.SESSION_UPDATED, { sessionId, ...params });
  },
  expired: (sessionId: string, params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.SESSION_EXPIRED, { sessionId, ...params });
  },
};

/**
 * Funnel events
 */
export const funnelEvents = {
  recorded: (eventType: string, params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.EVENT_RECORDED, { eventType, ...params });
  },
};

/**
 * Click events
 */
export const clickEvents = {
  attributed: (clickKey: string, params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.CLICK_ATTRIBUTED, { clickKey, ...params });
  },
};

/**
 * Conversion events
 */
export const conversionEvents = {
  reported: (conversionId: string, params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.CONVERSION_REPORTED, { conversionId, ...params });
  },
};

/**
 * Guardrail events
 */
export const guardrailEvents = {
  evaluated: (result: string, params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.GUARDRAIL_EVALUATED, { result, ...params });
  },
  breached: (guardrailName: string, params?: Record<string, unknown>) => {
    recordCommercialEvent(CommercialEventType.GUARDRAIL_BREACHED, { guardrailName, ...params });
  },
};

export default {
  recordCommercialEvent,
  attributionEvents,
  governanceEvents,
  anomalyEvents,
  sessionEvents,
  funnelEvents,
  clickEvents,
  conversionEvents,
  guardrailEvents,
};
