/**
 * Platform Expansion Backlog Service
 *
 * Manages the platform expansion backlog for capability gaps.
 */

import type { PlatformExpansionBacklogItem, PlatformCapabilityArea, PlatformBacklogType, PlatformBacklogPriority } from '../types.js';
import { BACKLOG_PRIORITY_THRESHOLDS } from '../constants.js';
import { getPlatformExpansionBacklogRepository } from '../repositories/platformExpansionBacklogRepository.js';
import { logger } from '../../utils/logger.js';

/**
 * Build platform expansion backlog from capability gaps
 */
export async function buildPlatformExpansionBacklog(
  platformKey: string,
  capabilityGaps: Array<{ area: PlatformCapabilityArea; missingDependencies: PlatformCapabilityArea[] }>,
  existingBacklog: PlatformExpansionBacklogItem[] = []
): Promise<PlatformExpansionBacklogItem[]> {
  const repo = getPlatformExpansionBacklogRepository();
  const backlogItems: PlatformExpansionBacklogItem[] = [];

  for (const gap of capabilityGaps) {
    // Check if item already exists
    const existing = existingBacklog.find(
      item => item.backlogPayload.capabilityArea === gap.area && item.backlogStatus === 'pending'
    );

    if (existing) {
      backlogItems.push(existing);
      continue;
    }

    // Create new backlog item
    const priority = determinePriority(gap.area);
    const item = await repo.create({
      platformKey,
      backlogType: 'capability_gap',
      backlogStatus: 'pending',
      priority,
      backlogPayload: {
        title: `Implement ${formatCapabilityName(gap.area)}`,
        description: `Missing capability: ${gap.area}. Dependencies: ${gap.missingDependencies.join(', ') || 'none'}`,
        capabilityArea: gap.area,
        estimatedEffort: estimateEffort(gap.area),
        dependencies: gap.missingDependencies,
      },
      assignedTo: null,
      dueAt: calculateDueDate(priority),
    });

    backlogItems.push(item);
  }

  logger.info({
    msg: 'Platform expansion backlog built',
    platformKey,
    items: backlogItems.length,
  });

  return backlogItems;
}

/**
 * Create platform capability gap items
 */
export async function createPlatformCapabilityGapItems(
  platformKey: string,
  gaps: Array<{ area: PlatformCapabilityArea; description: string; priority?: 'critical' | 'high' | 'medium' | 'low' }>
): Promise<PlatformExpansionBacklogItem[]> {
  const repo = getPlatformExpansionBacklogRepository();
  const items: PlatformExpansionBacklogItem[] = [];

  for (const gap of gaps) {
    const item = await repo.create({
      platformKey,
      backlogType: 'capability_gap',
      backlogStatus: 'pending',
      priority: gap.priority || determinePriority(gap.area),
      backlogPayload: {
        title: `Implement ${formatCapabilityName(gap.area)}`,
        description: gap.description,
        capabilityArea: gap.area,
        estimatedEffort: estimateEffort(gap.area),
      },
      assignedTo: null,
      dueAt: calculateDueDate(gap.priority || determinePriority(gap.area)),
    });

    items.push(item);
  }

  return items;
}

/**
 * Prioritize platform expansion backlog
 */
export async function prioritizePlatformExpansionBacklog(
  platformKey: string
): Promise<PlatformExpansionBacklogItem[]> {
  const repo = getPlatformExpansionBacklogRepository();
  const items = await repo.findByPlatform(platformKey);

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return items.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by due date
    if (a.dueAt && b.dueAt) {
      return a.dueAt.getTime() - b.dueAt.getTime();
    }
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;

    return 0;
  });
}

/**
 * Get platform expansion backlog
 */
export async function getPlatformExpansionBacklog(
  platformKey: string,
  status?: string
): Promise<PlatformExpansionBacklogItem[]> {
  const repo = getPlatformExpansionBacklogRepository();
  return repo.findByPlatform(platformKey, status as any);
}

/**
 * Complete platform expansion backlog item
 */
export async function completePlatformExpansionBacklogItem(
  itemId: string,
  completedBy?: string
): Promise<PlatformExpansionBacklogItem> {
  const repo = getPlatformExpansionBacklogRepository();
  const item = await repo.complete(itemId);

  logger.info({
    msg: 'Backlog item completed',
    itemId,
    completedBy,
  });

  return item;
}

/**
 * Get backlog summary
 */
export async function getPlatformBacklogSummary(platformKey: string): Promise<{
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  byPriority: Record<string, number>;
}> {
  const repo = getPlatformExpansionBacklogRepository();
  const items = await repo.findByPlatform(platformKey);

  const now = new Date();
  const summary = {
    total: items.length,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    byPriority: {} as Record<string, number>,
  };

  for (const item of items) {
    switch (item.backlogStatus) {
      case 'pending':
        summary.pending++;
        if (item.dueAt && item.dueAt < now) {
          summary.overdue++;
        }
        break;
      case 'in_progress':
        summary.inProgress++;
        break;
      case 'completed':
        summary.completed++;
        break;
    }

    summary.byPriority[item.priority] = (summary.byPriority[item.priority] || 0) + 1;
  }

  return summary;
}

// ============================================================
// Helper Functions
// ============================================================

function determinePriority(capabilityArea: PlatformCapabilityArea): PlatformBacklogPriority {
  const priorityMap: Partial<Record<PlatformCapabilityArea, PlatformBacklogPriority>> = {
    product_reference_parsing: 'critical',
    product_context_resolution: 'critical',
    promotion_rule_modeling: 'high',
    public_flow_support: 'high',
    commercial_attribution: 'medium',
    growth_surface_support: 'medium',
    ops_governance_support: 'low',
    bi_readiness_support: 'low',
  };

  return priorityMap[capabilityArea] || 'medium';
}

function formatCapabilityName(area: PlatformCapabilityArea): string {
  return area
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function estimateEffort(capabilityArea: PlatformCapabilityArea): string {
  const effortMap: Partial<Record<PlatformCapabilityArea, string>> = {
    product_reference_parsing: '2-3 weeks',
    product_context_resolution: '3-4 weeks',
    promotion_rule_modeling: '2-3 weeks',
    public_flow_support: '3-4 weeks',
    commercial_attribution: '2-3 weeks',
    growth_surface_support: '2 weeks',
    ops_governance_support: '1-2 weeks',
    bi_readiness_support: '1-2 weeks',
  };

  return effortMap[capabilityArea] || '2 weeks';
}

function calculateDueDate(priority: PlatformBacklogPriority): Date {
  const daysMap: Record<PlatformBacklogPriority, number> = {
    critical: BACKLOG_PRIORITY_THRESHOLDS.CRITICAL_DUE_DAYS,
    high: BACKLOG_PRIORITY_THRESHOLDS.HIGH_DUE_DAYS,
    medium: BACKLOG_PRIORITY_THRESHOLDS.MEDIUM_DUE_DAYS,
    low: 60,
  };

  const days = daysMap[priority];
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
