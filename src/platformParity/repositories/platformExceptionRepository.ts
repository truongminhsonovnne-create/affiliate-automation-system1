/**
 * Platform Exception Repository
 * Repository for managing platform exceptions
 */

import supabase from '../../db/supabaseClient.js';
import type {
  PlatformExceptionRecord,
  PlatformExceptionInput,
  PlatformExceptionStatus,
  PlatformParityGapArea,
  PlatformKey,
} from '../types.js';

export interface ExceptionFilter {
  platformKey?: PlatformKey;
  exceptionArea?: PlatformParityGapArea;
  exceptionStatus?: PlatformExceptionStatus;
  limit?: number;
}

/**
 * Create a new platform exception
 */
export async function createPlatformException(
  input: PlatformExceptionInput
): Promise<PlatformExceptionRecord> {
  const { data, error } = await supabase
    .from('platform_exception_registry')
    .insert({
      platform_key: input.platformKey,
      exception_area: input.exceptionArea,
      exception_status: 'active',
      exception_payload: input.exceptionPayload,
      rationale: input.rationale ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create exception: ${error.message}`);
  }

  return mapToException(data);
}

/**
 * Get exceptions with filters
 */
export async function getPlatformExceptions(
  filter: ExceptionFilter = {}
): Promise<PlatformExceptionRecord[]> {
  let query = supabase
    .from('platform_exception_registry')
    .select('*')
    .order('created_at', { ascending: false });

  if (filter.platformKey) {
    query = query.eq('platform_key', filter.platformKey);
  }

  if (filter.exceptionArea) {
    query = query.eq('exception_area', filter.exceptionArea);
  }

  if (filter.exceptionStatus) {
    query = query.eq('exception_status', filter.exceptionStatus);
  }

  if (filter.limit) {
    query = query.limit(filter.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get exceptions: ${error.message}`);
  }

  return (data ?? []).map(mapToException);
}

/**
 * Get active exceptions
 */
export async function getActiveExceptions(): Promise<PlatformExceptionRecord[]> {
  const { data, error } = await supabase
    .from('platform_exception_registry')
    .select('*')
    .eq('exception_status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get active exceptions: ${error.message}`);
  }

  return (data ?? []).map(mapToException);
}

/**
 * Get exceptions by platform
 */
export async function getExceptionsByPlatform(
  platformKey: PlatformKey
): Promise<PlatformExceptionRecord[]> {
  const { data, error } = await supabase
    .from('platform_exception_registry')
    .select('*')
    .eq('platform_key', platformKey)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get exceptions by platform: ${error.message}`);
  }

  return (data ?? []).map(mapToException);
}

/**
 * Get exception by ID
 */
export async function getExceptionById(
  exceptionId: string
): Promise<PlatformExceptionRecord | null> {
  const { data, error } = await supabase
    .from('platform_exception_registry')
    .select('*')
    .eq('id', exceptionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get exception: ${error.message}`);
  }

  return mapToException(data);
}

/**
 * Update exception status
 */
export async function updateExceptionStatus(
  exceptionId: string,
  status: PlatformExceptionStatus,
  resolvedAt?: Date
): Promise<PlatformExceptionRecord | null> {
  const update: Record<string, unknown> = {
    exception_status: status,
  };

  if (resolvedAt) {
    update.resolved_at = resolvedAt.toISOString();
  }

  const { data, error } = await supabase
    .from('platform_exception_registry')
    .update(update)
    .eq('id', exceptionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update exception status: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapToException(data);
}

/**
 * Resolve an exception
 */
export async function resolveException(
  exceptionId: string
): Promise<PlatformExceptionRecord | null> {
  return updateExceptionStatus(exceptionId, 'resolved', new Date());
}

/**
 * Deprecate an exception
 */
export async function deprecateException(
  exceptionId: string
): Promise<PlatformExceptionRecord | null> {
  return updateExceptionStatus(exceptionId, 'deprecated');
}

/**
 * Get exceptions needing review (older than 90 days)
 */
export async function getExceptionsNeedingReview(): Promise<PlatformExceptionRecord[]> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data, error } = await supabase
    .from('platform_exception_registry')
    .select('*')
    .eq('exception_status', 'active')
    .lt('created_at', ninetyDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get exceptions needing review: ${error.message}`);
  }

  return (data ?? []).map(mapToException);
}

/**
 * Delete old resolved exceptions
 */
export async function deleteOldResolvedExceptions(olderThanDays: number): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const { count, error } = await supabase
    .from('platform_exception_registry')
    .delete()
    .eq('exception_status', 'resolved')
    .lt('resolved_at', cutoffDate.toISOString())
    .select('id', { count: 'exact' });

  if (error) {
    throw new Error(`Failed to delete old exceptions: ${error.message}`);
  }

  return count ?? 0;
}

// Helper functions

function mapToException(row: Record<string, unknown>): PlatformExceptionRecord {
  return {
    id: row.id as string,
    platformKey: row.platform_key as PlatformKey,
    exceptionArea: row.exception_area as PlatformParityGapArea,
    exceptionStatus: row.exception_status as PlatformExceptionStatus,
    exceptionPayload: row.exception_payload as Record<string, unknown>,
    rationale: row.rationale as string | undefined,
    createdAt: new Date(row.created_at as string),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : undefined,
  };
}
