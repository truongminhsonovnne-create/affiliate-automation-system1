/**
 * Governance Signal Intake Service
 *
 * Handles signal ingestion, deduplication, and prioritization.
 */

import {
  ProductGovernanceSignal,
  ProductGovernanceSignalType,
  ProductGovernanceSeverity,
} from '../types';

export interface GovernanceSignalInput {
  signalType: ProductGovernanceSignalType;
  signalSource: string;
  severity: ProductGovernanceSeverity;
  targetEntityType?: string;
  targetEntityId?: string;
  payload: Record<string, unknown>;
}

export interface SignalDedupeKey {
  signalType: ProductGovernanceSignalType;
  targetEntityType: string;
  targetEntityId: string;
}

export interface SignalPriority {
  score: number;
  category: 'blocking' | 'warning' | 'info';
}

/**
 * Ingest a single governance signal
 */
export async function ingestGovernanceSignal(
  signal: GovernanceSignalInput
): Promise<ProductGovernanceSignal> {
  // Validate signal
  validateSignal(signal);

  // Check for duplicates
  const dupeKey = buildDedupeKey(signal);
  const existing = await findExistingSignal(dupeKey);

  if (existing) {
    // Update existing signal instead of creating new
    return updateExistingSignal(existing, signal);
  }

  // Create new signal
  return createNewSignal(signal);
}

/**
 * Ingest multiple governance signals in batch
 */
export async function ingestGovernanceSignals(
  signals: GovernanceSignalInput[]
): Promise<ProductGovernanceSignal[]> {
  const results: ProductGovernanceSignal[] = [];

  for (const signal of signals) {
    const result = await ingestGovernanceSignal(signal);
    results.push(result);
  }

  return results;
}

/**
 * Check if a signal is a duplicate
 */
export function dedupeGovernanceSignal(
  newSignal: GovernanceSignalInput,
  existingSignals: ProductGovernanceSignal[]
): boolean {
  const newKey = buildDedupeKey(newSignal);

  return existingSignals.some(existing => {
    const existingKey = {
      signalType: existing.signalType,
      targetEntityType: existing.targetEntityType,
      targetEntityId: existing.targetEntityId,
    };

    return (
      newKey.signalType === existingKey.signalType &&
      newKey.targetEntityType === existingKey.targetEntityType &&
      newKey.targetEntityId === existingKey.targetEntityId
    );
  });
}

/**
 * Calculate priority score for a signal
 */
export function prioritizeGovernanceSignal(
  signal: ProductGovernanceSignal
): SignalPriority {
  // Base score from severity
  let score = 0;
  switch (signal.severity) {
    case ProductGovernanceSeverity.CRITICAL:
      score = 100;
      break;
    case ProductGovernanceSeverity.HIGH:
      score = 75;
      break;
    case ProductGovernanceSeverity.MEDIUM:
      score = 50;
      break;
    case ProductGovernanceSeverity.LOW:
      score = 25;
      break;
  }

  // Add weight based on signal type
  const typeWeights: Record<ProductGovernanceSignalType, number> = {
    [ProductGovernanceSignalType.PRODUCT_OPS_CASE]: 20,
    [ProductGovernanceSignalType.EXPERIMENT_GUARDRAIL]: 20,
    [ProductGovernanceSignalType.STAGING_FAILURE]: 15,
    [ProductGovernanceSignalType.QA_REGRESSION]: 15,
    [ProductGovernanceSignalType.OPERATIONAL_ISSUE]: 15,
    [ProductGovernanceSignalType.NO_MATCH_SPIKE]: 10,
    [ProductGovernanceSignalType.RANKING_QUALITY]: 10,
    [ProductGovernanceSignalType.TUNING_CHANGE]: 5,
    [ProductGovernanceSignalType.RELEASE_VERIFICATION]: 5,
  };

  score += typeWeights[signal.signalType] || 0;

  // Calculate age factor (newer signals get slight boost)
  const hoursOld = (Date.now() - new Date(signal.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursOld < 24) {
    score += 10;
  } else if (hoursOld < 72) {
    score += 5;
  }

  // Determine category
  let category: 'blocking' | 'warning' | 'info';
  if (
    signal.severity === ProductGovernanceSeverity.CRITICAL ||
    signal.severity === ProductGovernanceSeverity.HIGH
  ) {
    category = 'blocking';
  } else if (signal.severity === ProductGovernanceSeverity.MEDIUM) {
    category = 'warning';
  } else {
    category = 'info';
  }

  return { score, category };
}

/**
 * Get signals by priority (highest first)
 */
export function getSignalsByPriority(
  signals: ProductGovernanceSignal[]
): ProductGovernanceSignal[] {
  return signals
    .map(signal => ({
      signal,
      priority: prioritizeGovernanceSignal(signal),
    }))
    .sort((a, b) => b.priority.score - a.priority.score)
    .map(item => item.signal);
}

/**
 * Filter signals by blocking capability
 */
export function getBlockingSignals(
  signals: ProductGovernanceSignal[]
): ProductGovernanceSignal[] {
  return signals.filter(
    signal =>
      signal.severity === ProductGovernanceSeverity.CRITICAL ||
      signal.severity === ProductGovernanceSeverity.HIGH
  );
}

/**
 * Filter signals by warning capability
 */
export function getWarningSignals(
  signals: ProductGovernanceSignal[]
): ProductGovernanceSignal[] {
  return signals.filter(
    signal => signal.severity === ProductGovernanceSeverity.MEDIUM
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function validateSignal(signal: GovernanceSignalInput): void {
  if (!signal.signalType) {
    throw new Error('Signal type is required');
  }
  if (!signal.signalSource) {
    throw new Error('Signal source is required');
  }
  if (!signal.severity) {
    throw new Error('Signal severity is required');
  }
}

function buildDedupeKey(signal: GovernanceSignalInput): SignalDedupeKey {
  return {
    signalType: signal.signalType,
    targetEntityType: signal.targetEntityType || 'unknown',
    targetEntityId: signal.targetEntityId || 'unknown',
  };
}

// Simulated database operations - in real implementation, use repositories
async function findExistingSignal(
  dupeKey: SignalDedupeKey
): Promise<ProductGovernanceSignal | null> {
  // In real implementation, query the database
  // This is a placeholder
  return null;
}

async function updateExistingSignal(
  existing: ProductGovernanceSignal,
  newSignal: GovernanceSignalInput
): Promise<ProductGovernanceSignal> {
  // In real implementation, update the database
  return {
    ...existing,
    payload: { ...existing.payload, ...newSignal.payload },
    isActive: true,
  };
}

async function createNewSignal(
  signal: GovernanceSignalInput
): Promise<ProductGovernanceSignal> {
  // In real implementation, insert into database
  return {
    id: crypto.randomUUID(),
    signalType: signal.signalType,
    signalSource: signal.signalSource,
    severity: signal.severity,
    targetEntityType: signal.targetEntityType || null,
    targetEntityId: signal.targetEntityId || null,
    payload: signal.payload,
    isActive: true,
    createdAt: new Date(),
  };
}
