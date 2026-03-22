/**
 * MasOffer Sync — Shared type definitions
 *
 * The admin dashboard proxies sync requests to the control plane
 * (see: src/app/api/admin/masoffer/sync/route.ts).
 * The actual sync logic lives in the control plane.
 */

export interface SyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  durationMs: number;
}
