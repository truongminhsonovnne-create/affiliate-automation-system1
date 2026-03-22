/**
 * Commercial Event Recorder
 *
 * Production-grade event recording with:
 * - Idempotency
 * - Privacy-safe handling
 * - Clear lineage from public/product flows
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type {
  CreateFunnelEventInput,
  CommercialFunnelEvent,
  CreateClickAttributionInput,
  AffiliateClickAttribution,
  CreateConversionReportInput,
  AffiliateConversionReport,
  CommercialResult,
} from '../types.js';
import { validateCommercialEvent } from './commercialEventModel.js';
import { logger } from '../../utils/logger.js';

/**
 * Commercial Event Recorder
 *
 * Responsible for recording funnel events, click attributions, and conversion reports.
 * Designed for idempotency and performance.
 */
export class CommercialEventRecorder {
  private supabase: SupabaseClient;
  private eventBatch: CreateFunnelEventInput[] = [];
  private batchSize: number;
  private flushInterval: number;

  constructor(options?: {
    supabase?: SupabaseClient;
    batchSize?: number;
    flushInterval?: number;
  }) {
    this.supabase = options?.supabase ?? getSupabaseClient();
    this.batchSize = options?.batchSize ?? 100;
    this.flushInterval = options?.flushInterval ?? 5000; // 5 seconds
  }

