/**
 * AccessTrade Integration Routes
 *
 * Handles:
 *  - GET  /internal/integrations/accesstrade/health  — connection + DB health check
 *  - POST /internal/integrations/accesstrade/sync     — trigger a sync job
 *
 * Auth: requires x-internal-secret (set by the admin proxy).
 */

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuthentication } from '../middleware/authGuard.js';
import { env } from '../../../config/env.js';
import { getAccessTradeApiClient } from '../../../integrations/accesstrade/client.js';
import {
  getOfferCount,
  getLastSyncRun,
} from '../../../integrations/accesstrade/supabase.js';
import {
  syncAccessTradeDeals,
  syncAccessTradeCampaigns,
} from '../../../integrations/accesstrade/syncService.js';

const router = Router();

// All routes require internal auth
router.use(requireAuthentication);

// ── GET /internal/integrations/accesstrade/health ─────────────────────────────

router.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  // ── API connectivity check ───────────────────────────────
  const client = getAccessTradeApiClient();
  const apiKeyConfigured = client.isConfigured();

  let apiResult: {
    success: boolean;
    responseTimeMs: number;
    testedAt: string;
    campaignCount?: number;
    error?: string;
  };

  if (!apiKeyConfigured) {
    apiResult = {
      success: false,
      responseTimeMs: 0,
      testedAt: new Date().toISOString(),
      error: 'ACCESSTRADE_API_KEY is not configured',
    };
  } else {
    try {
      apiResult = await client.testConnection();
    } catch (err) {
      apiResult = {
        success: false,
        responseTimeMs: 0,
        testedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ── Supabase check ───────────────────────────────────────
  let dbResult: { connected: boolean; offerCount: number } = { connected: false, offerCount: 0 };
  let lastRun: Record<string, unknown> | null = null;

  try {
    const offerCount = await getOfferCount('accesstrade');
    const run = await getLastSyncRun('accesstrade');
    dbResult = { connected: true, offerCount };
    if (run) {
      lastRun = {
        jobName: run.job_name,
        status: run.status,
        startedAt: run.started_at,
        recordsFetched: run.records_fetched,
        recordsInserted: run.records_inserted,
        recordsUpdated: run.records_updated,
        recordsSkipped: run.records_skipped,
        errorSummary: run.error_summary,
      };
    }
  } catch {
    dbResult = { connected: false, offerCount: 0 };
  }

  const summary = apiResult.success && dbResult.connected ? 'ok' : 'degraded';
  const statusCode = summary === 'ok' ? 200 : 503;

  res.status(statusCode).json({
    ok: summary === 'ok',
    summary,
    testedAt: new Date().toISOString(),
    apiKeyConfigured,
    apiConnection: apiResult,
    database: dbResult,
    lastSyncRun: lastRun,
  });
}));

// ── POST /internal/integrations/accesstrade/sync ─────────────────────────────

router.post('/sync', asyncHandler(async (req: Request, res: Response) => {
  const { type = 'deals', dryRun = false } = req.body as {
    type?: string;
    dryRun?: boolean;
  };

  const allowed = ['deals', 'campaigns'];
  if (!allowed.includes(type)) {
    res.status(400).json({ ok: false, error: `type must be one of: ${allowed.join(', ')}` });
    return;
  }

  try {
    let stats: unknown;

    if (type === 'campaigns') {
      stats = await syncAccessTradeCampaigns({ dryRun });
    } else {
      stats = await syncAccessTradeDeals({ dryRun });
    }

    res.json({ ok: true, type, dryRun, stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AccessTrade][Sync] Job failed:', message);
    res.status(500).json({ ok: false, error: message });
  }
}));

export default router;
