/**
 * TikTok Shop Context Routes
 * Internal/admin APIs for TikTok Shop context readiness
 */

import { Router } from 'express';
import { getTikTokProductSnapshotRepository } from '../../repositories/tiktokProductSnapshotRepository.js';
import { buildTikTokShopContextSupportMatrix } from '../../readiness/tiktokShopContextSupportMatrix.js';
import { runTikTokShopContextEnrichmentReview } from '../../service/tiktokShopDataFoundationService.js';
import { serializeTikTokShopProductSnapshot, serializeError, serializeSuccess } from '../../api/serializers.js';

const router = Router();

/**
 * GET /internal/platforms/tiktok-shop/context-readiness
 * Get context readiness status
 */
router.get('/context-readiness', async (req, res) => {
  try {
    const matrix = await buildTikTokShopContextSupportMatrix();
    res.json(serializeSuccess(matrix));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

/**
 * POST /internal/platforms/tiktok-shop/context-readiness/run
 * Run context enrichment review
 */
router.post('/context-readiness/run', async (req, res) => {
  try {
    const result = await runTikTokShopContextEnrichmentReview();
    res.json(serializeSuccess(result));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

/**
 * GET /internal/platforms/tiktok-shop/product-snapshots
 * Get product snapshots
 */
router.get('/product-snapshots', async (req, res) => {
  try {
    const repo = getTikTokProductSnapshotRepository();
    const { referenceKey, limit } = req.query;

    let snapshots;
    if (referenceKey) {
      snapshots = await repo.findByReferenceKey(referenceKey as string);
    } else {
      snapshots = await repo.findAll();
    }

    const limited = limit ? snapshots.slice(0, Number(limit)) : snapshots;
    const dtos = limited.map(serializeTikTokShopProductSnapshot);
    res.json(serializeSuccess(dtos));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

/**
 * GET /internal/platforms/tiktok-shop/product-snapshots/:referenceKey
 * Get product snapshots by reference key
 */
router.get('/product-snapshots/:referenceKey', async (req, res) => {
  try {
    const { referenceKey } = req.params;
    const repo = getTikTokProductSnapshotRepository();
    const snapshots = await repo.findByReferenceKey(referenceKey);
    const dtos = snapshots.map(serializeTikTokShopProductSnapshot);
    res.json(serializeSuccess(dtos));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

export default router;
