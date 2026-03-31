'use client';

/**
 * History Context — provides lookup history state and actions to child components.
 *
 * Architecture:
 *   - State lives here, derived from localStorage
 *   - Exposes an async API so it's trivially swappable to a backend later
 *   - Children access via useHistory() hook
 *
 * Security: Only stores URLs, generic voucher metadata, timestamps.
 * No personal data, no auth tokens, no sensitive product info.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  LookupHistoryEntry,
  LookupResult,
} from './history-types';
import { HISTORY_CONFIG } from './history-types';
import {
  LocalStorageHistoryAdapter,
  buildHistoryEntry,
  type HistoryStorageAdapter,
} from './history-storage';
import type { ResolutionState } from './api-client';

// =============================================================================
// Types
// =============================================================================

export interface HistoryContextValue {
  /** All history entries sorted by recency (pinned first) */
  entries: LookupHistoryEntry[];

  /** Whether history is still loading from storage */
  isLoading: boolean;

  /** The most recent successful entry (quick access) */
  lastSuccessful: LookupHistoryEntry | null;

  /** Count of entries */
  totalCount: number;

  /** Count of successful entries */
  successCount: number;

  /** Add a new entry after a lookup */
  addEntry: (inputUrl: string, state: ResolutionState) => Promise<void>;

  /** Toggle pin on an entry */
  togglePin: (id: string) => Promise<void>;

  /** Delete a single entry */
  deleteEntry: (id: string) => Promise<void>;

  /** Delete multiple entries */
  deleteEntries: (ids: string[]) => Promise<void>;

  /** Clear all history */
  clearAll: () => Promise<void>;

  /** Rehydrate from a selected history entry (load result into parent state) */
  restoreEntry: (entry: LookupHistoryEntry) => RestoreResult;
}

export interface RestoreResult {
  url: string;
  state: ResolutionState;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LookupHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use useRef for lazy client-only initialization.
  // NEVER instantiate LocalStorageHistoryAdapter during SSR — class instances
  // cannot cross the RSC Server→Client boundary (they're not serializable).
  // The storage ref is initialized inside useEffect (client-only), so it
  // is always null on the server and created on the client.
  const storageRef = useRef<HistoryStorageAdapter | null>(null);

  // Load from storage on mount (client-only)
  useEffect(() => {
    // Initialize adapter here — guaranteed client-side only
    if (!storageRef.current) {
      storageRef.current = new LocalStorageHistoryAdapter();
    }
    const storage = storageRef.current;
    let cancelled = false;

    storage.load().then((loaded) => {
      if (!cancelled) {
        setEntries(loaded);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Add a new entry
  const addEntry = useCallback(
    async (inputUrl: string, state: ResolutionState) => {
      if (!storageRef.current) return;
      const entry = buildHistoryEntry(inputUrl, state);
      await storageRef.current.save(entry);

      setEntries((prev) => {
        const pinned = prev.filter((e) => e.pinned);
        const unpinned = [entry, ...prev.filter((e) => !e.pinned)].slice(
          0,
          HISTORY_CONFIG.MAX_UNPINNED_ENTRIES
        );
        return [...pinned, ...unpinned].sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return (
            new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
          );
        });
      });
    },
    [storageRef]
  );

  // Toggle pin
  const togglePin = useCallback(
    async (id: string) => {
      if (!storageRef.current) return;
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;

      const newPinned = !entry.pinned;
      await storageRef.current.update(id, { pinned: newPinned });

      setEntries((prev) =>
        prev
          .map((e) => (e.id === id ? { ...e, pinned: newPinned } : e))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return (
              new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
            );
          })
      );
    },
    [entries, storageRef]
  );

  // Delete single entry
  const deleteEntry = useCallback(
    async (id: string) => {
      if (!storageRef.current) return;
      await storageRef.current.delete(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [storageRef]
  );

  // Delete multiple entries
  const deleteEntries = useCallback(
    async (ids: string[]) => {
      if (!storageRef.current) return;
      await storageRef.current.deleteMany(ids);
      const idSet = new Set(ids);
      setEntries((prev) => prev.filter((e) => !idSet.has(e.id)));
    },
    [storageRef]
  );

  // Clear all
  const clearAll = useCallback(async () => {
    if (!storageRef.current) return;
    await storageRef.current.clear();
    setEntries([]);
  }, [storageRef]);

  // Restore entry → ResolutionState
  const restoreEntry = useCallback(
    (entry: LookupHistoryEntry): RestoreResult => {
      const state: ResolutionState = {
        status: entry.outcome as ResolutionState['status'],
        requestId: entry.id,
        bestMatch: entry.result?.bestMatch ?? null,
        candidates: entry.result?.candidates ?? [],
        performance: entry.performance ?? null,
        warnings: entry.warnings,
        explanation: entry.result?.explanation ?? null,
        error: null,
        confidenceScore: entry.confidenceScore,
        matchedSource: entry.matchedSource,
        dataFreshness: entry.dataFreshness,
      };

      return {
        url: entry.inputUrl,
        state,
      };
    },
    []
  );

  // Derived values
  const lastSuccessful =
    entries.find((e) => e.outcome === 'success') ?? null;

  const value: HistoryContextValue = {
    entries,
    isLoading,
    lastSuccessful,
    totalCount: entries.length,
    successCount: entries.filter((e) => e.outcome === 'success').length,
    addEntry,
    togglePin,
    deleteEntry,
    deleteEntries,
    clearAll,
    restoreEntry,
  };

  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access history context. Must be used inside <HistoryProvider>.
 */
export function useHistory(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) {
    throw new Error('useHistory must be used inside <HistoryProvider>');
  }
  return ctx;
}