  /**
   * Record a single commercial event
   */
  async recordCommercialEvent(
    event: CreateFunnelEventInput
  ): Promise<CommercialResult<CommercialFunnelEvent>> {
    try {
      const validatedEvent = validateCommercialEvent(event);

      const { data, error } = await this.supabase
        .from('affiliate_funnel_events')
        .insert({
          session_id: validatedEvent.sessionId,
          event_type: validatedEvent.eventType,
          event_time: validatedEvent.eventTime ?? new Date(),
          platform: validatedEvent.platform,
          voucher_id: validatedEvent.voucherId,
          resolution_request_id: validatedEvent.resolutionRequestId,
          surface_type: validatedEvent.surfaceType,
          surface_id: validatedEvent.surfaceId,
          experiment_context: validatedEvent.experimentContext,
          event_payload: validatedEvent.eventPayload,
        })
        .select()
        .single();

      if (error) {
        logger.error({
          msg: 'Failed to record commercial event',
          error: error.message,
          eventType: event.eventType,
        });
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.mapDbToFunnelEvent(data),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error({
        msg: 'Error recording commercial event',
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Record commercial funnel step (with batch support)
   */
  async recordCommercialFunnelStep(
    event: CreateFunnelEventInput
  ): Promise<CommercialResult<CommercialFunnelEvent>> {
    // For single events, record directly
    if (this.batchSize === 1) {
      return this.recordCommercialEvent(event);
    }

    // Add to batch
    this.eventBatch.push(event);

    // Flush if batch is full
    if (this.eventBatch.length >= this.batchSize) {
      await this.flush();
    }

    // Return pending result
    return {
      success: true,
      data: {
        id: 'pending',
        sessionId: event.sessionId ?? '',
        eventType: event.eventType,
        eventTime: event.eventTime ?? new Date(),
        platform: event.platform ?? 'public',
        voucherId: event.voucherId ?? null,
        resolutionRequestId: event.resolutionRequestId ?? null,
        surfaceType: event.surfaceType ?? null,
        surfaceId: event.surfaceId ?? null,
        experimentContext: event.experimentContext ?? {},
        eventPayload: event.eventPayload ?? {},
        createdAt: new Date(),
      },
      metadata: { batched: true },
    };
  }

  /**
   * Record affiliate click attribution
   */
  async recordAffiliateClickAttribution(
    attribution: CreateClickAttributionInput
  ): Promise<CommercialResult<AffiliateClickAttribution>> {
    try {
      const { data, error } = await this.supabase
        .from('affiliate_click_attributions')
        .upsert(
          {
            session_id: attribution.sessionId,
            click_key: attribution.clickKey,
            platform: attribution.platform ?? 'public',
            voucher_id: attribution.voucherId,
            resolution_request_id: attribution.resolutionRequestId,
            source_surface_type: attribution.sourceSurfaceType,
            source_surface_id: attribution.sourceSurfaceId,
            attribution_payload: attribution.attributionPayload ?? {},
            clicked_at: attribution.clickedAt ?? new Date(),
          },
          { onConflict: 'click_key' }
        )
        .select()
        .single();

      if (error) {
        logger.error({
          msg: 'Failed to record click attribution',
          error: error.message,
          clickKey: attribution.clickKey,
        });
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.mapDbToClickAttribution(data),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error({
        msg: 'Error recording click attribution',
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Record downstream commercial outcome (conversion/revenue)
   */
  async recordDownstreamCommercialOutcome(
    outcome: CreateConversionReportInput
  ): Promise<CommercialResult<AffiliateConversionReport>> {
    try {
      const { data, error } = await this.supabase
        .from('affiliate_conversion_reports')
        .insert({
          platform: outcome.platform ?? 'shopee',
          external_conversion_id: outcome.externalConversionId,
          click_attribution_id: outcome.clickAttributionId,
          voucher_id: outcome.voucherId,
          reported_revenue: outcome.reportedRevenue,
          reported_commission: outcome.reportedCommission,
          conversion_status: outcome.conversionStatus ?? 'pending',
          conversion_time: outcome.conversionTime,
          report_payload: outcome.reportPayload ?? {},
        })
        .select()
        .single();

      if (error) {
        logger.error({
          msg: 'Failed to record downstream commercial outcome',
          error: error.message,
          externalConversionId: outcome.externalConversionId,
        });
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.mapDbToConversionReport(data),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error({
        msg: 'Error recording downstream commercial outcome',
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Flush event batch
   */
  async flush(): Promise<void> {
    if (this.eventBatch.length === 0) {
      return;
    }

    const batch = [...this.eventBatch];
    this.eventBatch = [];

    try {
      const records = batch.map((event) => ({
        session_id: event.sessionId,
        event_type: event.eventType,
        event_time: event.eventTime ?? new Date(),
        platform: event.platform ?? 'public',
        voucher_id: event.voucherId,
        resolution_request_id: event.resolutionRequestId,
        surface_type: event.surfaceType,
        surface_id: event.surfaceId,
        experiment_context: event.experimentContext ?? {},
        event_payload: event.eventPayload ?? {},
      }));

      const { error } = await this.supabase
        .from('affiliate_funnel_events')
        .upsert(records, { onConflict: 'id' });

      if (error) {
        logger.error({
          msg: 'Failed to flush event batch',
          error: error.message,
          batchSize: batch.length,
        });
      } else {
        logger.info({
          msg: 'Flushed event batch',
          batchSize: batch.length,
        });
      }
    } catch (err) {
      logger.error({
        msg: 'Error flushing event batch',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * Map database record to FunnelEvent
   */
  private mapDbToFunnelEvent(data: Record<string, unknown>): CommercialFunnelEvent {
    return {
      id: data.id as string,
      sessionId: data.session_id as string | null,
      eventType: data.event_type as CommercialFunnelEvent['eventType'],
      eventTime: new Date(data.event_time as string),
      platform: data.platform as CommercialFunnelEvent['platform'],
      voucherId: data.voucher_id as string | null,
      resolutionRequestId: data.resolution_request_id as string | null,
      surfaceType: data.surface_type as string | null,
      surfaceId: data.surface_id as string | null,
      experimentContext: data.experiment_context as Record<string, unknown> ?? {},
      eventPayload: data.event_payload as Record<string, unknown> ?? {},
      createdAt: new Date(data.created_at as string),
    };
  }

  /**
   * Map database record to ClickAttribution
   */
  private mapDbToClickAttribution(data: Record<string, unknown>): AffiliateClickAttribution {
    return {
      id: data.id as string,
      sessionId: data.session_id as string | null,
      clickKey: data.click_key as string,
      platform: data.platform as AffiliateClickAttribution['platform'],
      voucherId: data.voucher_id as string | null,
      resolutionRequestId: data.resolution_request_id as string | null,
      sourceSurfaceType: data.source_surface_type as string | null,
      sourceSurfaceId: data.source_surface_id as string | null,
      attributionPayload: data.attribution_payload as Record<string, unknown> ?? {},
      clickedAt: new Date(data.clicked_at as string),
      createdAt: new Date(data.created_at as string),
    };
  }

  /**
   * Map database record to ConversionReport
   */
  private mapDbToConversionReport(data: Record<string, unknown>): AffiliateConversionReport {
    return {
      id: data.id as string,
      platform: data.platform as string,
      externalConversionId: data.external_conversion_id as string | null,
      clickAttributionId: data.click_attribution_id as string | null,
      voucherId: data.voucher_id as string | null,
      reportedRevenue: data.reported_revenue as number | null,
      reportedCommission: data.reported_commission as number | null,
      conversionStatus: data.conversion_status as AffiliateConversionReport['conversionStatus'],
      conversionTime: data.conversion_time ? new Date(data.conversion_time as string) : null,
      reportPayload: data.report_payload as Record<string, unknown> ?? {},
      createdAt: new Date(data.created_at as string),
    };
  }
}

// ============================================================
// Factory Functions
// ============================================================

let eventRecorder: CommercialEventRecorder | null = null;

/**
 * Get singleton event recorder instance
 */
export function getCommercialEventRecorder(): CommercialEventRecorder {
  if (!eventRecorder) {
    eventRecorder = new CommercialEventRecorder();
  }
  return eventRecorder;
}

// ============================================================
// Direct Export Functions
// ============================================================

/**
 * Record commercial event (convenience function)
 */
export async function recordCommercialEvent(
  event: CreateFunnelEventInput
): Promise<CommercialResult<CommercialFunnelEvent>> {
  return getCommercialEventRecorder().recordCommercialEvent(event);
}

/**
 * Record funnel step (convenience function)
 */
export async function recordCommercialFunnelStep(
  event: CreateFunnelEventInput
): Promise<CommercialResult<CommercialFunnelEvent>> {
  return getCommercialEventRecorder().recordCommercialFunnelStep(event);
}

/**
 * Record affiliate click attribution (convenience function)
 */
export async function recordAffiliateClickAttribution(
  attribution: CreateClickAttributionInput
): Promise<CommercialResult<AffiliateClickAttribution>> {
  return getCommercialEventRecorder().recordAffiliateClickAttribution(attribution);
}

/**
 * Record downstream commercial outcome (convenience function)
 */
export async function recordDownstreamCommercialOutcome(
  outcome: CreateConversionReportInput
): Promise<CommercialResult<AffiliateConversionReport>> {
  return getCommercialEventRecorder().recordDownstreamCommercialOutcome(outcome);
}
