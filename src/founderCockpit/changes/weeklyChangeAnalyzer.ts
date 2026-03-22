/**
 * Weekly Change Analyzer
 */

import type { WeeklyTrendChange } from '../types.js';
import { TREND_THRESHOLDS } from '../constants.js';

export function analyzeWeeklyChanges(current: Record<string, number>, previous: Record<string, number>): WeeklyTrendChange[] {
  const changes: WeeklyTrendChange[] = [];

  for (const [metric, value] of Object.entries(current)) {
    const prev = previous[metric] ?? 0;
    if (prev === 0) continue;

    const change = (value - prev) / prev;
    const direction = change > TREND_THRESHOLDS.SIGNIFICANT_UP ? 'up' : change < TREND_THRESHOLDS.SIGNIFICANT_DOWN ? 'down' : 'stable';

    changes.push({
      metric,
      direction,
      changePercent: change,
      description: `${metric} changed by ${(change * 100).toFixed(1)}%`,
    });
  }

  return changes;
}

export function detectWeeklyImprovements(changes: WeeklyTrendChange[]): WeeklyTrendChange[] {
  return changes.filter(c => c.direction === 'up');
}

export function detectWeeklyRegressions(changes: WeeklyTrendChange[]): WeeklyTrendChange[] {
  return changes.filter(c => c.direction === 'down');
}

export function buildWeeklyChangeSummary(changes: WeeklyTrendChange[]): {
  improved: string[];
  regressed: string[];
  stable: string[];
} {
  return {
    improved: changes.filter(c => c.direction === 'up').map(c => c.description),
    regressed: changes.filter(c => c.direction === 'down').map(c => c.description),
    stable: changes.filter(c => c.direction === 'stable').map(c => c.description),
  };
}
