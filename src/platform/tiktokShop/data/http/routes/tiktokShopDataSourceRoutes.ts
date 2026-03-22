/**
 * TikTok Shop Data Source Routes
 * Internal/admin APIs for TikTok Shop data sources
 */

import { Router } from 'express';
import { getTikTokShopDataSources, getTikTokShopSourceByKey } from '../../sourceRegistry/tiktokShopSourceRegistry.js';
import { runTikTokShopSourceAcquisition } from '../../acquisition/tiktokShopAcquisitionOrchestrator.js';
import { serializeTikTokShopDataSource, serializeTikTokShopAcquisitionRun, serializeError, serializeSuccess } from '../../api/serializers.js';

const router = Router();

/**
 * GET /internal/platforms/tiktok-shop/data-sources
 * Get all TikTok Shop data sources
 */
router.get('/data-sources', async (req, res) => {
  try {
    const sources = await getTikTokShopDataSources();
    const dtos = sources.map(serializeTikTokShopDataSource);
    res.json(serializeSuccess(dtos));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

/**
 * GET /internal/platforms/tiktok-shop/data-sources/:sourceKey
 * Get TikTok Shop data source by key
 */
router.get('/data-sources/:sourceKey', async (req, res) => {
  try {
    const { sourceKey } = req.params;
    const source = await getTikTokShopSourceByKey(sourceKey);

    if (!source) {
      return res.status(404).json(serializeError({ message: `Source not found: ${sourceKey}` }, 404));
    }

    res.json(serializeSuccess(serializeTikTokShopDataSource(source)));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

/**
 * POST /internal/platforms/tiktok-shop/data-sources/:sourceKey/run
 * Run acquisition for a specific source
 */
router.post('/data-sources/:sourceKey/run', async (req, res) => {
  try {
    const { sourceKey } = req.params;
    const { runType, batchSize, validateOnly } = req.body;

    const result = await runTikTokShopSourceAcquisition(sourceKey, {
      runType,
      batchSize,
      validateOnly,
    });

    if (!result.success) {
      return res.status(400).json(serializeSuccess(result));
    }

    res.json(serializeSuccess(result));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

/**
 * GET /internal/platforms/tiktok-shop/data-sources/:sourceKey/health
 * Get health status for a source
 */
router.get('/data-sources/:sourceKey/health', async (req, res) => {
  try {
    const { sourceKey } = req.params;
    const source = await getTikTokShopSourceByKey(sourceKey);

    if (!source) {
      return res.status(404).json(serializeError({ message: `Source not found: ${sourceKey}` }, 404));
    }

    res.json(serializeSuccess({
      sourceKey: source.sourceKey,
      healthStatus: source.healthStatus,
      supportLevel: source.supportLevel,
      lastCheckedAt: source.lastCheckedAt,
    }));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

export default router;
