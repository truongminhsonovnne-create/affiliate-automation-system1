/**
 * History Storage Abstraction
 *
 * Provides a clean interface for lookup history persistence.
 * Currently backed by localStorage — swap to a backend API by changing
 * the `StorageAdapter` implementation without touching any consumers.
 *
 * Security: No sensitive data is stored. Only URLs (which users already
 * submitted), generic voucher metadata, and timestamps.
 */

const uuidv4 = () => crypto.randomUUID();
import type {
  LookupHistoryEntry,
  LookupResult,
  PerformanceMeta,
  WarningItem,
  LookupOutcome,
  HistoryStorageData,
} from './history-types';
import {
  HISTORY_CONFIG,
  getOutcomeLabel,
  getOutcomeDescription,
  buildDisplayLabel,
} from './history-types';
import type {
  ResolutionState,
  BestMatchCard,
  CandidateCard,
  ExplanationCard,
} from './api-client';

// =============================================================================
// Storage Adapter Interface
// =============================================================================

/**
 * Abstract storage adapter — implement this to swap to backend persistence.
 * All methods return Promises to mirror async backend operations.
 */
export interface HistoryStorageAdapter {
  /** Load all history entries */
  load(): Promise<LookupHistoryEntry[]>;

  /** Save a new entry */
  save(entry: LookupHistoryEntry): Promise<void>;

  /** Update an existing entry */
  update(id: string, patch: Partial<LookupHistoryEntry>): Promise<void>;

  /** Delete an entry by ID */
  delete(id: string): Promise<void>;

  /** Delete multiple entries by ID */
  deleteMany(ids: string[]): Promise<void>;

  /** Clear all entries */
  clear(): Promise<void>;
}

// =============================================================================
// LocalStorage Adapter
// =============================================================================

export class LocalStorageHistoryAdapter implements HistoryStorageAdapter {
  private readonly key: string;

  constructor(storageKey = HISTORY_CONFIG.STORAGE_KEY) {
    this.key = storageKey;
  }

  private read(): HistoryStorageData {
    if (typeof window === 'undefined') {
      return { version: 1, entries: [], lastCleanupAt: new Date().toISOString() };
    }

    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) {
        return { version: 1, entries: [], lastCleanupAt: new Date().toISOString() };
      }
      const parsed = JSON.parse(raw) as HistoryStorageData;
      // Basic validation
      if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
        return { version: 1, entries: [], lastCleanupAt: new Date().toISOString() };
      }
      return parsed;
    } catch {
      return { version: 1, entries: [], lastCleanupAt: new Date().toISOString() };
    }
  }

  private write(data: HistoryStorageData): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(this.key, JSON.stringify(data));
    } catch {
      // Storage full — silently skip write
    }
  }

  async load(): Promise<LookupHistoryEntry[]> {
    const data = this.read();
    const cutoff = Date.now() - HISTORY_CONFIG.MAX_ENTRY_AGE_MS;

    // Prune old entries on load
    const valid = data.entries.filter(
      (e) => new Date(e.performedAt).getTime() > cutoff
    );

    if (valid.length !== data.entries.length) {
      this.write({
        ...data,
        entries: valid,
        lastCleanupAt: new Date().toISOString(),
      });
    }

    // Sort: pinned first, then by performedAt descending
    return valid.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime();
    });
  }

  async save(entry: LookupHistoryEntry): Promise<void> {
    const data = this.read();

    // Enforce max entries for unpinned (keep all pinned)
    const pinnedEntries = data.entries.filter((e) => e.pinned);
    const unpinnedEntries = data.entries
      .filter((e) => !e.pinned)
      .sort(
        (a, b) =>
          new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
      );

    const trimmedUnpinned = unpinnedEntries.slice(
      0,
      HISTORY_CONFIG.MAX_UNPINNED_ENTRIES - 1
    );

    const allEntries = [...pinnedEntries, ...trimmedUnpinned, entry];
    // Re-sort after insert
    allEntries.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime();
    });

    this.write({ ...data, entries: allEntries, lastCleanupAt: new Date().toISOString() });
  }

  async update(id: string, patch: Partial<LookupHistoryEntry>): Promise<void> {
    const data = this.read();
    const idx = data.entries.findIndex((e) => e.id === id);
    if (idx === -1) return;
    data.entries[idx] = { ...data.entries[idx], ...patch };
    this.write(data);
  }

  async delete(id: string): Promise<void> {
    const data = this.read();
    data.entries = data.entries.filter((e) => e.id !== id);
    this.write(data);
  }

  async deleteMany(ids: string[]): Promise<void> {
    const data = this.read();
    const idSet = new Set(ids);
    data.entries = data.entries.filter((e) => !idSet.has(e.id));
    this.write(data);
  }

  async clear(): Promise<void> {
    this.write({ version: 1, entries: [], lastCleanupAt: new Date().toISOString() });
  }
}

// =============================================================================
// History Entry Builder
// =============================================================================

/**
 * Build a LookupHistoryEntry from API resolution state.
 * Call this immediately after a successful API response.
 */
export function buildHistoryEntry(
  inputUrl: string,
  state: ResolutionState
): LookupHistoryEntry {
  const platform = extractPlatform(inputUrl);
  const displayLabel = buildDisplayLabel(inputUrl);
  const outcome: LookupOutcome = state.status as LookupOutcome;
  const result = buildLookupResult(state);

  return {
    id: uuidv4(),
    inputUrl,
    platform,
    displayLabel,
    performedAt: new Date().toISOString(),
    outcome,
    outcomeLabel: getOutcomeLabel(outcome),
    outcomeDescription: getOutcomeDescription(outcome, result),
    result,
    performance: state.performance ?? null,
    warnings: state.warnings,
    pinned: false,
    confidenceScore: state.confidenceScore,
    matchedSource: state.matchedSource,
    dataFreshness: state.dataFreshness,
  };
}

function buildLookupResult(
  state: ResolutionState
): LookupResult | null {
  if (state.status !== 'success' || !state.bestMatch) return null;

  const best = state.bestMatch;
  const candidates = state.candidates;
  const expiry = best.validUntil;
  const isExpired = expiry ? new Date(expiry).getTime() < Date.now() : false;

  return {
    bestMatch: best,
    candidates,
    explanation: state.explanation,
    bestDiscountText: best.headline || formatDiscount(best),
    bestCode: best.code,
    candidateCount: candidates.length,
    bestVoucherExpiry: expiry,
    isExpired,
  };
}

function formatDiscount(v: BestMatchCard): string {
  return v.discountValue;
}

function extractPlatform(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('shopee')) return 'shopee';
  if (lower.includes('lazada')) return 'lazada';
  if (lower.includes('tiki')) return 'tiki';
  if (lower.includes('tiktok')) return 'tiktok';
  return 'unknown';
}
