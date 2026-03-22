/**
 * Founder Cockpit API Serializers
 *
 * Serializes domain models to DTOs for API responses.
 */

import type {
  FounderCockpitSnapshot,
  FounderDecisionItem,
  WeeklyOperatingReview,
  StrategicReviewPack,
  OperatingFollowupRecord,
} from '../types.js';
import type {
  FounderCockpitDto,
  FounderDecisionItemDto,
  WeeklyOperatingReviewDto,
  StrategicReviewPackDto,
  FounderFollowupDto,
  FounderFollowupBacklogDto,
  FounderHealthDto,
} from './types.js';

/**
 * Serialize FounderCockpitSnapshot to DTO
 */
export function serializeCockpit(snapshot: FounderCockpitSnapshot): FounderCockpitDto {
  return {
    id: snapshot.id,
    snapshotWindow: {
      start: snapshot.period.start.toISOString(),
      end: snapshot.period.end.toISOString(),
    },
    snapshotType: snapshot.snapshotType,
    overallHealth: snapshot.overallHealth,
    healthScore: snapshot.healthScore,
    sections: snapshot.sections.map(serializeSection),
    topRisks: snapshot.topRisks.map(serializeRisk),
    topWins: snapshot.topWins,
    decisionsSummary: snapshot.decisionsSummary,
    followupsSummary: snapshot.followupsSummary,
    createdAt: snapshot.createdAt.toISOString(),
  };
}

/**
 * Serialize section to DTO
 */
function serializeSection(section: FounderCockpitSnapshot['sections'][0]) {
  return {
    type: section.type,
    name: section.name,
    healthStatus: section.healthStatus,
    score: section.score,
    metrics: section.metrics.map(m => ({
      key: m.key,
      name: m.name,
      value: m.value,
      unit: m.unit,
      changePercent: m.changePercent,
      trend: m.trend,
    })),
    insights: section.insights,
    trend: section.trend,
  };
}

/**
 * Serialize risk to DTO
 */
