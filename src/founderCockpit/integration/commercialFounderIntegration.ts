/**
 * Commercial Founder Integration
 *
 * Integrates commercial intelligence signals into founder cockpit.
 */

import type { RevenueQualityBalance } from '../../commercialIntelligence/types.js';

export interface CommercialFounderSignal {
  revenue: number;
  commission: number;
  roi: number;
  revenueQualityScore: number;
  conversionRate: number;
  topPerformingVouchers: string[];
  atRiskVouchers: string[];
}

export interface FounderCommercialRisk {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedEntities: string[];
  recommendation: string;
}

/**
 * Collect commercial signals from commercial intelligence layer
 */
export async function collectFounderCommercialSignals(): Promise<CommercialFounderSignal> {
  // In production, this would call the commercial intelligence service
  // For now, returning mock data structure
  return {
    revenue: 50000,
    commission: 5000,
    roi: 2.5,
    revenueQualityScore: 0.75,
    conversionRate: 0.08,
    topPerformingVouchers: ['VCHR-001', 'VCHR-002', 'VCHR-003'],
    atRiskVouchers: ['VCHR-045', 'VCHR-078'],
  };
}

/**
 * Build revenue-quality summary for founder view
 */
export async function buildFounderRevenueQualitySummary(): Promise<{
  overallScore: number;
  trend: 'improving' | 'stable' | 'declining';
  keyInsights: string[];
  revenueQualityBalance: RevenueQualityBalance | null;
}> {
  const signals = await collectFounderCommercialSignals();

  return {
    overallScore: signals.revenueQualityScore,
    trend: 'improving',
    keyInsights: [
      `Revenue at ${signals.revenue.toLocaleString()} with ${signals.roi}x ROI`,
      `${signals.topPerformingVouchers.length} top performers driving results`,
      `${signals.atRiskVouchers.length} vouchers require attention`,
    ],
    revenueQualityBalance: null,
  };
}

/**
 * Build commercial risks summary for founder
 */
export async function buildFounderCommercialRisks(): Promise<FounderCommercialRisk[]> {
  const signals = await collectFounderCommercialSignals();
  const risks: FounderCommercialRisk[] = [];

  if (signals.revenueQualityScore < 0.6) {
    risks.push({
      category: 'revenue_quality',
      severity: 'high',
      description: 'Revenue-quality balance below acceptable threshold',
      affectedEntities: signals.atRiskVouchers,
      recommendation: 'Review at-risk vouchers and quality metrics',
    });
  }

  if (signals.roi < 1.5) {
    risks.push({
      category: 'roi',
      severity: 'critical',
      description: 'ROI below break-even threshold',
      affectedEntities: [],
      recommendation: 'Immediate review of commission structure and voucher selection',
    });
  }

  return risks;
}

/**
 * Get commercial trend summary
 */
export async function getCommercialTrendSummary(): Promise<{
  revenue: { current: number; previous: number; changePercent: number };
  commission: { current: number; previous: number; changePercent: number };
  conversionRate: { current: number; previous: number; changePercent: number };
}> {
  // Mock data - in production would calculate from actual data
  return {
    revenue: { current: 50000, previous: 45000, changePercent: 11.1 },
    commission: { current: 5000, previous: 4500, changePercent: 11.1 },
    conversionRate: { current: 0.08, previous: 0.075, changePercent: 6.7 },
  };
}
