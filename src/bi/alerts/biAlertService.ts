/**
 * BI Alert Service
 */

import type { BiAlertSignal, BiAlertType, BiAlertSeverity } from '../types.js';
import { ALERT_THRESHOLDS } from '../constants.js';

export class BiAlertService {
  async detectBiAlerts(metrics: Record<string, number>): Promise<BiAlertSignal[]> {
    const alerts: BiAlertSignal[] = [];

    // Check no-match rate
    const noMatchRate = metrics['no_match_rate'] ?? 0;
    if (noMatchRate > ALERT_THRESHOLDS.NO_MATCH_RATE.CRITICAL) {
      alerts.push(this.buildBiAlertSignal('threshold_breach', 'critical', 'quality', 'No-match rate critical', { value: noMatchRate }));
    } else if (noMatchRate > ALERT_THRESHOLDS.NO_MATCH_RATE.WARNING) {
      alerts.push(this.buildBiAlertSignal('threshold_breach', 'warning', 'quality', 'No-match rate warning', { value: noMatchRate }));
    }

    // Check quality score
    const qualityScore = metrics['quality_score'] ?? 1;
    if (qualityScore < ALERT_THRESHOLDS.QUALITY_SCORE.CRITICAL) {
      alerts.push(this.buildBiAlertSignal('metric_anomaly', 'critical', 'quality', 'Quality score critical', { value: qualityScore }));
    } else if (qualityScore < ALERT_THRESHOLDS.QUALITY_SCORE.WARNING) {
      alerts.push(this.buildBiAlertSignal('metric_anomaly', 'warning', 'quality', 'Quality score warning', { value: qualityScore }));
    }

    return alerts;
  }

  buildBiAlertSignal(
    type: BiAlertType,
    severity: BiAlertSeverity,
    sourceArea: string,
    description: string,
    payload: Record<string, unknown> = {}
  ): BiAlertSignal {
    return {
      id: '',
      type,
      severity,
      sourceArea,
      targetEntityType: null,
      targetEntityId: null,
      payload: { description, ...payload },
      createdAt: new Date(),
    };
  }
}

let service: BiAlertService | null = null;
export function getBiAlertService(): BiAlertService {
  if (!service) service = new BiAlertService();
  return service;
}

export async function detectBiAlerts(metrics: Record<string, number>): Promise<BiAlertSignal[]> {
  return getBiAlertService().detectBiAlerts(metrics);
}
