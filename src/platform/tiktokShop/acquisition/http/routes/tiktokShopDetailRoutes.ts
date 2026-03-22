/**
 * TikTok Shop Detail Routes
 */

import { Router } from 'express';
import { runTikTokShopDetailCycle } from '../../service/tiktokShopAcquisitionService.js';
import { serializeDetailJob, serializeRawDetail, serializeError, serializeSuccess } from '../../api/serializers.js';

const router = Router();

router.get('/detail/jobs', async (req, res) => {
  try {
    res.json(serializeSuccess([]));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

router.post('/detail/run', async (req, res) => {
  try {
    const { referenceKeys } = req.body;
    const result = await runTikTokShopDetailCycle(referenceKeys);
    res.json(serializeSuccess(result));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

router.get('/detail/raw-records', async (req, res) => {
  try {
    res.json(serializeSuccess([]));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

export default router;
