/**
 * System Health API Client — Browser-safe client for the health debug surface.
 *
 * NOTE: This module calls /api/admin/proxy which requires admin authentication.
 * Do NOT use this in public/browser-facing code.
 */

import type {
  SystemHealthResponse,
} from '@/app/api/admin/debug/system-health/route';

export interface HealthApiClient {
  fetchSystemHealth(hours?: number): Promise<SystemHealthResponse>;
}

class HealthApiClientImpl implements HealthApiClient {
  private baseUrl = '/api/admin/proxy';

  async fetchSystemHealth(hours = 24): Promise<SystemHealthResponse> {
    const url = `${this.baseUrl}?path=${encodeURIComponent('/api/admin/debug/system-health?hours=' + hours)}`;

    const response = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        `System health API error: ${response.status} — ${(body as any)?.message ?? response.statusText}`
      );
    }

    return response.json() as Promise<SystemHealthResponse>;
  }
}

let _client: HealthApiClient | null = null;

export function getHealthApiClient(): HealthApiClient {
  if (!_client) _client = new HealthApiClientImpl();
  return _client;
}

// ── React Query hook ─────────────────────────────────────────────────────────

/**
 * NOTE: This is a server-side admin-only hook.
 * Import only in /admin/* pages.
 */
export function useSystemHealth() {
  // Imported dynamically per-page to avoid circular deps
  return getHealthApiClient();
}
