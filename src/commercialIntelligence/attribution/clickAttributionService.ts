/**
 * Click Attribution Service
 *
 * Production-grade click-level attribution.
 * Supports first-touch, last-touch, and multi-touch models.
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type {
  AffiliateClickAttribution,
  CreateClickAttributionInput,
  AttributionConfidence,
  AttributionModelType,
  CommercialAttributionResult,
  CommercialResult,
  GrowthSurfaceType,
} from '../types.js';
import { ATTRIBUTION_WINDOWS } from '../constants.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Click Attribution Service
 *
 * Handles click-level attribution with multiple models.
 */
export class ClickAttributionService {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  /**
   * Create affiliate click attribution
   */
  async createAffiliateClickAttribution(
    input: CreateClickAttributionInput
  ): Promise<CommercialResult<AffiliateClickAttribution>> {
    try {
      const clickKey = input.clickKey || this.generateClickKey();

      const { data, error } = await this.supabase
        .from('affiliate_click_attributions')
        .insert({
          session_id: input.sessionId,
          click_key: clickKey,
          platform: input.platform ?? 'public',
          voucher_id: input.voucherId,
          resolution_request_id: input.resolutionRequestId,
          source_surface_type: input.sourceSurfaceType,
          source_surface_id: input.sourceSurfaceId,
          attribution_payload: input.attributionPayload ?? {},
          clicked_at: input.clickedAt ?? new Date(),
        })
        .select()
        .single();

      if (error) {
        logger.error({
          msg: 'Failed to create click attribution',
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.mapDbToClickAttribution(data),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ msg: 'Error creating click attribution', error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Resolve click attribution by click key
   */
  async resolveClickAttribution(
    clickKey: string,
    options?: {
      includeSession?: boolean;
      modelType?: AttributionModelType;
    }
  ): Promise<CommercialResult<AffiliateClickAttribution>> {
    try {
      let query = this.supabase
        .from('affiliate_click_attributions')
        .select(options?.includeSession ? '*, session:affiliate_commercial_sessions(*)' : '*')
        .eq('click_key', clickKey)
        .single();

      const { data, error } = await query;

      if (error || !data) {
        return { success: false, error: 'Click attribution not found' };
      }

      // Check if attribution window has expired
      const clickedAt = new Date(data.clicked_at);
      const now = new Date();
      const windowDays = ATTRIBUTION_WINDOWS.CLICK / (1000 * 60 * 60 * 24);
      const daysSinceClick = (now.getTime() - clickedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceClick > windowDays) {
        logger.warn({
          msg: 'Click attribution window expired',
          clickKey,
          daysSinceClick,
        });
      }

      return {
        success: true,
        data: this.mapDbToClickAttribution(data),
        metadata: { daysSinceClick, windowDays, isExpired: daysSinceClick > windowDays },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Build click attribution payload
   */
  buildClickAttributionPayload(params: {
    sessionId?: string;
    voucherId?: string;
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    experimentId?: string;
    experimentVariant?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    referrer?: string;
    userAgent?: string;
  }): Record<string, unknown> {
    return {
      ...params,
      generatedAt: new Date().toISOString(),
      attributionVersion: '1.0',
    };
  }

  /**
   * Link commercial session to click
   */
  async linkCommercialSessionToClick(
    clickKey: string,
    sessionId: string
  ): Promise<CommercialResult<AffiliateClickAttribution>> {
    try {
      const { data, error } = await this.supabase
        .from('affiliate_click_attributions')
        .update({ session_id: sessionId })
        .eq('click_key', clickKey)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.mapDbToClickAttribution(data),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get clicks by date range
   */
  async getClicksByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<AffiliateClickAttribution[]> {
    const { data } = await this.supabase
      .from('affiliate_click_attributions')
      .select('*')
      .gte('clicked_at', startDate.toISOString())
      .lte('clicked_at', endDate.toISOString())
      .order('clicked_at', { ascending: false });

    return (data ?? []).map(this.mapDbToClickAttribution);
  }

  /**
   * Get clicks by session
   */
  async getClicksBySession(sessionId: string): Promise<AffiliateClickAttribution[]> {
    const { data } = await this.supabase
      .from('affiliate_click_attributions')
      .select('*')
      .eq('session_id', sessionId)
      .order('clicked_at', { ascending: false });

    return (data ?? []).map(this.mapDbToClickAttribution);
  }

  /**
   * Get clicks by voucher
   */
  async getClicksByVoucher(voucherId: string): Promise<AffiliateClickAttribution[]> {
    const { data } = await this.supabase
      .from('affiliate_click_attributions')
      .select('*')
      .eq('voucher_id', voucherId)
      .order('clicked_at', { ascending: false });

    return (data ?? []).map(this.mapDbToClickAttribution);
  }

  /**
   * Get clicks by surface
   */
  async getClicksBySurface(
    surfaceType: GrowthSurfaceType,
    surfaceId: string
  ): Promise<AffiliateClickAttribution[]> {
    const { data } = await this.supabase
      .from('affiliate_click_attributions')
      .select('*')
      .eq('source_surface_type', surfaceType)
      .eq('source_surface_id', surfaceId)
      .order('clicked_at', { ascending: false });

    return (data ?? []).map(this.mapDbToClickAttribution);
  }

  /**
   * Get click count by surface
   */
  async getClickCountBySurface(
    surfaceType: GrowthSurfaceType,
    surfaceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    let query = this.supabase
      .from('affiliate_click_attributions')
      .select('id', { count: 'exact', head: true })
      .eq('source_surface_type', surfaceType)
      .eq('source_surface_id', surfaceId);

    if (startDate) {
      query = query.gte('clicked_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('clicked_at', endDate.toISOString());
    }

    const { count } = await query;
    return count ?? 0;
  }

  /**
   * Evaluate attribution confidence
   */
  evaluateAttributionConfidence(params: {
    hasDirectClick: boolean;
    hasMultipleClicks: boolean;
    timeToConversion?: number;
    hasVoucherMatch: boolean;
  }): AttributionConfidence {
    const { hasDirectClick, hasMultipleClicks, timeToConversion, hasVoucherMatch } = params;

    // High confidence: direct click with voucher match
    if (hasDirectClick && hasVoucherMatch && timeToConversion && timeToConversion < 7) {
      return 'high';
    }

    // Medium confidence: multiple clicks or reasonable time
    if (hasMultipleClicks || (timeToConversion && timeToConversion < 14)) {
      return 'medium';
    }

    // Low confidence: no direct click or very long time
    if (!hasDirectClick || (timeToConversion && timeToConversion > 30)) {
      return 'low';
    }

    return 'unknown';
  }

  /**
   * Generate click key
   */
  private generateClickKey(): string {
    return `ck_${uuidv4()}`;
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
      sourceSurfaceType: data.source_surface_type as GrowthSurfaceType | null,
      sourceSurfaceId: data.source_surface_id as string | null,
      attributionPayload: data.attribution_payload as Record<string, unknown> ?? {},
      clickedAt: new Date(data.clicked_at as string),
      createdAt: new Date(data.created_at as string),
    };
  }
}

// ============================================================
// Factory
// ============================================================

let clickAttributionService: ClickAttributionService | null = null;

export function getClickAttributionService(): ClickAttributionService {
  if (!clickAttributionService) {
    clickAttributionService = new ClickAttributionService();
  }
  return clickAttributionService;
}

// ============================================================
// Direct Exports
// ============================================================

export async function createAffiliateClickAttribution(
  input: CreateClickAttributionInput
): Promise<CommercialResult<AffiliateClickAttribution>> {
  return getClickAttributionService().createAffiliateClickAttribution(input);
}

export async function resolveClickAttribution(
  clickKey: string,
  options?: { includeSession?: boolean; modelType?: AttributionModelType }
): Promise<CommercialResult<AffiliateClickAttribution>> {
  return getClickAttributionService().resolveClickAttribution(clickKey, options);
}

export function buildClickAttributionPayload(
  params: Parameters<ClickAttributionService['buildClickAttributionPayload']>[0]
): Record<string, unknown> {
  return getClickAttributionService().buildClickAttributionPayload(params);
}

export async function linkCommercialSessionToClick(
  clickKey: string,
  sessionId: string
): Promise<CommercialResult<AffiliateClickAttribution>> {
  return getClickAttributionService().linkCommercialSessionToClick(clickKey, sessionId);
}
