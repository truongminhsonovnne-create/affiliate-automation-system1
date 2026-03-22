/**
 * Generation Repository
 *
 * Data access layer for surface generation records.
 */

import {
  GrowthSurfaceGenerationRecord,
  GrowthGenerationStatus,
} from '../types';

export interface GenerationFilter {
  surfaceInventoryId?: string;
  generationStatus?: GrowthGenerationStatus[];
}

/**
 * Create a new generation record
 */
export async function createGenerationRecord(
  data: Omit<GrowthSurfaceGenerationRecord, 'id' | 'createdAt'>
): Promise<GrowthSurfaceGenerationRecord> {
  const id = crypto.randomUUID();
  const now = new Date();

  const record: GrowthSurfaceGenerationRecord = {
    id,
    ...data,
    createdAt: now,
  };

  await saveGenerationRecord(record);
  return record;
}

/**
 * Get generation record by ID
 */
export async function getGenerationRecordById(
  id: string
): Promise<GrowthSurfaceGenerationRecord | null> {
  return findGenerationById(id);
}

/**
 * Get generation records for a surface
 */
export async function getGenerationRecordsBySurface(
  surfaceInventoryId: string,
  limit: number = 10
): Promise<GrowthSurfaceGenerationRecord[]> {
  const records = await getAllGenerationRecords();
  const filtered = records
    .filter(r => r.surfaceInventoryId === surfaceInventoryId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return filtered.slice(0, limit);
}

/**
 * Get latest generation for a surface
 */
export async function getLatestGeneration(
  surfaceInventoryId: string
): Promise<GrowthSurfaceGenerationRecord | null> {
  const records = await getGenerationRecordsBySurface(surfaceInventoryId, 1);
  return records[0] ?? null;
}

/**
 * Update generation record
 */
export async function updateGenerationRecord(
  id: string,
  data: Partial<GrowthSurfaceGenerationRecord>
): Promise<GrowthSurfaceGenerationRecord | null> {
  const existing = await findGenerationById(id);
  if (!existing) return null;

  const updated: GrowthSurfaceGenerationRecord = {
    ...existing,
    ...data,
  };

  await saveGenerationRecord(updated);
  return updated;
}

/**
 * List generation records with filters
 */
export async function listGenerationRecords(
  filter: GenerationFilter = {},
  limit: number = 20,
  offset: number = 0
): Promise<{
  data: GrowthSurfaceGenerationRecord[];
  total: number;
}> {
  let records = await getAllGenerationRecords();

  // Apply filters
  if (filter.surfaceInventoryId) {
    records = records.filter(r => r.surfaceInventoryId === filter.surfaceInventoryId);
  }
  if (filter.generationStatus?.length) {
    records = records.filter(r => filter.generationStatus!.includes(r.generationStatus));
  }

  // Sort by created date descending
  records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const total = records.length;
  const data = records.slice(offset, offset + limit);

  return { data, total };
}

/**
 * Get pending generations
 */
export async function getPendingGenerations(): Promise<GrowthSurfaceGenerationRecord[]> {
  const all = await getAllGenerationRecords();
  return all
    .filter(r => r.generationStatus === GrowthGenerationStatus.PENDING)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * Get failed generations for retry
 */
export async function getFailedGenerations(
  since?: Date
): Promise<GrowthSurfaceGenerationRecord[]> {
  const all = await getAllGenerationRecords();
  return all
    .filter(r => {
      if (r.generationStatus !== GrowthGenerationStatus.FAILED) return false;
      if (since && r.completedAt && r.completedAt < since) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ============================================================================
// In-Memory Storage
// ============================================================================

const generationStore: Map<string, GrowthSurfaceGenerationRecord> = new Map();

async function saveGenerationRecord(record: GrowthSurfaceGenerationRecord): Promise<void> {
  generationStore.set(record.id, record);
}

async function findGenerationById(id: string): Promise<GrowthSurfaceGenerationRecord | null> {
  return generationStore.get(id) ?? null;
}

async function getAllGenerationRecords(): Promise<GrowthSurfaceGenerationRecord[]> {
  return Array.from(generationStore.values());
}

/**
 * Seed test data
 */
export function seedTestGenerationRecords(records: GrowthSurfaceGenerationRecord[]): void {
  for (const record of records) {
    generationStore.set(record.id, record);
  }
}
