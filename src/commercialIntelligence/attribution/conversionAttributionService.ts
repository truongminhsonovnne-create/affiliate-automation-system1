/**
 * Conversion Attribution Service
 *
 * Production-grade conversion/revenue attribution.
 * Supports voucher-level, surface-level, and resolution-level attribution.
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type {
  AffiliateConversionReport,
  CreateConversionReportInput,
  AffiliateClickAttribution,
  RevenueAttribution,
  CommercialAttributionResult,
  AttributionConfidence,
  AttributionModelType,
  CommercialResult,
  GrowthSurfaceType,
} from '../types.js';
import { ATTRIBUTION_WINDOWS, DEFAULT_ATTRIBUTION_CONFIG } from '../constants.js';
import { logger } from '../../utils/logger.js';

/**
 * Conversion Attribution Service
 *
 * Handles conversion and revenue attribution with confidence scoring.
 */
export class ConversionAttributionService {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  /**
   * Attribute conversion report to source
   */
  async attributeConversionReport(
    conversion: CreateConversionReportInput
  ): Promise<CommercialResult<AffiliateConversionReport>> {
    try {
      // Try to link to existing click attribution
      let clickAttributionId: string | null = null;

      if (conversion.clickAttributionId) {
        clickAttributionId = conversion.clickAttributionId;
      } else if (conversion.externalConversionId) {
        // Try to find by external conversion ID
        const existing = await this.findConversionByExternalId(conversion.externalConversionId);
        if (existing) {
          return {
            success: true,
            data: existing,
            metadata: { duplicate: true },
          };
        }
      }

      const { data, error } = await this.supabase
        .from('affiliate_conversion_reports')
        .insert({
          platform: conversion.platform ?? 'shopee',
          external_conversion_id: conversion.externalConversionId,
          click_attribution_id: clickAttributionId,
          voucher_id: conversion.voucherId,
          reported_revenue: conversion.reportedRevenue,
          reported_commission: conversion.reportedCommission,
          conversion_status: conversion.conversionStatus ?? 'pending',
          conversion_time: conversion.conversionTime,
          report_payload: conversion.reportPayload ?? {},
        })
        .select()
        .single();

      if (error) {
        logger.error({
          msg: 'Failed to attribute conversion report',
          error: error.message,
          externalConversionId: conversion.externalConversionId,
        });
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.mapDbToConversionReport(data),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ msg: 'Error attributing conversion report', error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Attribute revenue to voucher flow
   */
  async attributeRevenueToVoucherFlow(
    voucherId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      modelType?: AttributionModelType;
    }
  ): Promise<CommercialResult<RevenueAttribution>> {
    try {
      // Get conversions for this voucher
      const conversions = await this.getConversionsByVoucher(voucherId, options?.startDate, options?.endDate);

      // Get clicks for this voucher
      const clicks = await this.getClicksByVoucher(voucherId, options?.startDate, options?.endDate);

      // Calculate attribution
      const totalRevenue = conversions.reduce((sum, c) => sum + (c.reportedRevenue ?? 0), 0);
      const totalCommission = conversions.reduce((sum, c) => sum + (c.reportedCommission ?? 0), 0);

      // Calculate attribution score based on conversion rate
      const attributionScore = clicks.length > 0
        ? Math.min(conversions.length / clicks.length, 1)
        : 0;

      const result: RevenueAttribution = {
        totalRevenue,
        totalCommission,
        voucherContribution: totalRevenue,
        surfaceContribution: 0, // Would need surface lookup
        experimentContribution: null,
        attributionScore,
      };

      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Build conversion attribution result
   */
  buildConversionAttributionResult(params: {
    conversion: AffiliateConversionReport;
    click?: AffiliateClickAttribution;
    modelType?: AttributionModelType;
  }): CommercialAttributionResult {
    const { conversion, click, modelType = 'last_touch' } = params;

    // Calculate confidence based on data availability
    const confidence = this.resolveAttributionConfidence({
      hasClickAttribution: !!click,
      hasVoucherMatch: !!conversion.voucherId,
      hasExternalId: !!conversion.externalConversionId,
      conversionTime: conversion.conversionTime,
      clickTime: click?.clickedAt,
    });

    // Build explanation
    const explanation = this.buildAttributionExplanation({
      modelType,
      hasClick: !!click,
      hasVoucher: !!conversion.voucherId,
      confidence,
    });

    // Build assumptions
    const assumptions = this.buildAttributionAssumptions({
      modelType,
      hasClick: !!click,
    });

    return {
      attributionId: conversion.id,
      clickKey: click?.clickKey ?? 'unknown',
      confidence,
      attributedVoucherId: conversion.voucherId,
      attributedSurfaceType: click?.sourceSurfaceType as GrowthSurfaceType | null,
      attributedSurfaceId: click?.sourceSurfaceId ?? null,
      attributionModel: modelType,
      revenueAttribution: {
        totalRevenue: conversion.reportedRevenue ?? 0,
        totalCommission: conversion.reportedCommission ?? 0,
        voucherContribution: conversion.reportedRevenue ?? 0,
        surfaceContribution: 0,
        experimentContribution: null,
        attributionScore: confidence === 'high' ? 0.9 : confidence === 'medium' ? 0.6 : 0.3,
      },
      attributionWindowDays: DEFAULT_ATTRIBUTION_CONFIG.attributionClickWindowDays,
      explanation,
      assumptions,
    };
  }

  /**
   * Resolve attribution confidence
   */
  resolveAttributionConfidence(params: {
    hasClickAttribution: boolean;
    hasVoucherMatch: boolean;
    hasExternalId: boolean;
    conversionTime?: Date | null;
    clickTime?: Date;
  }): AttributionConfidence {
    const { hasClickAttribution, hasVoucherMatch, hasExternalId, conversionTime, clickTime } = params;

    // High confidence: has click + voucher match + external ID
    if (hasClickAttribution && hasVoucherMatch && hasExternalId) {
      // Check time proximity
      if (conversionTime && clickTime) {
        const daysDiff = (conversionTime.getTime() - clickTime.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff <= ATTRIBUTION_WINDOWS.CLICK / (1000 * 60 * 60 * 24)) {
          return 'high';
        }
      }
      return 'high';
    }

    // Medium confidence: has click or voucher match
    if (hasClickAttribution || hasVoucherMatch) {
      return 'medium';
    }

    // Low confidence: has external ID only
    if (hasExternalId) {
      return 'low';
    }

    return 'unknown';
  }

  /**
   * Get conversions by voucher
   */
  async getConversionsByVoucher(
    voucherId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AffiliateConversionReport[]> {
    let query = this.supabase
      .from('affiliate_conversion_reports')
      .select('*')
      .eq('voucher_id', voucherId)
      .eq('conversion_status', 'confirmed');

    if (startDate) {
      query = query.gte('conversion_time', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('conversion_time', endDate.toISOString());
    }

    const { data } = await query.order('conversion_time', { ascending: false });
    return (data ?? []).map(this.mapDbToConversionReport);
  }

  /**
   * Get conversions by surface
   */
  async getConversionsBySurface(
    surfaceType: GrowthSurfaceType,
    surfaceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AffiliateConversionReport[]> {
    // First get clicks for this surface
    const { data: clicks } = await this.supabase
      .from('affiliate_click_attributions')
      .select('id')
      .eq('source_surface_type', surfaceType)
      .eq('source_surface_id', surfaceId);

    if (!clicks || clicks.length === 0) {
      return [];
    }

    const clickIds = clicks.map(c => c.id);

    // Then get conversions for those clicks
    let query = this.supabase
      .from('affiliate_conversion_reports')
      .select('*')
      .in('click_attribution_id', clickIds)
      .eq('conversion_status', 'confirmed');

    if (startDate) {
      query = query.gte('conversion_time', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('conversion_time', endDate.toISOString());
    }

    const { data } = await query.order('conversion_time', { ascending: false });
    return (data ?? []).map(this.mapDbToConversionReport);
  }

  /**
   * Get confirmed conversions by date range
   */
  async getConfirmedConversions(
    startDate: Date,
    endDate: Date
  ): Promise<AffiliateConversionReport[]> {
    const { data } = await this.supabase
      .from('affiliate_conversion_reports')
      .select('*')
      .eq('conversion_status', 'confirmed')
      .gte('conversion_time', startDate.toISOString())
      .lte('conversion_time', endDate.toISOString())
      .order('conversion_time', { ascending: false });

    return (data ?? []).map(this.mapDbToConversionReport);
  }

  /**
   * Get conversion by external ID
   */
  async findConversionByExternalId(externalId: string): Promise<AffiliateConversionReport | null> {
    const { data } = await this.supabase
      .from('affiliate_conversion_reports')
      .select('*')
      .eq('external_conversion_id', externalId)
      .single();

    return data ? this.mapDbToConversionReport(data) : null;
  }

  /**
   * Get clicks by voucher
   */
  async getClicksByVoucher(
    voucherId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AffiliateClickAttribution[]> {
    let query = this.supabase
      .from('affiliate_click_attributions')
      .select('*')
      .eq('voucher_id', voucherId);

    if (startDate) {
      query = query.gte('clicked_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('clicked_at', endDate.toISOString());
    }

    const { data } = await query.order('clicked_at', { ascending: false });
    return (data ?? []).map(this.mapDbToClickAttribution);
  }

  /**
   * Get total revenue by voucher
   */
  async getTotalRevenueByVoucher(
    voucherId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ revenue: number; commission: number; conversions: number }> {
    const conversions = await this.getConversionsByVoucher(voucherId, startDate, endDate);

    return {
      revenue: conversions.reduce((sum, c) => sum + (c.reportedRevenue ?? 0), 0),
      commission: conversions.reduce((sum, c) => sum + (c.reportedCommission ?? 0), 0),
      conversions: conversions.length,
    };
  }

  /**
   * Get total revenue by surface
   */
  async getTotalRevenueBySurface(
    surfaceType: GrowthSurfaceType,
    surfaceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ revenue: number; commission: number; conversions: number }> {
    const conversions = await this.getConversionsBySurface(surfaceType, surfaceId, startDate, endDate);

    return {
      revenue: conversions.reduce((sum, c) => sum + (c.reportedRevenue ?? 0), 0),
      commission: conversions.reduce((sum, c) => sum + (c.reportedCommission ?? 0), 0),
      conversions: conversions.length,
    };
  }

  /**
   * Build attribution explanation
   */
  private buildAttributionExplanation(params: {
    modelType: AttributionModelType;
    hasClick: boolean;
    hasVoucher: boolean;
    confidence: AttributionConfidence;
  }): string {
    const { modelType, hasClick, hasVoucher, confidence } = params;

    let explanation = `Attribution model: ${modelType}. `;

    if (!hasClick && !hasVoucher) {
      explanation += 'No direct click or voucher match found. Attribution is inferred.';
    } else if (hasClick && hasVoucher) {
      explanation += 'Direct click with voucher match found.';
    } else if (hasClick) {
      explanation += 'Click attribution found but no voucher match.';
    } else if (hasVoucher) {
      explanation += 'Voucher match found but no click attribution.';
    }

    explanation += ` Confidence: ${confidence}.`;

    return explanation;
  }

  /**
   * Build attribution assumptions
   */
  private buildAttributionAssumptions(params: {
    modelType: AttributionModelType;
    hasClick: boolean;
  }): string[] {
    const { modelType, hasClick } = params;

    const assumptions = [
      `Attribution model: ${modelType}`,
      'Attribution window: 7 days from click',
    ];

    if (!hasClick) {
      assumptions.push('No direct click tracking - using inferred attribution');
    }

    return assumptions;
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

let conversionAttributionService: ConversionAttributionService | null = null;

export function getConversionAttributionService(): ConversionAttributionService {
  if (!conversionAttributionService) {
    conversionAttributionService = new ConversionAttributionService();
  }
  return conversionAttributionService;
}

// ============================================================
// Direct Exports
// ============================================================

export async function attributeConversionReport(
  conversion: CreateConversionReportInput
): Promise<CommercialResult<AffiliateConversionReport>> {
  return getConversionAttributionService().attributeConversionReport(conversion);
}

export async function attributeRevenueToVoucherFlow(
  voucherId: string,
  options?: { startDate?: Date; endDate?: Date; modelType?: AttributionModelType }
): Promise<CommercialResult<RevenueAttribution>> {
  return getConversionAttributionService().attributeRevenueToVoucherFlow(voucherId, options);
}

export function buildConversionAttributionResult(
  params: Parameters<ConversionAttributionService['buildConversionAttributionResult']>[0]
): CommercialAttributionResult {
  return getConversionAttributionService().buildConversionAttributionResult(params);
}

export function resolveAttributionConfidence(
  params: Parameters<ConversionAttributionService['resolveAttributionConfidence']>[0]
): AttributionConfidence {
  return getConversionAttributionService().resolveAttributionConfidence(params);
}
