/**
 * AccessTrade Integration — Admin Dashboard Page
 *
 * Internal admin tool for monitoring and triggering AccessTrade sync jobs.
 * Displays connection health, last sync run, and manual trigger controls.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/admin/layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { RefreshCw, CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ApiConnection {
  success: boolean;
  responseTimeMs: number;
  testedAt: string;
  campaignCount?: number;
  error?: string;
}

interface LastSyncRun {
  jobName: string;
  status: string;
  startedAt: string;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errorSummary: string | null;
}

interface HealthCheck {
  apiKeyConfigured: boolean;
  apiConnection: ApiConnection;
  database: { connected: boolean; offerCount: number };
  lastSyncRun: LastSyncRun | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ── StatusBadge ──────────────────────────────────────────────────────────────

function StatusDot({ variant }: { variant: 'success' | 'error' | 'warning' | 'neutral' }) {
  const colors: Record<string, string> = {
    success: 'bg-[var(--success-500)]',
    error: 'bg-[var(--error-500)]',
    warning: 'bg-[var(--warning-500)]',
    neutral: 'bg-[var(--gray-400)]',
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[variant]}`}
      style={{ minWidth: 8, minHeight: 8 }}
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AccessTradeIntegrationPage() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/admin/accesstrade/health', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data: HealthCheck = await res.json();
      setHealth(data);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleSync = async (type: 'deals' | 'campaigns') => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/admin/accesstrade/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      await fetchHealth();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const { apiConnection, database, lastSyncRun } = health ?? {
    apiConnection: { success: false, responseTimeMs: 0, testedAt: '', error: 'Not loaded' },
    database: { connected: false, offerCount: 0 },
    lastSyncRun: null,
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      <PageHeader
        title="AccessTrade Integration"
        description="Monitor connection health, sync status, and trigger manual syncs for the AccessTrade voucher pipeline."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchHealth}
            loading={loading}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        }
      />

      {/* Error Banner */}
      {syncError && (
        <div
          className="mb-6 p-3 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--error-50)',
            border: '1px solid var(--error-200)',
            color: 'var(--error-700)',
          }}
        >
          <strong>Error:</strong> {syncError}
        </div>
      )}

      {/* ── API Connection ─────────────────────────────────── */}
      <Card padding="md" className="mb-6">
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: 'var(--gray-500)' }}
        >
          API Connection
        </h2>

        {loading && !health ? (
          <p style={{ color: 'var(--gray-400)', fontSize: 'var(--font-sm)' }}>Checking…</p>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {/* API Key */}
            <div className="flex items-center gap-2">
              {health?.apiKeyConfigured ? (
                <CheckCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--success-500)' }} />
              ) : (
                <XCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--error-500)' }} />
              )}
              <div>
                <div className="text-sm font-medium">API Key</div>
                <div className="text-xs" style={{ color: 'var(--gray-500)' }}>
                  {health?.apiKeyConfigured ? 'Configured' : 'Not configured'}
                </div>
              </div>
            </div>

            {/* Connection */}
            <div className="flex items-center gap-2">
              {apiConnection.success ? (
                <CheckCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--success-500)' }} />
              ) : (
                <XCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--error-500)' }} />
              )}
              <div>
                <div className="text-sm font-medium">API Reachability</div>
                <div className="text-xs" style={{ color: 'var(--gray-500)' }}>
                  {apiConnection.success
                    ? `Reachable · ${formatDuration(apiConnection.responseTimeMs)}`
                    : apiConnection.error ?? 'Failed'}
                </div>
              </div>
            </div>

            {/* Campaign Count */}
            {apiConnection.campaignCount !== undefined && (
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--brand-600)' }}>
                  {apiConnection.campaignCount.toLocaleString()}
                </div>
                <div className="text-xs" style={{ color: 'var(--gray-500)' }}>campaigns in AccessTrade</div>
              </div>
            )}

            {/* Supabase */}
            <div className="flex items-center gap-2">
              {database.connected ? (
                <CheckCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--success-500)' }} />
              ) : (
                <XCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--error-500)' }} />
              )}
              <div>
                <div className="text-sm font-medium">Supabase</div>
                <div className="text-xs" style={{ color: 'var(--gray-500)' }}>
                  {database.connected
                    ? `${database.offerCount.toLocaleString()} offers`
                    : 'Disconnected'}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Last Sync Run ────────────────────────────────── */}
      <Card padding="md" className="mb-6">
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: 'var(--gray-500)' }}
        >
          Last Sync Run
        </h2>

        {lastSyncRun ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <StatusDot
                variant={
                  lastSyncRun.status === 'completed'
                    ? 'success'
                    : lastSyncRun.status === 'failed'
                    ? 'error'
                    : 'warning'
                }
              />
              <span className="text-sm font-medium">{lastSyncRun.jobName}</span>
              <Badge color={lastSyncRun.status === 'completed' ? 'success' : lastSyncRun.status === 'failed' ? 'error' : 'warning'} size="sm">
                {lastSyncRun.status}
              </Badge>
              <span className="text-xs" style={{ color: 'var(--gray-400)' }}>
                {formatDate(lastSyncRun.startedAt)}
              </span>
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, auto)', justifyContent: 'start', columnGap: '2rem' }}>
              {[
                { label: 'Inserted', value: lastSyncRun.recordsInserted, color: 'var(--brand-600)' },
                { label: 'Updated', value: lastSyncRun.recordsUpdated, color: 'var(--blue-600)' },
                { label: 'Skipped', value: lastSyncRun.recordsSkipped, color: 'var(--gray-400)' },
                { label: 'Fetched', value: lastSyncRun.recordsFetched },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="text-sm font-semibold" style={{ color: color ?? 'var(--gray-900)' }}>
                    {value.toLocaleString()}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--gray-500)' }}>{label}</div>
                </div>
              ))}
            </div>

            {lastSyncRun.errorSummary && (
              <div
                className="mt-3 p-2 rounded-md text-xs"
                style={{ backgroundColor: 'var(--error-50)', color: 'var(--error-700)' }}
              >
                {lastSyncRun.errorSummary}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--gray-400)' }}>
            <ClockIcon className="h-4 w-4" />
            No sync runs yet — trigger a manual sync below.
          </div>
        )}
      </Card>

      {/* ── Manual Sync ──────────────────────────────────── */}
      <Card padding="md">
        <div className="mb-4">
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: 'var(--gray-500)' }}
          >
            Manual Sync
          </h2>
          <p className="text-xs" style={{ color: 'var(--gray-400)' }}>
            Sync jobs run automatically on schedule. Use these for on-demand refreshes.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            loading={syncing}
            onClick={() => handleSync('deals')}
          >
            Sync Deals / Vouchers
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={syncing}
            onClick={() => handleSync('campaigns')}
          >
            Sync Campaigns
          </Button>
        </div>
      </Card>
    </div>
  );
}
