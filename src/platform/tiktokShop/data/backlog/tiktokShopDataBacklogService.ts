/**
 * TikTok Shop Data Backlog Service
 * Manages backlog items for data acquisition and enrichment gaps
 */

import type {
  TikTokShopDataBacklogItem,
  TikTokShopDataBlocker,
} from '../types.js';
import { TikTokShopBacklogType, TikTokShopBacklogStatus } from '../types.js';
import { logger } from '../../../../utils/logger.js';
import { getTikTokShopDataBacklogRepository } from '../repositories/tiktokDataBacklogRepository.js';

/**
 * Build backlog from blockers
 */
export async function buildTikTokShopDataBacklog(blockers: TikTokShopDataBlocker[]): Promise<{
  backlogItems: TikTokShopDataBacklogItem[];
  created: number;
}> {
  logger.info({ msg: 'Building backlog from blockers', count: blockers.length });

  const backlogRepo = getTikTokShopDataBacklogRepository();
  const backlogItems: TikTokShopDataBacklogItem[] = [];

  for (const blocker of blockers) {
    let backlogType: TikTokShopBacklogType;

    switch (blocker.blockerType) {
      case 'source_unavailable':
        backlogType = TikTokShopBacklogType.SOURCE_GAP;
        break;
      case 'validation_failed':
      case 'normalization_failed':
        backlogType = TikTokShopBacklogType.NORMALIZATION_GAP;
        break;
      case 'enrichment_failed':
        backlogType = TikTokShopBacklogType.ENRICHMENT_GAP;
        break;
      case 'quality_gap':
        backlogType = TikTokShopBacklogType.QUALITY_GAP;
        break;
      default:
        backlogType = TikTokShopBacklogType.SOURCE_GAP;
    }

    const item = await backlogRepo.create({
      backlogType,
      backlogStatus: TikTokShopBacklogStatus.OPEN,
      priority: blocker.severity === 'critical' ? 'critical' : blocker.severity === 'high' ? 'high' : 'medium',
      backlogPayload: {
        blockerId: blocker.blockerId,
        blockerType: blocker.blockerType,
        message: blocker.message,
        field: blocker.field,
        sourceKey: blocker.sourceKey,
      },
    });

    backlogItems.push(item);
  }

  return {
    backlogItems,
    created: backlogItems.length,
  };
}

/**
 * Create gap items from analysis
 */
export async function createTikTokShopDataGapItems(
  gaps: Array<{
    gapType: string;
    category: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    recommendation: string;
  }>
): Promise<{
  backlogItems: TikTokShopDataBacklogItem[];
  created: number;
}> {
  const backlogRepo = getTikTokShopDataBacklogRepository();
  const backlogItems: TikTokShopDataBacklogItem[] = [];

  for (const gap of gaps) {
    let backlogType: TikTokShopBacklogType;

    switch (gap.gapType) {
      case 'source_gap':
        backlogType = TikTokShopBacklogType.SOURCE_GAP;
        break;
      case 'field_gap':
        backlogType = TikTokShopBacklogType.NORMALIZATION_GAP;
        break;
      case 'quality_gap':
        backlogType = TikTokShopBacklogType.QUALITY_GAP;
        break;
      case 'compatibility_gap':
        backlogType = TikTokShopBacklogType.INTEGRATION_GAP;
        break;
      default:
        backlogType = TikTokShopBacklogType.SOURCE_GAP;
    }

    const item = await backlogRepo.create({
      backlogType,
      backlogStatus: TikTokShopBacklogStatus.OPEN,
      priority: gap.severity,
      backlogPayload: {
        gapType: gap.gapType,
        category: gap.category,
        description: gap.description,
        recommendation: gap.recommendation,
      },
    });

    backlogItems.push(item);
  }

  return {
    backlogItems,
    created: backlogItems.length,
  };
}

/**
 * Prioritize backlog
 */
export async function prioritizeTikTokShopDataBacklog(
  items: TikTokShopDataBacklogItem[]
): Promise<TikTokShopDataBacklogItem[]> {
  const priorityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return items.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Get backlog items
 */
export async function getTikTokShopDataBacklog(
  filters?: {
    backlogType?: TikTokShopBacklogType;
    backlogStatus?: TikTokShopBacklogStatus;
    priority?: string;
  }
): Promise<TikTokShopDataBacklogItem[]> {
  const backlogRepo = getTikTokShopDataBacklogRepository();
  return backlogRepo.findAll(filters);
}

/**
 * Complete backlog item
 */
export async function completeTikTokShopDataBacklogItem(
  id: string,
  completionNotes?: string
): Promise<TikTokShopDataBacklogItem> {
  const backlogRepo = getTikTokShopDataBacklogRepository();
  return backlogRepo.complete(id, completionNotes);
}

/**
 * Get backlog summary
 */
export async function getTikTokShopDataBacklogSummary(): Promise<{
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  overdue: number;
}> {
  const backlogRepo = getTikTokShopDataBacklogRepository();
  const allItems = await backlogRepo.findAll();

  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let open = 0;
  let inProgress = 0;
  let completed = 0;
  let overdue = 0;

  const now = new Date();

  for (const item of allItems) {
    // Count by status
    switch (item.backlogStatus) {
      case TikTokShopBacklogStatus.OPEN:
        open++;
        break;
      case TikTokShopBacklogStatus.IN_PROGRESS:
        inProgress++;
        break;
      case TikTokShopBacklogStatus.COMPLETED:
        completed++;
        break;
    }

    // Count by type
    byType[item.backlogType] = (byType[item.backlogType] || 0) + 1;

    // Count by priority
    byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;

    // Check overdue
    if (item.dueAt && new Date(item.dueAt) < now && item.backlogStatus !== TikTokShopBacklogStatus.COMPLETED) {
      overdue++;
    }
  }

  return {
    total: allItems.length,
    open,
    inProgress,
    completed,
    byType,
    byPriority,
    overdue,
  };
}
