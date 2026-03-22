/**
 * Surface Inventory Repository
 *
 * Data access layer for growth surface inventory.
 */

import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceType,
  GrowthSurfaceStatus,
  GrowthSurfaceIndexabilityStatus,
  GrowthSurfaceFreshnessStatus,
} from '../types';

export interface SurfaceInventoryFilter {
  surfaceType?: GrowthSurfaceType[];
  pageStatus?: GrowthSurfaceStatus[];
  indexabilityStatus?: GrowthSurfaceIndexabilityStatus[];
  freshnessStatus?: GrowthSurfaceFreshnessStatus[];
  sourceEntityType?: string;
  sourceEntityId?: string;
  minQualityScore?: number;
  maxQualityScore?: number;
  minUsefulnessScore?: number;
  maxUsefulnessScore?: number;
}

export interface SurfaceInventoryOrderBy {
  field: 'createdAt' | 'updatedAt' | 'qualityScore' | 'usefulnessScore';
  direction: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Create a new surface inventory record
 */
export async function createSurfaceInventory(
  data: Omit<GrowthSurfaceInventoryRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<GrowthSurfaceInventoryRecord> {
  const id = crypto.randomUUID();
  const now = new Date();

  const record: GrowthSurfaceInventoryRecord = {
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await saveSurfaceInventory(record);
  return record;
}

/**
 * Get surface by ID
 */
export async function getSurfaceInventoryById(
  id: string
): Promise<GrowthSurfaceInventoryRecord | null> {
  return findSurfaceInventoryById(id);
}

/**
 * Get surface by route key
 */
export async function getSurfaceInventoryByRouteKey(
  routeKey: string
): Promise<GrowthSurfaceInventoryRecord | null> {
  return findSurfaceInventoryByRouteKey(routeKey);
}

/**
 * Update surface inventory record
 */
export async function updateSurfaceInventory(
  id: string,
  data: Partial<GrowthSurfaceInventoryRecord>
): Promise<GrowthSurfaceInventoryRecord | null> {
  const existing = await findSurfaceInventoryById(id);
  if (!existing) return null;

  const updated: GrowthSurfaceInventoryRecord = {
    ...existing,
    ...data,
    updatedAt: new Date(),
  };

  await saveSurfaceInventory(updated);
  return updated;
}

/**
 * Delete surface inventory record
 */
export async function deleteSurfaceInventory(id: string): Promise<boolean> {
  return removeSurfaceInventory(id);
}

/**
 * List surfaces with filters and pagination
 */
export async function listSurfaceInventories(
  filter: SurfaceInventoryFilter = {},
  orderBy: SurfaceInventoryOrderBy = { field: 'createdAt', direction: 'desc' },
  limit: number = 20,
  offset: number = 0
): Promise<PaginatedResult<GrowthSurfaceInventoryRecord>> {
  const allSurfaces = await getAllSurfaces();

  // Apply filters
  let filtered = allSurfaces;

  if (filter.surfaceType?.length) {
    filtered = filtered.filter(s => filter.surfaceType!.includes(s.surfaceType));
  }
  if (filter.pageStatus?.length) {
    filtered = filtered.filter(s => filter.pageStatus!.includes(s.pageStatus));
  }
  if (filter.indexabilityStatus?.length) {
    filtered = filtered.filter(s => filter.indexabilityStatus!.includes(s.indexabilityStatus));
  }
  if (filter.freshnessStatus?.length) {
    filtered = filtered.filter(s => filter.freshnessStatus!.includes(s.freshnessStatus));
  }
  if (filter.sourceEntityType) {
    filtered = filtered.filter(s => s.sourceEntityType === filter.sourceEntityType);
  }
  if (filter.sourceEntityId) {
    filtered = filtered.filter(s => s.sourceEntityId === filter.sourceEntityId);
  }
  if (filter.minQualityScore !== undefined) {
    filtered = filtered.filter(s => s.qualityScore !== null && s.qualityScore >= filter.minQualityScore!);
  }
  if (filter.maxQualityScore !== undefined) {
    filtered = filtered.filter(s => s.qualityScore !== null && s.qualityScore <= filter.maxQualityScore!);
  }
  if (filter.minUsefulnessScore !== undefined) {
    filtered = filtered.filter(s => s.usefulnessScore !== null && s.usefulnessScore >= filter.minUsefulnessScore!);
  }
  if (filter.maxUsefulnessScore !== undefined) {
    filtered = filtered.filter(s => s.usefulnessScore !== null && s.usefulnessScore <= filter.maxUsefulnessScore!);
  }

  // Apply sorting
  const multiplier = orderBy.direction === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    switch (orderBy.field) {
      case 'qualityScore':
        return ((a.qualityScore ?? 0) - (b.qualityScore ?? 0)) * multiplier;
      case 'usefulnessScore':
        return ((a.usefulnessScore ?? 0) - (b.usefulnessScore ?? 0)) * multiplier;
      case 'updatedAt':
        return (a.updatedAt.getTime() - b.updatedAt.getTime()) * multiplier;
      default:
        return (a.createdAt.getTime() - b.createdAt.getTime()) * multiplier;
    }
  });

  // Apply pagination
  const data = filtered.slice(offset, offset + limit);
  const total = filtered.length;

  return {
    data,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

/**
 * Count surfaces by filter
 */
export async function countSurfaceInventories(
  filter: SurfaceInventoryFilter = {}
): Promise<number> {
  const result = await listSurfaceInventories(filter, { field: 'createdAt', direction: 'desc' }, 10000, 0);
  return result.total;
}

/**
 * Get surfaces by source entity
 */
export async function getSurfacesBySourceEntity(
  sourceEntityType: string,
  sourceEntityId: string
): Promise<GrowthSurfaceInventoryRecord[]> {
  const allSurfaces = await getAllSurfaces();
  return allSurfaces.filter(
    s => s.sourceEntityType === sourceEntityType && s.sourceEntityId === sourceEntityId
  );
}

// ============================================================================
// In-Memory Storage (Simulated Database)
// ============================================================================

const surfaceStore: Map<string, GrowthSurfaceInventoryRecord> = new Map();

async function saveSurfaceInventory(record: GrowthSurfaceInventoryRecord): Promise<void> {
  surfaceStore.set(record.id, record);
}

async function findSurfaceInventoryById(id: string): Promise<GrowthSurfaceInventoryRecord | null> {
  return surfaceStore.get(id) ?? null;
}

async function findSurfaceInventoryByRouteKey(routeKey: string): Promise<GrowthSurfaceInventoryRecord | null> {
  for (const surface of surfaceStore.values()) {
    if (surface.routeKey === routeKey) {
      return surface;
    }
  }
  return null;
}

async function removeSurfaceInventory(id: string): Promise<boolean> {
  return surfaceStore.delete(id);
}

async function getAllSurfaces(): Promise<GrowthSurfaceInventoryRecord[]> {
  return Array.from(surfaceStore.values());
}

/**
 * Seed test data
 */
export function seedTestSurfaceData(surfaces: GrowthSurfaceInventoryRecord[]): void {
  for (const surface of surfaces) {
    surfaceStore.set(surface.id, surface);
  }
}
