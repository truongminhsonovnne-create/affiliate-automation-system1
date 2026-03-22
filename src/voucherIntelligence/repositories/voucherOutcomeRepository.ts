/**
 * Voucher Outcome Repository
 *
 * Database operations for voucher resolution outcomes
 */

import { randomUUID } from 'crypto';
import {
  VoucherOutcomeSession,
  Platform,
  VoucherOutcomeAttributionContext,
} from '../types/index.js';

// In-memory storage (replace with actual DB calls in production)
const outcomes = new Map<string, VoucherOutcomeSession>();

/**
 * Create a new outcome record
 */
export async function createOutcome(
  params: {
    resolutionRequestId?: string;
    platform: Platform;
    normalizedUrl: string;
    productContext?: Record<string, unknown>;
    bestVoucherId?: string;
    shownVoucherIds: string[];
    growthSurfaceType?: string;
    attributionContext?: VoucherOutcomeAttributionContext;
  }
): Promise<VoucherOutcomeSession> {
  const outcome: VoucherOutcomeSession = {
    id: randomUUID(),
    resolutionRequestId: params.resolutionRequestId,
    platform: params.platform,
    normalizedUrl: params.normalizedUrl,
    productContext: params.productContext,
    bestVoucherId: params.bestVoucherId,
    shownVoucherIds: params.shownVoucherIds,
    growthSurfaceType: params.growthSurfaceType,
    attributionContext: params.attributionContext,
    signals: [],
    createdAt: new Date(),
  };

  outcomes.set(outcome.id, outcome);
  return outcome;
}

/**
 * Get outcome by ID
 */
export async function getOutcomeById(id: string): Promise<VoucherOutcomeSession | null> {
  return outcomes.get(id) || null;
}

/**
 * Get outcomes by platform
 */
export async function getOutcomesByPlatform(
  platform: Platform,
  options?: { limit?: number; offset?: number }
): Promise<VoucherOutcomeSession[]> {
  const all = Array.from(outcomes.values()).filter(o => o.platform === platform);
  const offset = options?.offset || 0;
  const limit = options?.limit || 100;
  return all.slice(offset, offset + limit);
}

/**
 * Get outcomes in time range
 */
export async function getOutcomesInTimeRange(
  start: Date,
  end: Date,
  platform?: Platform
): Promise<VoucherOutcomeSession[]> {
  return Array.from(outcomes.values()).filter(o => {
    const inRange = o.createdAt >= start && o.createdAt <= end;
    const matchesPlatform = !platform || o.platform === platform;
    return inRange && matchesPlatform;
  });
}

/**
 * Update outcome
 */
export async function updateOutcome(
  id: string,
  updates: Partial<VoucherOutcomeSession>
): Promise<VoucherOutcomeSession | null> {
  const existing = outcomes.get(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates };
  outcomes.set(id, updated);
  return updated;
}

/**
 * Delete outcome
 */
export async function deleteOutcome(id: string): Promise<boolean> {
  return outcomes.delete(id);
}

/**
 * Get outcome count
 */
export async function getOutcomeCount(platform?: Platform): Promise<number> {
  if (platform) {
    return Array.from(outcomes.values()).filter(o => o.platform === platform).length;
  }
  return outcomes.size;
}

/**
 * Clear all outcomes (for testing)
 */
export async function clearOutcomes(): Promise<void> {
  outcomes.clear();
}
