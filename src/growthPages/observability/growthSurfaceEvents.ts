/**
 * Growth Surface Events
 *
 * Operational events for growth surfaces
 * - Structured logging
 * - Event emission
 */

import type { GrowthSurfaceType, SurfaceCtaType } from '../types/index.js';

// ============================================================================
// Event Types
// ============================================================================

export type GrowthSurfaceEventType =
  | 'surface.viewed'
  | 'surface.cta_clicked'
  | 'surface.related_clicked'
  | 'surface.converted'
  | 'surface.bounced'
  | 'surface.error'
  | 'cache.hit'
  | 'cache.miss'
  | 'cache.stale'
  | 'seo.indexed'
  | 'seo.excluded';

export interface GrowthSurfaceOperationalEvent {
  eventType: GrowthSurfaceEventType;
  timestamp: number;
  surfaceType: GrowthSurfaceType;
  slug: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Event Logger
// ============================================================================

class GrowthSurfaceEventLogger {
  private events: GrowthSurfaceOperationalEvent[] = [];
  private maxEvents = 1000;

  /**
   * Log an event
   */
  log(event: GrowthSurfaceOperationalEvent): void {
    this.events.push({
      ...event,
      timestamp: event.timestamp || Date.now(),
    });

    // Trim if exceeds max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // In production, also send to external logging service
    console.log('[GrowthSurfaceEvent]', event.eventType, {
      surfaceType: event.surfaceType,
      slug: event.slug,
      ...event.metadata,
    });
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 100): GrowthSurfaceOperationalEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: GrowthSurfaceEventType): GrowthSurfaceOperationalEvent[] {
    return this.events.filter((e) => e.eventType === eventType);
  }

  /**
   * Get events for a surface
   */
  getEventsForSurface(
    surfaceType: GrowthSurfaceType,
    slug: string
  ): GrowthSurfaceOperationalEvent[] {
    return this.events.filter(
      (e) => e.surfaceType === surfaceType && e.slug === slug
    );
  }

  /**
   * Clear events
   */
  clear(): void {
    this.events = [];
  }
}

// Singleton instance
const eventLogger = new GrowthSurfaceEventLogger();

// ============================================================================
// Event Factory Functions
// ============================================================================

/**
 * Create surface viewed event
 */
export function createSurfaceViewedEvent(
  surfaceType: GrowthSurfaceType,
  slug: string,
  metadata?: Record<string, unknown>
): GrowthSurfaceOperationalEvent {
  return {
    eventType: 'surface.viewed',
    timestamp: Date.now(),
    surfaceType,
    slug,
    metadata,
  };
}

/**
 * Create CTA clicked event
 */
export function createSurfaceCtaClickedEvent(
  surfaceType: GrowthSurfaceType,
  slug: string,
  ctaType: SurfaceCtaType,
  metadata?: Record<string, unknown>
): GrowthSurfaceOperationalEvent {
  return {
    eventType: 'surface.cta_clicked',
    timestamp: Date.now(),
    surfaceType,
    slug,
    metadata: {
      ctaType,
      ...metadata,
    },
  };
}

/**
 * Create surface converted event
 */
export function createSurfaceConvertedEvent(
  surfaceType: GrowthSurfaceType,
  slug: string,
  conversionType: string,
  metadata?: Record<string, unknown>
): GrowthSurfaceOperationalEvent {
  return {
    eventType: 'surface.converted',
    timestamp: Date.now(),
    surfaceType,
    slug,
    metadata: {
      conversionType,
      ...metadata,
    },
  };
}

/**
 * Create surface error event
 */
export function createSurfaceErrorEvent(
  surfaceType: GrowthSurfaceType,
  slug: string,
  error: string,
  metadata?: Record<string, unknown>
): GrowthSurfaceOperationalEvent {
  return {
    eventType: 'surface.error',
    timestamp: Date.now(),
    surfaceType,
    slug,
    metadata: {
      error,
      ...metadata,
    },
  };
}

// ============================================================================
// Event Logging Functions
// ============================================================================

/**
 * Log surface viewed
 */
export function logSurfaceViewed(
  surfaceType: GrowthSurfaceType,
  slug: string,
  metadata?: Record<string, unknown>
): void {
  const event = createSurfaceViewedEvent(surfaceType, slug, metadata);
  eventLogger.log(event);
}

/**
 * Log CTA clicked
 */
export function logSurfaceCtaClicked(
  surfaceType: GrowthSurfaceType,
  slug: string,
  ctaType: SurfaceCtaType,
  metadata?: Record<string, unknown>
): void {
  const event = createSurfaceCtaClickedEvent(surfaceType, slug, ctaType, metadata);
  eventLogger.log(event);
}

/**
 * Log surface converted
 */
export function logSurfaceConverted(
  surfaceType: GrowthSurfaceType,
  slug: string,
  conversionType: string,
  metadata?: Record<string, unknown>
): void {
  const event = createSurfaceConvertedEvent(surfaceType, slug, conversionType, metadata);
  eventLogger.log(event);
}

/**
 * Log surface error
 */
export function logSurfaceError(
  surfaceType: GrowthSurfaceType,
  slug: string,
  error: string,
  metadata?: Record<string, unknown>
): void {
  const event = createSurfaceErrorEvent(surfaceType, slug, error, metadata);
  eventLogger.log(event);
}

/**
 * Log cache hit
 */
export function logCacheHit(surfaceType: GrowthSurfaceType, slug: string): void {
  eventLogger.log({
    eventType: 'cache.hit',
    timestamp: Date.now(),
    surfaceType,
    slug,
  });
}

/**
 * Log cache miss
 */
export function logCacheMiss(surfaceType: GrowthSurfaceType, slug: string): void {
  eventLogger.log({
    eventType: 'cache.miss',
    timestamp: Date.now(),
    surfaceType,
    slug,
  });
}

// ============================================================================
// Event Retrieval
// ============================================================================

/**
 * Get event logger instance
 */
export function getEventLogger(): GrowthSurfaceEventLogger {
  return eventLogger;
}
