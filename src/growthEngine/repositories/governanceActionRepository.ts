/**
 * Governance Action Repository
 *
 * Data access layer for governance actions.
 */

import {
  GrowthSurfaceGovernanceAction,
  GrowthGovernanceActionType,
  GrowthGovernanceActionStatus,
} from '../types';

export interface GovernanceActionFilter {
  surfaceInventoryId?: string;
  actionType?: GrowthGovernanceActionType[];
  actionStatus?: GrowthGovernanceActionStatus[];
  actorId?: string;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Create a new governance action
 */
export async function createGovernanceAction(
  data: Omit<GrowthSurfaceGovernanceAction, 'id' | 'createdAt'>
): Promise<GrowthSurfaceGovernanceAction> {
  const id = crypto.randomUUID();
  const now = new Date();

  const action: GrowthSurfaceGovernanceAction = {
    id,
    ...data,
    createdAt: now,
  };

  await saveGovernanceAction(action);
  return action;
}

/**
 * Get governance action by ID
 */
export async function getGovernanceActionById(
  id: string
): Promise<GrowthSurfaceGovernanceAction | null> {
  return findGovernanceActionById(id);
}

/**
 * Get governance actions for a surface
 */
export async function getGovernanceActionsBySurface(
  surfaceInventoryId: string,
  limit: number = 10
): Promise<GrowthSurfaceGovernanceAction[]> {
  const all = await getAllGovernanceActions();
  return all
    .filter(a => a.surfaceInventoryId === surfaceInventoryId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

/**
 * Get latest governance action for a surface
 */
export async function getLatestGovernanceAction(
  surfaceInventoryId: string
): Promise<GrowthSurfaceGovernanceAction | null> {
  const actions = await getGovernanceActionsBySurface(surfaceInventoryId, 1);
  return actions[0] ?? null;
}

/**
 * Update governance action
 */
export async function updateGovernanceAction(
  id: string,
  data: Partial<GrowthSurfaceGovernanceAction>
): Promise<GrowthSurfaceGovernanceAction | null> {
  const existing = await findGovernanceActionById(id);
  if (!existing) return null;

  const updated: GrowthSurfaceGovernanceAction = {
    ...existing,
    ...data,
  };

  await saveGovernanceAction(updated);
  return updated;
}

/**
 * Execute governance action (update status)
 */
export async function executeGovernanceAction(
  id: string,
  executorId: string
): Promise<GrowthSurfaceGovernanceAction | null> {
  return updateGovernanceAction(id, {
    actionStatus: GrowthGovernanceActionStatus.COMPLETED,
    executedAt: new Date(),
  });
}

/**
 * Cancel governance action
 */
export async function cancelGovernanceAction(
  id: string,
  reason?: string
): Promise<GrowthSurfaceGovernanceAction | null> {
  return updateGovernanceAction(id, {
    actionStatus: GrowthGovernanceActionStatus.CANCELLED,
  });
}

/**
 * List governance actions with filters
 */
export async function listGovernanceActions(
  filter: GovernanceActionFilter = {},
  limit: number = 20,
  offset: number = 0
): Promise<{
  data: GrowthSurfaceGovernanceAction[];
  total: number;
}> {
  let actions = await getAllGovernanceActions();

  // Apply filters
  if (filter.surfaceInventoryId) {
    actions = actions.filter(a => a.surfaceInventoryId === filter.surfaceInventoryId);
  }
  if (filter.actionType?.length) {
    actions = actions.filter(a => filter.actionType!.includes(a.actionType));
  }
  if (filter.actionStatus?.length) {
    actions = actions.filter(a => filter.actionStatus!.includes(a.actionStatus));
  }
  if (filter.actorId) {
    actions = actions.filter(a => a.actorId === filter.actorId);
  }
  if (filter.fromDate) {
    actions = actions.filter(a => a.createdAt >= filter.fromDate!);
  }
  if (filter.toDate) {
    actions = actions.filter(a => a.createdAt <= filter.toDate!);
  }

  // Sort by created date descending
  actions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const total = actions.length;
  const data = actions.slice(offset, offset + limit);

  return { data, total };
}

/**
 * Get pending governance actions
 */
export async function getPendingGovernanceActions(): Promise<GrowthSurfaceGovernanceAction[]> {
  const all = await getAllGovernanceActions();
  return all
    .filter(a => a.actionStatus === GrowthGovernanceActionStatus.PENDING)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * Get action summary by type
 */
export async function getActionSummary(): Promise<{
  byType: Record<GrowthGovernanceActionType, number>;
  byStatus: Record<GrowthGovernanceActionStatus, number>;
}> {
  const all = await getAllGovernanceActions();

  const byType: Record<GrowthGovernanceActionType, number> = {
    [GrowthGovernanceActionType.BLOCK]: 0,
    [GrowthGovernanceActionType.DEINDEX]: 0,
    [GrowthGovernanceActionType.MARK_REVIEW]: 0,
    [GrowthGovernanceActionType.APPROVE_SCALING]: 0,
    [GrowthGovernanceActionType.REFRESH]: 0,
    [GrowthGovernanceActionType.ARCHIVE]: 0,
  };

  const byStatus: Record<GrowthGovernanceActionStatus, number> = {
    [GrowthGovernanceActionStatus.PENDING]: 0,
    [GrowthGovernanceActionStatus.EXECUTING]: 0,
    [GrowthGovernanceActionStatus.COMPLETED]: 0,
    [GrowthGovernanceActionStatus.FAILED]: 0,
    [GrowthGovernanceActionStatus.CANCELLED]: 0,
  };

  for (const action of all) {
    byType[action.actionType]++;
    byStatus[action.actionStatus]++;
  }

  return { byType, byStatus };
}

// ============================================================================
// In-Memory Storage
// ============================================================================

const governanceActionStore: Map<string, GrowthSurfaceGovernanceAction> = new Map();

async function saveGovernanceAction(action: GrowthSurfaceGovernanceAction): Promise<void> {
  governanceActionStore.set(action.id, action);
}

async function findGovernanceActionById(id: string): Promise<GrowthSurfaceGovernanceAction | null> {
  return governanceActionStore.get(id) ?? null;
}

async function getAllGovernanceActions(): Promise<GrowthSurfaceGovernanceAction[]> {
  return Array.from(governanceActionStore.values());
}

/**
 * Seed test data
 */
export function seedTestGovernanceActions(actions: GrowthSurfaceGovernanceAction[]): void {
  for (const action of actions) {
    governanceActionStore.set(action.id, action);
  }
}
