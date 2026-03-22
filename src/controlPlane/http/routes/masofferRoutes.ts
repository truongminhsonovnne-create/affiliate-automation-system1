/**
 * MasOffer HTTP Routes — GET /health, POST /sync
 *
 * Mounted at /integrations/masoffer inside the control plane router.
 * All routes require admin authentication.
 */

import { Router } from 'express';
import { requireAuthentication } from '../middleware/authGuard.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getMasOfferApiClient } from '../../../integrations/masoffer/MasOfferApiClient.js';
import {
  syncMasOfferOffers,
  syncMasOfferCampaigns,
} from '../../../integrations/masoffer/masoffer.sync.js';
import { getMasOfferOfferCount, getMasOfferRecentOffers } from '../../../integrations/masoffer/masoffer.supabase.js';

const router = Router();

router.use(requireAuthentication);

// ── GET /integrations/masoffer/health ─────────────────────────────────────────

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const client = getMasOfferApiClient();
    const apiKeyConfigured = client.isConfigured();

    let apiConnection: {
      success: boolean;
      responseTimeMs: number;
      testedAt: string;
      campaignCount?: number;
      offerCount?: number;
      error?: string;
    } = {
      success: false,
      responseTimeMs: 0,
      testedAt: new Date().toISOString(),
      error: 'Not checked',
    };

    if (!apiKeyConfigured) {
      apiConnection.error = 'MASOFFER_API_TOKEN or MASOFFER_PUBLISHER_ID is not configured';
    } else {
      const result = await client.testConnection();
      const r = result as unknown as Record<string, unknown>;
      apiConnection = {
        success: result.success,
        responseTimeMs: (r.response_time_ms as number) ?? result.responseTimeMs,
        testedAt: (r.tested_at as string) ?? result.testedAt,
        campaignCount: r.campaign_count as number | undefined,
        offerCount: r.offer_count as number | undefined,
        error: result.success ? undefined : result.error,
      };
    }

    // Supabase offer count
    let database: { connected: boolean; offerCount: number } = {
      connected: false,
      offerCount: 0,
    };
    try {
      const count = await getMasOfferOfferCount();
      database = { connected: true, offerCount: count };
    } catch {
      database = { connected: false, offerCount: 0 };
    }

    res.json({
      apiKeyConfigured,
      apiConnection,
      database,
    });
  })
);

// ── POST /integrations/masoffer/sync ──────────────────────────────────────────

router.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const { type = 'offers', dryRun = false } = req.body as {
      type?: 'offers' | 'campaigns';
      dryRun?: boolean;
    };

    const client = getMasOfferApiClient();

    if (!client.isConfigured()) {
      res.status(503).json({ error: 'MasOffer API is not configured' });
      return;
    }

    // Kick off sync and respond immediately (long-running job)
    const syncPromise =
      type === 'campaigns'
        ? syncMasOfferCampaigns(client, { dryRun })
        : syncMasOfferOffers(client, { dryRun });

    // Don't await — return job-started response
    // Clients should poll GET /health for updated sync_runs
    void syncPromise.catch((err) =>
      console.error(`[MasOffer] Background sync failed: ${err.message}`)
    );

    res.json({
      status: 'started',
      type,
      dryRun,
      message: `MasOffer ${type} sync job has been started. Poll GET /integrations/masoffer/health for progress.`,
    });
  })
);

// ── GET /integrations/masoffer/offers ─────────────────────────────────────────

router.get(
  '/offers',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const offers = await getMasOfferRecentOffers(limit);
    res.json({ data: offers, count: offers.length });
  })
);

export default router;
