// =============================================================================
// Admin Debug Endpoint — Resolve Pipeline Statistics
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPublicResolutionCacheStats } from '../../../../../src/publicApi/cache/publicResolutionCache.js';
import { getInflightRequestCount } from '../../../../../src/publicApi/cache/publicResolutionCache.js';
import { getAllSourceHealth } from '../../../../../src/publicApi/resilience/sourceHealthTracker.js';
import { resetAllSourceHealth } from '../../../../../src/publicApi/resilience/sourceHealthTracker.js';
import { getPublicApiMetrics } from '../../../../../src/publicApi/observability/publicResolutionMetrics.js';
import { pruneTraces } from '../../../../../src/publicApi/instrumentation/resolvePipelineLogger.js';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL;

export async function GET(request: NextRequest) {
  // Simple bearer-token auth — replace with proper admin auth in production
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET || 'admin-debug-token'}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const action = searchParams.get('action');

  if (action === 'reset-health') {
    resetAllSourceHealth();
    return NextResponse.json({ ok: true, message: 'Source health reset.' });
  }

  if (action === 'prune-traces') {
    const cutoffMs = Number(searchParams.get('cutoffMs') ?? 300_000);
    const pruned = pruneTraces(cutoffMs);
    return NextResponse.json({ ok: true, pruned });
  }

  // Fetch upstream stats if INTERNAL_API_URL is available
  let upstreamStats: Record<string, unknown> | null = null;
  if (INTERNAL_API_URL) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${INTERNAL_API_URL}/api/v1/admin/debug/resolve-stats`, {
        headers: {
          Authorization: `Bearer ${process.env.ADMIN_SECRET || 'admin-debug-token'}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        upstreamStats = await res.json();
      }
    } catch {
      upstreamStats = { error: 'Upstream unreachable' };
    }
  }

  const [cacheStats, sourceHealth, metrics, inflightCount] = await Promise.all([
    Promise.resolve(getPublicResolutionCacheStats()),
    Promise.resolve(getAllSourceHealth()),
    Promise.resolve(getPublicApiMetrics()),
    Promise.resolve(getInflightRequestCount()),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    uptime: {
      processUptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
    },
    cache: {
      size: cacheStats.size,
      hitRate: cacheStats.hitRate,
      totalHits: cacheStats.totalHits,
      oldestEntry: cacheStats.oldestEntry,
      newestEntry: cacheStats.newestEntry,
    },
    inflight: {
      count: inflightCount,
    },
    sourceHealth: sourceHealth.map((s) => ({
      sourceId: s.sourceId,
      state: s.state,
      failureCount: s.failureCount,
      consecutiveSuccesses: s.consecutiveSuccesses,
      lastFailureTime: s.lastFailureTime ? new Date(s.lastFailureTime).toISOString() : null,
      lastSuccessTime: s.lastSuccessTime ? new Date(s.lastSuccessTime).toISOString() : null,
      cooldownUntil: s.cooldownUntil ? new Date(s.cooldownUntil).toISOString() : null,
      isInCooldown: s.isInCooldown,
    })),
    metrics: {
      ...metrics,
      // Human-readable latency buckets
      latencyBuckets: {
        '<50ms': metrics['public.latency.bucket.0_50'] ?? 0,
        '50-100ms': metrics['public.latency.bucket.50_100'] ?? 0,
        '100-200ms': metrics['public.latency.bucket.100_200'] ?? 0,
        '200-500ms': metrics['public.latency.bucket.200_500'] ?? 0,
        '500-1000ms': metrics['public.latency.bucket.500_1000'] ?? 0,
        '>1000ms': metrics['public.latency.bucket.1000_plus'] ?? 0,
      },
    },
    upstream: upstreamStats ?? null,
  });
}
