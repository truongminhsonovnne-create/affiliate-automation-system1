/**
 * TikTok Shop Acquisition Health Routes
 */

import { Router } from 'express';
import { evaluateTikTokShopAcquisitionHealth } from '../../health/tiktokShopAcquisitionHealthService.js';
import { buildTikTokShopAcquisitionDecisionSupport } from '../../service/tiktokShopAcquisitionService.js';
import { serializeHealth, serializeError, serializeSuccess } from '../../api/serializers.js';

const router = Router();

router.get('/acquisition/health', async (req, res) => {
  try {
    const health = await evaluateTikTokShopAcquisitionHealth();
    res.json(serializeSuccess(serializeHealth(health)));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

router.get('/acquisition/backlog', async (req, res) => {
  try {
    const decision = await buildTikTokShopAcquisitionDecisionSupport();
    res.json(serializeSuccess(decision));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

export default router;
