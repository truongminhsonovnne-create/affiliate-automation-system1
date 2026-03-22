/**
 * Voucher Engine Events
 *
 * Operational events for voucher engine.
 */

import { EventEmitter } from 'events';

/**
 * Voucher engine event types
 */
export type VoucherEngineEvent =
  | 'resolution.start'
  | 'resolution.complete'
  | 'resolution.error'
  | 'cache.hit'
  | 'cache.miss'
  | 'cache.set'
  | 'eligibility.evaluate'
  | 'ranking.start'
  | 'ranking.complete';

/**
 * Voucher engine event data
 */
export interface VoucherEngineEventData {
  'resolution.start': {
    requestId: string;
    platform: string;
    url: string;
  };
  'resolution.complete': {
    requestId: string;
    platform: string;
    hasMatch: boolean;
    matchType: string;
    durationMs: number;
    cached: boolean;
  };
  'resolution.error': {
    requestId: string;
    platform: string;
    error: string;
  };
  'cache.hit': {
    cacheKey: string;
  };
  'cache.miss': {
    cacheKey: string;
  };
  'cache.set': {
    cacheKey: string;
    ttlSeconds: number;
  };
  'eligibility.evaluate': {
    voucherId: string;
    isEligible: boolean;
    matchType: string;
  };
  'ranking.start': {
    candidateCount: number;
  };
  'ranking.complete': {
    selectedVoucherId: string | null;
    rankingScore: number;
    durationMs: number;
  };
}

/**
 * Voucher engine event emitter
 */
export class VoucherEngineEvents extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Emit resolution start event
   */
  emitResolutionStart(requestId: string, platform: string, url: string): void {
    this.emit('resolution.start', {
      requestId,
      platform,
      url: this.sanitizeUrl(url),
    } as VoucherEngineEventData['resolution.start']);
  }

  /**
   * Emit resolution complete event
   */
  emitResolutionComplete(data: {
    requestId: string;
    platform: string;
    hasMatch: boolean;
    matchType: string;
    durationMs: number;
    cached: boolean;
  }): void {
    this.emit('resolution.complete', data);
  }

  /**
   * Emit resolution error event
   */
  emitResolutionError(requestId: string, platform: string, error: string): void {
    this.emit('resolution.error', {
      requestId,
      platform,
      error,
    });
  }

  /**
   * Emit cache hit event
   */
  emitCacheHit(cacheKey: string): void {
    this.emit('cache.hit', { cacheKey });
  }

  /**
   * Emit cache miss event
   */
  emitCacheMiss(cacheKey: string): void {
    this.emit('cache.miss', { cacheKey });
  }

  /**
   * Emit cache set event
   */
  emitCacheSet(cacheKey: string, ttlSeconds: number): void {
    this.emit('cache.set', { cacheKey, ttlSeconds });
  }

  /**
   * Emit eligibility evaluation event
   */
  emitEligibilityEvaluate(voucherId: string, isEligible: boolean, matchType: string): void {
    this.emit('eligibility.evaluate', {
      voucherId,
      isEligible,
      matchType,
    });
  }

  /**
   * Emit ranking start event
   */
  emitRankingStart(candidateCount: number): void {
    this.emit('ranking.start', { candidateCount });
  }

  /**
   * Emit ranking complete event
   */
  emitRankingComplete(selectedVoucherId: string | null, rankingScore: number, durationMs: number): void {
    this.emit('ranking.complete', {
      selectedVoucherId,
      rankingScore,
      durationMs,
    });
  }

  /**
   * Subscribe to event
   */
  on<K extends VoucherEngineEvent>(
    event: K,
    listener: (data: VoucherEngineEventData[K]) => void
  ): this {
    return super.on(event, listener);
  }

  /**
   * Unsubscribe from event
   */
  off<K extends VoucherEngineEvent>(
    event: K,
    listener: (data: VoucherEngineEventData[K]) => void
  ): this {
    return super.off(event, listener);
  }

  /**
   * Sanitize URL for logging
   */
  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove sensitive params
      parsed.searchParams.delete('token');
      parsed.searchParams.delete('key');
      return parsed.toString();
    } catch {
      return url.substring(0, 100) + '...';
    }
  }
}

/**
 * Global event emitter instance
 */
export const voucherEngineEvents = new VoucherEngineEvents();
