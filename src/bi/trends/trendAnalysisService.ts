/**
 * Trend Analysis Service
 */

import type { BiTrendSeries, BiTrendPoint } from '../types.js';
import { TREND_THRESHOLDS } from '../constants.js';

export class TrendAnalysisService {
  buildBiTrendSeries(metric: string, points: BiTrendPoint[]): BiTrendSeries {
    const trend = this.calculateTrend(points);
    const volatility = this.calculateVolatility(points);

    return { metric, points, trend, volatility };
  }

  private calculateTrend(points: BiTrendPoint[]): 'up' | 'down' | 'stable' {
    if (points.length < 2) return 'stable';
    const recent = points.slice(-Math.min(5, points.length));
    const avg = recent.reduce((sum, p) => sum + p.value, 0) / recent.length;
    const first = points[0].value;
    const change = (avg - first) / (first || 1);

    if (change > TREND_THRESHOLDS.SIGNIFICANT_CHANGE) return 'up';
    if (change < -TREND_THRESHOLDS.SIGNIFICANT_CHANGE) return 'down';
    return 'stable';
  }

  private calculateVolatility(points: BiTrendPoint[]): 'low' | 'medium' | 'high' {
    if (points.length < 2) return 'low';
    const values = points.map(p => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / (mean || 1);

    if (cv < 0.1) return 'low';
    if (cv < 0.3) return 'medium';
    return 'high';
  }
}

let service: TrendAnalysisService | null = null;
export function getTrendAnalysisService(): TrendAnalysisService {
  if (!service) service = new TrendAnalysisService();
  return service;
}

export function buildBiTrendSeries(metric: string, points: BiTrendPoint[]): BiTrendSeries {
  return getTrendAnalysisService().buildBiTrendSeries(metric, points);
}
