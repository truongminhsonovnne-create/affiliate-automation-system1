/**
 * Weekly Operating Review Builder
 */

import type { WeeklyOperatingReview, WeeklyOperatingSummary, WeeklyTrendChange, WeeklyPriorityItem, WeeklyBlockerItem } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export async function buildWeeklyOperatingReview(params: {
  startDate: Date;
  endDate: Date;
  summary: WeeklyOperatingSummary;
  blockers: WeeklyBlockerItem[];
  priorities: WeeklyPriorityItem[];
  decisionIds: string[];
  followupIds: string[];
}): Promise<WeeklyOperatingReview> {
  return {
    id: uuidv4(),
    reviewKey: `weekly_${params.startDate.toISOString().split('T')[0]}`,
    period: { start: params.startDate, end: params.endDate },
    status: 'completed',
    summary: params.summary,
    blockers: params.blockers,
    priorities: params.priorities,
    decisions: params.decisionIds,
    followups: params.followupIds,
    createdAt: params.startDate,
    completedAt: new Date(),
  };
}

export async function buildWeeklyOperatingSummary(params: {
  health: string;
  score: number;
  trends: WeeklyTrendChange[];
}): Promise<WeeklyOperatingSummary> {
  return {
    overallHealth: params.health as any,
    overallScore: params.score,
    keyChanges: params.trends,
    riskAreas: params.trends.filter(t => t.direction === 'down').map(t => t.metric),
    winAreas: params.trends.filter(t => t.direction === 'up').map(t => t.metric),
  };
}

export async function buildWeeklyBlockerPack(blockers: Array<{id: string; title: string; severity: string}>): Promise<WeeklyBlockerItem[]> {
  return blockers.map(b => ({
    id: b.id,
    title: b.title,
    severity: b.severity as any,
    area: 'unknown',
    description: b.title,
  }));
}

export async function buildWeeklyPriorityPack(priorities: Array<{id: string; title: string; priority: string}>): Promise<WeeklyPriorityItem[]> {
  return priorities.map(p => ({
    id: p.id,
    title: p.title,
    priority: p.priority as any,
    area: 'unknown',
  }));
}
