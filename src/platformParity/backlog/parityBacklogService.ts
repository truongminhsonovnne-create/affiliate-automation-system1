/**
 * Parity Backlog Service
 * Manages parity backlog items
 */

import type {
  PlatformParityGap,
  ParityBacklogItem,
  ParityBacklogItemInput,
  PlatformParityGapSeverity,
} from '../types.js';

import {
  SEVERITY_TO_PRIORITY_SCORE,
  BACKLOG_CRITICAL_THRESHOLD,
  BACKLOG_HIGH_THRESHOLD,
  BACKLOG_MEDIUM_THRESHOLD,
} from '../constants.js';

export interface BacklogSummary {
  totalItems: number;
  pendingItems: number;
  inProgressItems: number;
  completedItems: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

/**
 * Build parity backlog from gaps
 */
export async function buildParityBacklog(
  gaps: PlatformParityGap[],
  existingBacklog: ParityBacklogItem[] = []
): Promise<ParityBacklogItem[]> {
  const backlog: ParityBacklogItem[] = [...existingBacklog];

  // For each gap, create or update backlog item
  for (const gap of gaps) {
    // Check if backlog item already exists for this gap
    const existingItem = backlog.find((item) => item.gapId === gap.id);

    if (!existingItem) {
      // Create new backlog item
      const newItem = await createBacklogItemFromGap(gap);
      backlog.push(newItem);
    } else if (gap.resolvedAt) {
      // Mark as completed if gap is resolved
      existingItem.status = 'completed';
      existingItem.completedAt = new Date();
    }
  }

  return backlog;
}

/**
 * Create backlog items from gaps
 */
export async function createParityGapBacklogItems(
  gaps: PlatformParityGap[]
): Promise<ParityBacklogItem[]> {
  const items: ParityBacklogItem[] = [];

  for (const gap of gaps) {
    const item = await createBacklogItemFromGap(gap);
    items.push(item);
  }

  return items;
}

/**
 * Create a backlog item from a gap
 */
async function createBacklogItemFromGap(gap: PlatformParityGap): Promise<ParityBacklogItem> {
  const priorityScore = calculatePriorityScore(gap);

  const item: ParityBacklogItem = {
    id: generateBacklogId(),
    gapId: gap.id,
    backlogType: 'gap_remediation',
    priorityScore,
    title: generateBacklogTitle(gap),
    description: generateBacklogDescription(gap),
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Set due date based on severity
  item.dueDate = calculateDueDate(gap.severity);

  return item;
}

/**
 * Prioritize parity backlog
 */
export async function prioritizeParityBacklog(
  backlog: ParityBacklogItem[]
): Promise<ParityBacklogItem[]> {
  // Sort by priority score descending
  const sorted = [...backlog].sort((a, b) => b.priorityScore - a.priorityScore);

  // Reorder so pending items come before in-progress, which come before completed
  const pending = sorted.filter((item) => item.status === 'pending');
  const inProgress = sorted.filter((item) => item.status === 'in_progress');
  const completed = sorted.filter((item) => item.status === 'completed');

  return [...pending, ...inProgress, ...completed];
}

/**
 * Complete a parity backlog item
 */
export async function completeParityBacklogItem(
  backlog: ParityBacklogItem[],
  itemId: string,
  completedAt?: Date
): Promise<ParityBacklogItem[]> {
  return backlog.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        status: 'completed' as const,
        completedAt: completedAt ?? new Date(),
        updatedAt: new Date(),
      };
    }
    return item;
  });
}

/**
 * Build backlog summary
 */
export function buildBacklogSummary(backlog: ParityBacklogItem[]): BacklogSummary {
  const pendingItems = backlog.filter((item) => item.status === 'pending');
  const inProgressItems = backlog.filter((item) => item.status === 'in_progress');
  const completedItems = backlog.filter((item) => item.status === 'completed');

  // Count by priority
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const item of pendingItems) {
    if (item.priorityScore >= BACKLOG_CRITICAL_THRESHOLD) {
      criticalCount++;
    } else if (item.priorityScore >= BACKLOG_HIGH_THRESHOLD) {
      highCount++;
    } else if (item.priorityScore >= BACKLOG_MEDIUM_THRESHOLD) {
      mediumCount++;
    } else {
      lowCount++;
    }
  }

  return {
    totalItems: backlog.length,
    pendingItems: pendingItems.length,
    inProgressItems: inProgressItems.length,
    completedItems: completedItems.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
  };
}

/**
 * Filter backlog by priority
 */
export function filterBacklogByPriority(
  backlog: ParityBacklogItem[],
  minPriority: number
): ParityBacklogItem[] {
  return backlog.filter((item) => item.priorityScore >= minPriority);
}

/**
 * Filter backlog by status
 */
export function filterBacklogByStatus(
  backlog: ParityBacklogItem[],
  status: 'pending' | 'in_progress' | 'completed'
): ParityBacklogItem[] {
  return backlog.filter((item) => item.status === status);
}

/**
 * Get overdue backlog items
 */
export function getOverdueBacklogItems(backlog: ParityBacklogItem[]): ParityBacklogItem[] {
  const now = new Date();
  return backlog.filter((item) => {
    if (item.status === 'completed') return false;
    if (!item.dueDate) return false;
    return item.dueDate < now;
  });
}

// Helper functions

function calculatePriorityScore(gap: PlatformParityGap): number {
  const baseScore = SEVERITY_TO_PRIORITY_SCORE[gap.severity] ?? 50;

  // Adjust based on gap status
  let score = baseScore;
  if (gap.gapStatus === 'investigating') {
    score = Math.max(0, score - 10);
  } else if (gap.gapStatus === 'in_progress') {
    score = Math.max(0, score - 20);
  }

  // Adjust based on age
  const ageDays = (Date.now() - gap.createdAt.getTime()) / (24 * 60 * 60 * 1000);
  if (ageDays > 30) {
    score = Math.min(100, score + 15);
  } else if (ageDays > 14) {
    score = Math.min(100, score + 10);
  } else if (ageDays > 7) {
    score = Math.min(100, score + 5);
  }

  return Math.round(score);
}

function generateBacklogTitle(gap: PlatformParityGap): string {
  const severityLabel = gap.severity.toUpperCase();
  return `[${severityLabel}] Address parity gap in ${formatGapArea(gap.gapArea)}`;
}

function generateBacklogDescription(gap: PlatformParityGap): string {
  return `Parity gap detected in ${gap.gapArea} for platform ${gap.platformKey}. Severity: ${gap.severity}. Status: ${gap.gapStatus}.`;
}

function formatGapArea(area: string): string {
  return area.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function calculateDueDate(severity: PlatformParityGapSeverity): Date {
  const now = new Date();
  const daysToAdd: Record<PlatformParityGapSeverity, number> = {
    critical: 1,
    high: 3,
    medium: 7,
    low: 14,
    info: 30,
  };

  const days = daysToAdd[severity] ?? 7;
  now.setDate(now.getDate() + days);

  return now;
}

function generateBacklogId(): string {
  return `bl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
