/**
 * TikTok Shop Discovery Routes
 */

import { Router } from 'express';
import { runTikTokShopDiscoveryCycle } from '../../service/tiktokShopAcquisitionService.js';
import { serializeDiscoveryJob, serializeCandidate, serializeError, serializeSuccess } from '../../api/serializers.js';

const router = Router();

router.get('/discovery/jobs', async (req, res) => {
  try {
    res.json(serializeSuccess([]));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

router.post('/discovery/run', async (req, res) => {
  try {
    const { seeds, categories } = req.body;
    const result = await runTikTokShopDiscoveryCycle({ seeds, categories });
    res.json(serializeSuccess(result));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

router.get('/discovery/candidates', async (req, res) => {
  try {
    res.json(serializeSuccess([]));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

export default router;
