/**
 * Conversion Report Repository
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type { AffiliateConversionReport, CreateConversionReportInput, CommercialResult } from '../types.js';

export class ConversionReportRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  async create(input: CreateConversionReportInput): Promise<CommercialResult<AffiliateConversionReport>> {
    try {
      const { data, error } = await this.supabase
        .from('affiliate_conversion_reports')
        .insert({
          platform: input.platform ?? 'shopee',
          external_conversion_id: input.externalConversionId,
          click_attribution_id: input.clickAttributionId,
          voucher_id: input.voucherId,
          reported_revenue: input.reportedRevenue,
          reported_commission: input.reportedCommission,
          conversion_status: input.conversionStatus ?? 'pending',
          conversion_time: input.conversionTime,
          report_payload: input.reportPayload ?? {},
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data: this.mapToDomain(data) };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async findByExternalId(externalId: string): Promise<AffiliateConversionReport | null> {
    const { data } = await this.supabase
      .from('affiliate_conversion_reports')
      .select('*')
      .eq('external_conversion_id', externalId)
      .single();
    return data ? this.mapToDomain(data) : null;
  }

  async findByClickAttributionId(clickAttributionId: string): Promise<AffiliateConversionReport[]> {
    const { data } = await this.supabase
      .from('affiliate_conversion_reports')
      .select('*')
      .eq('click_attribution_id', clickAttributionId)
      .order('conversion_time', { ascending: false });
    return (data ?? []).map(this.mapToDomain);
  }

  async findByStatus(status: string): Promise<AffiliateConversionReport[]> {
    const { data } = await this.supabase
      .from('affiliate_conversion_reports')
      .select('*')
      .eq('conversion_status', status)
      .order('conversion_time', { ascending: false });
    return (data ?? []).map(this.mapToDomain);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<AffiliateConversionReport[]> {
    const { data } = await this.supabase
      .from('affiliate_conversion_reports')
      .select('*')
      .gte('conversion_time', startDate.toISOString())
      .lte('conversion_time', endDate.toISOString())
      .order('conversion_time', { ascending: false });
    return (data ?? []).map(this.mapToDomain);
  }

  async updateStatus(id: string, status: string): Promise<CommercialResult<AffiliateConversionReport>> {
    try {
      const { data, error } = await this.supabase
        .from('affiliate_conversion_reports')
        .update({ conversion_status: status })
        .eq('id', id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data: this.mapToDomain(data) };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  private mapToDomain(data: Record<string, unknown>): AffiliateConversionReport {
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

let repo: ConversionReportRepository | null = null;
export function getConversionReportRepository(): ConversionReportRepository {
  if (!repo) repo = new ConversionReportRepository();
  return repo;
}
