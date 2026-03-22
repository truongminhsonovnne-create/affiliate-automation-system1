/**
 * TikTok Shop Promotion Source Routes
 * Internal/admin APIs for TikTok Shop promotion sources
 */

import { Router } from 'express';
import { getTikTokPromotionSourceRepository } from '../../repositories/tiktokPromotionSourceRepository.js';
import { evaluateTikTokShopPromotionSourceReadiness } from '../../promotions/tiktokShopPromotionSourceReadinessService.js';
import { serializeError, serializeSuccess } from '../../api/serializers.js';

const router = Router();

/**
 * GET /internal/platforms/tiktok-shop/promotion-sources
 * Get all promotion source records
 */
router.get('/promotion-sources', async (req, res) => {
  try {
    const repo = getTikTokPromotionSourceRepository();
    const { sourceId, limit } = req.query;

    let records;
    if (sourceId) {
      records = await repo.findBySourceId(sourceId as string);
    } else {
      records = await repo.findAll();
    }

    const limited = limit ? records.slice(0, Number(limit)) : records;
    res.json(serializeSuccess(limited));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

/**
 * GET /internal/platforms/tiktok-shop/promotion-sources/readiness
 * Get promotion source readiness status
 */
router.get('/promotion-sources/readiness', async (req, res) => {
  try {
    const { sourceKey } = req.query;
    const result = await evaluateTikTokShopPromotionSourceReadiness(sourceKey as string || 'manual_sample');
    res.json(serializeSuccess(result));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

/**
 * POST /internal/platforms/tiktok-shop/promotion-sources/review
 * Run promotion source review
 */
router.post('/promotion-sources/review', async (req, res) => {
  try {
    const { sourceKey } = req.body;
    const result = await evaluateTikTokShopPromotionSourceReadiness(sourceKey || 'manual_sample');
    res.json(serializeSuccess(result));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

/**
 * GET /internal/platforms/tiktok-shop/promotion-sources/:promotionKey
 * Get promotion source by key
 */
router.get('/promotion-sources/:promotionKey', async (req, res) => {
  try {
    const { promotionKey } = req.params;
    const repo = getTikTokPromotionSourceRepository();
    const records = await repo.findByKey(promotionKey);
    res.json(serializeSuccess(records));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

export default router;
