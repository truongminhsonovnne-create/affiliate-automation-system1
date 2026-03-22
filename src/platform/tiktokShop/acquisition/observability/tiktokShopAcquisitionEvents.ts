/**
 * TikTok Shop Acquisition Events
 */

import { logger } from '../../../../utils/logger.js';

export const EVENTS = {
  DISCOVERY_START: 'tiktok_shop.acquisition.discovery.start',
  DISCOVERY_COMPLETE: 'tiktok_shop.acquisition.discovery.complete',
  DETAIL_START: 'tiktok_shop.acquisition.detail.start',
  DETAIL_COMPLETE: 'tiktok_shop.acquisition.detail.complete',
  EXTRACTION_QUALITY: 'tiktok_shop.acquisition.quality',
  RUNTIME_HEALTH: 'tiktok_shop.acquisition.health',
  FAILURE: 'tiktok_shop.acquisition.failure',
};

export function emitDiscoveryStartEvent(seeds: string[]) {
  logger.info({ msg: 'Discovery started', event: EVENTS.DISCOVERY_START, seeds: seeds.length });
}

export function emitDiscoveryCompleteEvent(items: number) {
  logger.info({ msg: 'Discovery completed', event: EVENTS.DISCOVERY_COMPLETE, items });
}

export function emitDetailStartEvent(referenceKey: string) {
  logger.info({ msg: 'Detail extraction started', event: EVENTS.DETAIL_START, referenceKey });
}

export function emitDetailCompleteEvent(referenceKey: string, quality: number) {
  logger.info({ msg: 'Detail extraction completed', event: EVENTS.DETAIL_COMPLETE, referenceKey, quality });
}

export function emitFailureEvent(type: string, error: string) {
  logger.error({ msg: 'Acquisition failure', event: EVENTS.FAILURE, type, error });
}
