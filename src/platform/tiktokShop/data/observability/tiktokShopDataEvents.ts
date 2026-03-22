/**
 * TikTok Shop Data Events
 * Operational events for TikTok Shop data foundation
 */

import { logger } from '../../../../utils/logger.js';

/**
 * Event types for TikTok Shop data foundation
 */
export const TIKTOK_SHOP_DATA_EVENTS = {
  // Acquisition events
  ACQUISITION_START: 'tiktok_shop.data.acquisition.start',
  ACQUISITION_COMPLETE: 'tiktok_shop.data.acquisition.complete',
  ACQUISITION_FAILED: 'tiktok_shop.data.acquisition.failed',

  // Normalization events
  NORMALIZATION_START: 'tiktok_shop.data.normalization.start',
  NORMALIZATION_COMPLETE: 'tiktok_shop.data.normalization.complete',
  NORMALIZATION_FAILED: 'tiktok_shop.data.normalization.failed',

  // Enrichment events
  ENRICHMENT_START: 'tiktok_shop.data.enrichment.start',
  ENRICHMENT_COMPLETE: 'tiktok_shop.data.enrichment.complete',
  ENRICHMENT_FAILED: 'tiktok_shop.data.enrichment.failed',

  // Source health events
  SOURCE_HEALTH_CHECK: 'tiktok_shop.data.source.health_check',
  SOURCE_HEALTH_CHANGED: 'tiktok_shop.data.source.health_changed',

  // Readiness events
  READINESS_EVALUATED: 'tiktok_shop.data.readiness.evaluated',
  READINESS_CHANGED: 'tiktok_shop.data.readiness.changed',

  // Backlog events
  BACKLOG_ITEM_CREATED: 'tiktok_shop.data.backlog.item_created',
  BACKLOG_ITEM_COMPLETED: 'tiktok_shop.data.backlog.item_completed',
  BACKLOG_ITEM_ASSIGNED: 'tiktok_shop.data.backlog.item_assigned',

  // Freshness events
  FRESHNESS_EVALUATED: 'tiktok_shop.data.freshness.evaluated',
  DATA_STALE_DETECTED: 'tiktok_shop.data.freshness.stale_detected',
  DATA_EXPIRED_DETECTED: 'tiktok_shop.data.freshness.expired_detected',

  // Integration events
  DOMAIN_INTEGRATION_COMPLETE: 'tiktok_shop.data.integration.domain_complete',
  PROMOTION_INTEGRATION_COMPLETE: 'tiktok_shop.data.integration.promotion_complete',
  PLATFORM_INTEGRATION_COMPLETE: 'tiktok_shop.data.integration.platform_complete',
} as const;

/**
 * Emit acquisition start event
 */
export function emitAcquisitionStartEvent(sourceKey: string, runType: string): void {
  logger.info({
    msg: 'Acquisition started',
    event: TIKTOK_SHOP_DATA_EVENTS.ACQUISITION_START,
    sourceKey,
    runType,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit acquisition complete event
 */
export function emitAcquisitionCompleteEvent(
  sourceKey: string,
  itemsSeen: number,
  itemsNormalized: number,
  itemsEnriched: number,
  duration: number
): void {
  logger.info({
    msg: 'Acquisition completed',
    event: TIKTOK_SHOP_DATA_EVENTS.ACQUISITION_COMPLETE,
    sourceKey,
    itemsSeen,
    itemsNormalized,
    itemsEnriched,
    duration,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit acquisition failed event
 */
export function emitAcquisitionFailedEvent(sourceKey: string, error: string): void {
  logger.error({
    msg: 'Acquisition failed',
    event: TIKTOK_SHOP_DATA_EVENTS.ACQUISITION_FAILED,
    sourceKey,
    error,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit normalization complete event
 */
export function emitNormalizationCompleteEvent(sourceKey: string, normalizedCount: number, failedCount: number): void {
  logger.info({
    msg: 'Normalization completed',
    event: TIKTOK_SHOP_DATA_EVENTS.NORMALIZATION_COMPLETE,
    sourceKey,
    normalizedCount,
    failedCount,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit enrichment complete event
 */
export function emitEnrichmentCompleteEvent(
  sourceKey: string,
  enrichedCount: number,
  qualityScore: number
): void {
  logger.info({
    msg: 'Enrichment completed',
    event: TIKTOK_SHOP_DATA_EVENTS.ENRICHMENT_COMPLETE,
    sourceKey,
    enrichedCount,
    qualityScore,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit source health check event
 */
export function emitSourceHealthCheckEvent(sourceKey: string, healthStatus: string, healthScore: number): void {
  logger.info({
    msg: 'Source health checked',
    event: TIKTOK_SHOP_DATA_EVENTS.SOURCE_HEALTH_CHECK,
    sourceKey,
    healthStatus,
    healthScore,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit readiness evaluated event
 */
export function emitReadinessEvaluatedEvent(
  readinessStatus: string,
  readinessScore: number,
  blockers: number,
  warnings: number
): void {
  logger.info({
    msg: 'Readiness evaluated',
    event: TIKTOK_SHOP_DATA_EVENTS.READINESS_EVALUATED,
    readinessStatus,
    readinessScore,
    blockers,
    warnings,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit backlog item created event
 */
export function emitBacklogItemCreatedEvent(itemId: string, backlogType: string, priority: string): void {
  logger.info({
    msg: 'Backlog item created',
    event: TIKTOK_SHOP_DATA_EVENTS.BACKLOG_ITEM_CREATED,
    itemId,
    backlogType,
    priority,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit backlog item completed event
 */
export function emitBacklogItemCompletedEvent(itemId: string): void {
  logger.info({
    msg: 'Backlog item completed',
    event: TIKTOK_SHOP_DATA_EVENTS.BACKLOG_ITEM_COMPLETED,
    itemId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit freshness evaluated event
 */
export function emitFreshnessEvaluatedEvent(
  freshCount: number,
  staleCount: number,
  expiredCount: number
): void {
  logger.info({
    msg: 'Freshness evaluated',
    event: TIKTOK_SHOP_DATA_EVENTS.FRESHNESS_EVALUATED,
    freshCount,
    staleCount,
    expiredCount,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit stale data detected event
 */
export function emitStaleDataDetectedEvent(referenceKey: string, ageSeconds: number): void {
  logger.warn({
    msg: 'Stale data detected',
    event: TIKTOK_SHOP_DATA_EVENTS.DATA_STALE_DETECTED,
    referenceKey,
    ageSeconds,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit domain integration complete event
 */
export function emitDomainIntegrationCompleteEvent(referenceKeys: number): void {
  logger.info({
    msg: 'Domain integration complete',
    event: TIKTOK_SHOP_DATA_EVENTS.DOMAIN_INTEGRATION_COMPLETE,
    referenceKeys,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit promotion integration complete event
 */
export function emitPromotionIntegrationCompleteEvent(sourceKey: string, compatibilityScore: number): void {
  logger.info({
    msg: 'Promotion integration complete',
    event: TIKTOK_SHOP_DATA_EVENTS.PROMOTION_INTEGRATION_COMPLETE,
    sourceKey,
    compatibilityScore,
    timestamp: new Date().toISOString(),
  });
}
