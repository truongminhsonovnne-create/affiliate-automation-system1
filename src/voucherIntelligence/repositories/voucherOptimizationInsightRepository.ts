/**
 * Voucher Optimization Insight Repository
 */

import { randomUUID } from 'crypto';
import { VoucherOptimizationInsight, VoucherOptimizationInsightType, VoucherOptimizationSeverity, InsightStatus } from '../types/index.js';

const insights = new Map<string, VoucherOptimizationInsight>();

export async function createInsight(params: {
  insightType: VoucherOptimizationInsightType;
  severity: VoucherOptimizationSeverity;
  insightPayload: Record<string, unknown>;
  status?: InsightStatus;
  priorityScore?: number;
  metadata?: Record<string, unknown>;
}): Promise<VoucherOptimizationInsight> {
  const insight: VoucherOptimizationInsight = {
    id: randomUUID(),
    insightType: params.insightType,
    severity: params.severity,
    insightPayload: params.insightPayload,
    status: params.status || InsightStatus.OPEN,
    priorityScore: params.priorityScore,
    metadata: params.metadata,
    createdAt: new Date(),
  };
  insights.set(insight.id, insight);
  return insight;
}

export async function getInsightById(id: string): Promise<VoucherOptimizationInsight | null> {
  return insights.get(id) || null;
}

export async function getInsightsByStatus(status: InsightStatus): Promise<VoucherOptimizationInsight[]> {
  return Array.from(insights.values()).filter(i => i.status === status);
}

export async function getInsightsByType(type: VoucherOptimizationInsightType): Promise<VoucherOptimizationInsight[]> {
  return Array.from(insights.values()).filter(i => i.insightType === type);
}

export async function getInsightsBySeverity(severity: VoucherOptimizationSeverity): Promise<VoucherOptimizationInsight[]> {
  return Array.from(insights.values()).filter(i => i.severity === severity);
}

export async function getOpenInsights(): Promise<VoucherOptimizationInsight[]> {
  return getInsightsByStatus(InsightStatus.OPEN);
}

export async function updateInsightStatus(
  id: string,
  status: InsightStatus,
  resolvedBy?: string,
  resolutionNotes?: string
): Promise<VoucherOptimizationInsight | null> {
  const insight = insights.get(id);
  if (!insight) return null;

  insight.status = status;
  if (status === InsightStatus.RESOLVED) {
    insight.resolvedAt = new Date();
    insight.resolvedBy = resolvedBy;
    insight.resolutionNotes = resolutionNotes;
  }

  insights.set(id, insight);
  return insight;
}

export async function deleteInsight(id: string): Promise<boolean> {
  return insights.delete(id);
}
