/**
 * Surface Inventory Service
 *
 * Manages growth surface inventory.
 */

import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceType,
  GrowthSurfaceStatus,
  GrowthSurfaceIndexabilityStatus,
  GrowthSurfaceFreshnessStatus,
  GrowthSurfaceGenerationStrategy,
} from '../types';

export interface CreateSurfaceInput {
  surfaceType: GrowthSurfaceType;
  routeKey: string;
  routePath: string;
  slug: string;
  platform?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  generationStrategy?: GrowthSurfaceGenerationStrategy;
  metadata?: Record<string, unknown>;
}

export interface UpdateSurfaceInput {
  pageStatus?: GrowthSurfaceStatus;
  indexabilityStatus?: GrowthSurfaceIndexabilityStatus;
  freshnessStatus?: GrowthSurfaceFreshnessStatus;
  qualityScore?: number;
  usefulnessScore?: number;
  metadata?: Record<string, unknown>;
}

export interface SurfaceListFilters {
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

export interface SurfaceListOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'qualityScore' | 'usefulnessScore';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Register a new growth surface in inventory
 */
export async function registerGrowthSurface(
  input: CreateSurfaceInput
): Promise<GrowthSurfaceInventoryRecord> {
  // Validate input
  validateSurfaceInput(input);

  // Check for duplicate route_key
  const existing = await getGrowthSurfaceByRouteKey(input.routeKey);
  if (existing) {
    throw new Error(`Surface with route_key '${input.routeKey}' already exists`);
  }

  // Create surface record
  return createSurfaceRecord(input);
}

/**
 * Update growth surface inventory
 */
export async function updateGrowthSurfaceInventory(
  surfaceId: string,
  input: UpdateSurfaceInput
): Promise<GrowthSurfaceInventoryRecord> {
  // Validate input
  if (Object.keys(input).length === 0) {
    throw new Error('At least one field must be updated');
  }

  // Update surface
  return updateSurfaceRecord(surfaceId, input);
}

/**
 * Get growth surface by ID
 */
export async function getGrowthSurfaceInventory(
  surfaceId: string
): Promise<GrowthSurfaceInventoryRecord | null> {
  return getSurfaceById(surfaceId);
}

/**
 * Get growth surface by route key
 */
export async function getGrowthSurfaceByRouteKey(
  routeKey: string
): Promise<GrowthSurfaceInventoryRecord | null> {
  return getSurfaceByRouteKey(routeKey);
}

/**
 * List growth surfaces with filters
 */
export async function listGrowthSurfaces(
  filters: SurfaceListFilters = {},
  options: SurfaceListOptions = {}
): Promise<{
  surfaces: GrowthSurfaceInventoryRecord[];
  total: number;
}> {
  const {
    limit = 20,
    offset = 0,
    orderBy = 'createdAt',
    orderDirection = 'desc',
  } = options;

  // Query with filters
  const surfaces = await querySurfaces(filters, {
    limit,
    offset,
    orderBy,
    orderDirection,
  });

  const total = await countSurfaces(filters);

  return { surfaces, total };
}

/**
 * Get active surfaces ready for generation
 */
export async function getActiveSurfacesForGeneration(): Promise<GrowthSurfaceInventoryRecord[]> {
  return querySurfaces(
    {
      pageStatus: [GrowthSurfaceStatus.ACTIVE, GrowthSurfaceStatus.PENDING],
    },
    { limit: 100 }
  );
}

/**
 * Get surfaces by source entity
 */
export async function getSurfacesBySourceEntity(
  sourceEntityType: string,
  sourceEntityId: string
): Promise<GrowthSurfaceInventoryRecord[]> {
  return querySurfaces({
    sourceEntityType,
    sourceEntityId,
  });
}

// ============================================================================
// Validation
// ============================================================================

function validateSurfaceInput(input: CreateSurfaceInput): void {
  if (!input.surfaceType) {
    throw new Error('surfaceType is required');
  }
  if (!input.routeKey || input.routeKey.trim().length === 0) {
    throw new Error('routeKey is required');
  }
  if (!input.routePath || input.routePath.trim().length === 0) {
    throw new Error('routePath is required');
  }
  if (!input.slug || input.slug.trim().length === 0) {
    throw new Error('slug is required');
  }
}

// ============================================================================
// Simulated Database Operations
// ============================================================================

const surfaces: Map<string, GrowthSurfaceInventoryRecord> = new Map();

async function createSurfaceRecord(
  input: CreateSurfaceInput
): Promise<GrowthSurfaceInventoryRecord> {
  const id = crypto.randomUUID();
  const now = new Date();

  const surface: GrowthSurfaceInventoryRecord = {
    id,
    surfaceType: input.surfaceType,
    routeKey: input.routeKey,
    routePath: input.routePath,
    slug: input.slug,
    platform: input.platform || null,
    sourceEntityType: input.sourceEntityType || null,
    sourceEntityId: input.sourceEntityId || null,
    pageStatus: GrowthSurfaceStatus.PENDING,
    indexabilityStatus: GrowthSurfaceIndexabilityStatus.PENDING,
    freshnessStatus: GrowthSurfaceFreshnessStatus.FRESH,
    qualityScore: null,
    usefulnessScore: null,
    generationStrategy: input.generationStrategy || GrowthSurfaceGenerationStrategy.MANUAL,
    metadata: input.metadata || null,
    createdAt: now,
    updatedAt: now,
    lastGeneratedAt: null,
    lastEvaluatedAt: null,
  };

  surfaces.set(id, surface);
  return surface;
}

async function updateSurfaceRecord(
  surfaceId: string,
  input: UpdateSurfaceInput
): Promise<GrowthSurfaceInventoryRecord> {
  const surface = surfaces.get(surfaceId);
  if (!surface) {
    throw new Error(`Surface with id '${surfaceId}' not found`);
  }

  const updated: GrowthSurfaceInventoryRecord = {
    ...surface,
    ...input,
    updatedAt: new Date(),
  };

  surfaces.set(surfaceId, updated);
  return updated;
}

async function getSurfaceById(
  surfaceId: string
): Promise<GrowthSurfaceInventoryRecord | null> {
  return surfaces.get(surfaceId) || null;
}

async function getSurfaceByRouteKey(
  routeKey: string
): Promise<GrowthSurfaceInventoryRecord | null> {
  for (const surface of surfaces.values()) {
    if (surface.routeKey === routeKey) {
      return surface;
    }
  }
  return null;
}

async function querySurfaces(
  filters: SurfaceListFilters,
  options: {
    limit: number;
    offset: number;
    orderBy: string;
    orderDirection: 'asc' | 'desc';
  }
): Promise<GrowthSurfaceInventoryRecord[]> {
  let result = Array.from(surfaces.values());

  // Apply filters
  if (filters.surfaceType?.length) {
    result = result.filter(s => filters.surfaceType!.includes(s.surfaceType));
  }
  if (filters.pageStatus?.length) {
    result = result.filter(s => filters.pageStatus!.includes(s.pageStatus));
  }
  if (filters.indexabilityStatus?.length) {
    result = result.filter(s => filters.indexabilityStatus!.includes(s.indexabilityStatus));
  }
  if (filters.sourceEntityType) {
    result = result.filter(s => s.sourceEntityType === filters.sourceEntityType);
  }
  if (filters.sourceEntityId) {
    result = result.filter(s => s.sourceEntityId === filters.sourceEntityId);
  }
  if (filters.minQualityScore !== undefined) {
    result = result.filter(s => s.qualityScore && s.qualityScore >= filters.minQualityScore!);
  }
  if (filters.maxQualityScore !== undefined) {
    result = result.filter(s => s.qualityScore && s.qualityScore <= filters.maxQualityScore!);
  }
  if (filters.minUsefulnessScore !== undefined) {
    result = result.filter(s => s.usefulnessScore && s.usefulnessScore >= filters.minUsefulnessScore!);
  }
  if (filters.maxUsefulnessScore !== undefined) {
    result = result.filter(s => s.usefulnessScore && s.usefulnessScore <= filters.maxUsefulnessScore!);
  }

  // Sort
  const orderMultiplier = options.orderDirection === 'asc' ? 1 : -1;
  result.sort((a, b) => {
    switch (options.orderBy) {
      case 'qualityScore':
        return ((a.qualityScore || 0) - (b.qualityScore || 0)) * orderMultiplier;
      case 'usefulnessScore':
        return ((a.usefulnessScore || 0) - (b.usefulnessScore || 0)) * orderMultiplier;
      case 'updatedAt':
        return (a.updatedAt.getTime() - b.updatedAt.getTime()) * orderMultiplier;
      default:
        return (a.createdAt.getTime() - b.createdAt.getTime()) * orderMultiplier;
    }
  });

  // Paginate
  return result.slice(options.offset, options.offset + options.limit);
}

async function countSurfaces(filters: SurfaceListFilters): Promise<number> {
  const result = await querySurfaces(filters, { limit: 10000, offset: 0, orderBy: 'createdAt', orderDirection: 'desc' });
  return result.length;
}
