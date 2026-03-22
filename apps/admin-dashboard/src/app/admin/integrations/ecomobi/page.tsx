/**
 * Ecomobi Integration Admin Page
 *
 * Scaffold — UI placeholder for Ecomobi integration management.
 *
 * PENDING: Full UI depends on confirmed Ecomobi API endpoints.
 * This page will be replaced with real data once API credentials are configured.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, ExternalLink, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface HealthCheck {
  connected: boolean;
  apiKeyConfigured: boolean;
  publisherId?: string;
  error?: string;
}

async function fetchEcomobiHealth(): Promise<HealthCheck> {
  const res = await fetch('/api/admin/ecomobi/health', {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any)?.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<HealthCheck>;
}

export default function EcomobiAdminPage() {
  const { data, isLoading, isError, error, refetch } = useQuery<HealthCheck>({
    queryKey: ['ecomobi-health'],
    queryFn: fetchEcomobiHealth,
    refetchInterval: 60_000,
    retry: 2,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ecomobi Integration</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ecomobi Publisher Network integration — SCAFFOLD ONLY
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Pending notice */}
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">Scaffold — Not Production Ready</p>
            <p className="mt-1 text-sm text-amber-700">
              This integration scaffold is in place and ready to be activated once Ecomobi API
              documentation and/or account credentials are available. The sync pipeline and
              data mapper follow the same architecture as MasOffer and AccessTrade.
            </p>
          </div>
        </div>
      </div>

      {/* Connection status */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">Connection Status</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatusCard
            label="API Key"
            value={data?.apiKeyConfigured ? 'Configured' : 'Not set'}
            ok={data?.apiKeyConfigured}
            loading={isLoading}
          />
          <StatusCard
            label="API Connection"
            value={data?.connected ? 'Connected' : 'Not connected'}
            ok={data?.connected}
            loading={isLoading}
          />
          <StatusCard
            label="Publisher ID"
            value={data?.publisherId ?? '—'}
            ok={data?.connected}
            loading={isLoading}
          />
        </div>

        {isError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">
              Health check failed: {error instanceof Error ? error.message : String(error)}
            </p>
          </div>
        )}

        {data?.error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{data.error}</p>
          </div>
        )}
      </div>

      {/* Sync job placeholder */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">Sync Jobs</h2>
        <p className="mt-1 text-sm text-gray-500">
          Sync jobs will appear here once the Ecomobi API endpoint is confirmed and credentials
          are configured. See <code className="text-xs">src/integrations/ecomobi/sync.ts</code>.
        </p>
      </div>

      {/* Documentation link */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">Documentation</h2>
        <p className="mt-1 text-sm text-gray-500">
          See <code className="text-xs">ECOMOBI_INTEGRATION_SCAFFOLD.md</code> for a full overview
          of the scaffold status, what is ready, and what is pending Ecomobi API docs.
        </p>
      </div>
    </div>
  );
}

function StatusCard({
  label,
  value,
  ok,
  loading,
}: {
  label: string;
  value: string;
  ok?: boolean;
  loading: boolean;
}) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        {ok === true && <CheckCircle2 className="h-4 w-4 text-green-600" />}
        {ok === false && <AlertCircle className="h-4 w-4 text-amber-500" />}
        <p className="text-sm font-medium text-gray-900">
          {loading ? '—' : value}
        </p>
      </div>
    </div>
  );
}