function serializeRisk(risk: FounderCockpitSnapshot['topRisks'][0]) {
  return {
    category: risk.category,
    severity: risk.severity,
    title: risk.title,
    description: risk.description,
    affectedEntities: risk.affectedEntities,
    recommendation: risk.recommendation,
    createdAt: risk.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

/**
 * Serialize FounderDecisionItem to DTO
 */
export function serializeDecisionItem(item: FounderDecisionItem): FounderDecisionItemDto {
  return {
    id: item.id,
    decisionArea: item.decisionArea,
    severity: item.severity,
    status: item.status,
    title: item.title,
    summary: item.summary,
    evidence: {
      metrics: item.evidence.metrics.map(m => ({
        key: m.key,
        value: m.value,
        threshold: m.threshold,
        direction: m.direction,
      })),
      context: item.evidence.context,
    },
    recommendation: {
      action: item.recommendation.action,
      confidence: item.recommendation.confidence,
      tradeoffs: item.recommendation.tradeoffs.map(t => ({
        factor: t.factor,
        impact: t.impact,
        description: t.description,
      })),
      nextSteps: item.recommendation.nextSteps,
    },
    targetEntity: item.targetEntity
      ? {
          type: item.targetEntity.type,
          id: item.targetEntity.id,
        }
      : null,
    createdAt: item.createdAt.toISOString(),
    resolvedAt: item.resolvedAt?.toISOString() ?? null,
  };
}

/**
 * Serialize decision list to DTO with summary
 */
export function serializeDecisionQueue(
  decisions: FounderDecisionItem[]
): { decisions: FounderDecisionItemDto[]; summary: Record<string, number> } {
  return {
    decisions: decisions.map(serializeDecisionItem),
    summary: {
      total: decisions.length,
      pending: decisions.filter(d => d.status === 'pending').length,
      resolved: decisions.filter(d => d.status === 'resolved').length,
      bySeverity: decisions.reduce(
        (acc, d) => {
          acc[d.severity] = (acc[d.severity] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      byArea: decisions.reduce(
        (acc, d) => {
          acc[d.decisionArea] = (acc[d.decisionArea] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    },
  };
}

/**
 * Serialize WeeklyOperatingReview to DTO
 */
export function serializeWeeklyReview(review: WeeklyOperatingReview): WeeklyOperatingReviewDto {
  return {
    id: review.id,
    reviewKey: review.reviewKey,
    period: {
      start: review.period.start.toISOString(),
      end: review.period.end.toISOString(),
    },
    status: review.status,
    summary: {
      overallHealth: review.summary.overallHealth,
      healthScore: review.summary.overallScore,
      keyChanges: review.summary.keyChanges,
      riskAreas: review.summary.riskAreas,
      winAreas: review.summary.winAreas,
    },
    blockers: review.blockers.map(b => ({
      id: b.id,
      category: b.category,
      severity: b.severity,
      title: b.title,
      description: b.description,
      affectedEntity: b.affectedEntity ?? null,
      recommendation: b.recommendation,
      createdAt: b.createdAt.toISOString(),
    })),
    priorities: review.priorities.map(p => ({
      id: p.id,
      title: p.title,
      category: p.category,
      priority: p.priority,
      dueDate: p.dueAt?.toISOString() ?? null,
      assignee: p.assignee ?? null,
      status: p.status,
    })),
    decisions: review.decisionIds.map(d => serializeDecisionItem(d as unknown as FounderDecisionItem)),
    followups: review.followupIds.map(f => serializeFollowup(f as unknown as OperatingFollowupRecord)),
    trends: review.trends.map(t => ({
      metric: t.metric,
      currentValue: t.currentValue,
      previousValue: t.previousValue,
      changePercent: t.changePercent,
      trend: t.trend,
    })),
    generatedAt: review.generatedAt.toISOString(),
    completedAt: review.completedAt?.toISOString() ?? null,
  };
}

/**
 * Serialize StrategicReviewPack to DTO
 */
export function serializeStrategicPack(pack: StrategicReviewPack): StrategicReviewPackDto {
  return {
    id: pack.id,
    reviewType: pack.reviewType,
    period: {
      start: pack.period.start.toISOString(),
      end: pack.period.end.toISOString(),
    },
    status: pack.status,
    summary: {
      overallHealth: pack.summary.overallHealth,
      healthScore: pack.summary.overallScore,
      keyInsights: pack.summary.keyInsights,
      areasOfFocus: pack.summary.areasOfFocus,
    },
    findings: pack.findings.map(f => ({
      category: f.category,
      severity: f.severity,
      title: f.title,
      description: f.description,
      affectedEntities: f.affectedEntities,
    })),
    recommendations: pack.recommendations.map(r => ({
      id: r.id,
      area: r.area,
      priority: r.priority,
      recommendation: r.recommendation,
      rationale: r.rationale,
      expectedImpact: r.expectedImpact,
    })),
    decisions: pack.decisionIds.map(d => serializeDecisionItem(d as unknown as FounderDecisionItem)),
    createdAt: pack.createdAt.toISOString(),
  };
}

/**
 * Serialize OperatingFollowupRecord to DTO
 */
export function serializeFollowup(followup: OperatingFollowupRecord): FounderFollowupDto {
  return {
    id: followup.id,
    sourceType: followup.sourceType,
    sourceId: followup.sourceId ?? null,
    status: followup.status,
    priority: followup.priority,
    title: followup.payload.title ?? 'Untitled Follow-up',
    description: followup.payload.description ?? '',
    assignedTo: followup.assignedTo ?? null,
    dueAt: followup.dueAt?.toISOString() ?? null,
    createdAt: followup.createdAt.toISOString(),
    completedAt: followup.completedAt?.toISOString() ?? null,
  };
}

/**
 * Serialize follow-up backlog to DTO
 */
export function serializeFollowupBacklog(
  followups: OperatingFollowupRecord[],
  staleCount: number
): FounderFollowupBacklogDto {
  const now = new Date();
  const overdue = followups.filter(f => f.dueAt && f.dueAt < now && f.status === 'pending').length;

  return {
    followups: followups.map(serializeFollowup),
    summary: {
      total: followups.length,
      pending: followups.filter(f => f.status === 'pending').length,
      inProgress: followups.filter(f => f.status === 'in_progress').length,
      completed: followups.filter(f => f.status === 'completed').length,
      stale: staleCount,
      overdue,
      byPriority: followups.reduce(
        (acc, f) => {
          acc[f.priority] = (acc[f.priority] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    },
  };
}

/**
 * Serialize health assessment to DTO
 */
export function serializeHealth(
  health: {
    overallScore: number;
    overallStatus: 'healthy' | 'neutral' | 'at-risk' | 'critical';
    componentScores: Array<{
      component: string;
      score: number;
      status: 'healthy' | 'neutral' | 'at-risk' | 'critical';
      trend: 'improving' | 'stable' | 'declining';
      issues: string[];
    }>;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    attentionRequired: string[];
  },
  _requestId?: string
): FounderHealthDto {
  return {
    overallScore: health.overallScore,
    overallStatus: health.overallStatus,
    componentScores: health.componentScores.map(c => ({
      component: c.component,
      score: c.score,
      status: c.status,
      trend: c.trend,
      issues: c.issues,
    })),
    riskLevel: health.riskLevel,
    attentionRequired: health.attentionRequired,
  };
}
