/**
 * subscription-store.ts — Lightweight subscription persistence (v1: localStorage only).
 *
 * This module handles all subscription CRUD operations.
 * Backend is not required to run — data is persisted in localStorage.
 * Swap `store.ts` implementation for a real DB/API call when backend is ready.
 *
 * Subscription shape:
 *   { id, email, target: { type: 'shop'|'category'|'keyword', value, label }, createdAt, active }
 */

export type TargetType = 'shop' | 'category' | 'keyword';

export interface SubscriptionTarget {
  type: TargetType;
  value: string;   // shop_id or category slug
  label: string;   // display name shown to user
}

export interface Subscription {
  id: string;
  email: string;
  target: SubscriptionTarget;
  createdAt: number; // Unix ms
  active: boolean;
}

// ── localStorage key ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'vf_subscriptions';

/** Generate a stable local ID. */
function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Read / Write ──────────────────────────────────────────────────────────────

function readAll(): Subscription[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Subscription[]) : [];
  } catch {
    return [];
  }
}

function writeAll(subs: Subscription[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Subscribe an email to a target.
 * - Deduplicates by email + target.value (no double-subscriptions).
 * - Keeps at most MAX_SUBSCRIPTIONS to avoid localStorage bloat.
 */
export const MAX_SUBSCRIPTIONS = 20;

export function subscribe(email: string, target: SubscriptionTarget): Subscription {
  const subs = readAll();

  // Deduplicate
  const existing = subs.find(
    (s) => s.email === email && s.target.value === target.value
  );
  if (existing) return existing;

  const next: Subscription = {
    id: genId(),
    email,
    target,
    createdAt: Date.now(),
    active: true,
  };

  const updated = [next, ...subs].slice(0, MAX_SUBSCRIPTIONS);
  writeAll(updated);
  return next;
}

/** Get all subscriptions for an email address. */
export function getByEmail(email: string): Subscription[] {
  return readAll().filter((s) => s.email === email);
}

/** Unsubscribe (soft-delete) a subscription by id. */
export function unsubscribe(id: string): boolean {
  const subs = readAll();
  const idx = subs.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  subs[idx] = { ...subs[idx], active: false };
  writeAll(subs);
  return true;
}

/** Check whether a target is already subscribed (used to pre-fill UI state). */
export function isSubscribed(value: string): boolean {
  return readAll().some((s) => s.active && s.target.value === value);
}

/** Total active subscription count (used for analytics). */
export function activeCount(): number {
  return readAll().filter((s) => s.active).length;
}

/** Return the full localStorage payload — useful for future backend migration. */
export function exportAll(): Subscription[] {
  return readAll().filter((s) => s.active);
}
