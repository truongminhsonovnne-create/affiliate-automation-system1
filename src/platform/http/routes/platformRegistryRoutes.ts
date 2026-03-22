/**
 * Platform Registry HTTP Routes
 */

import { Router, type Request, type Response } from 'express';
import { getRegisteredPlatforms, getPlatformByKey, registerPlatform, updatePlatformStatus } from '../../registry/platformRegistryService.js';
import { serializePlatformRegistry, serializePlatformList } from '../../api/serializers.js';
import { logger } from '../../../utils/logger.js';

const router = Router();

// GET /internal/platforms - List all platforms
router.get('/', async (_req: Request, res: Response) => {
  try {
    const platforms = await getRegisteredPlatforms();
    const result = serializePlatformList(platforms);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ msg: 'Failed to list platforms', error });
    res.status(500).json({ success: false, error: 'Failed to list platforms' });
  }
});

// GET /internal/platforms/:platformKey - Get platform by key
router.get('/:platformKey', async (req: Request, res: Response) => {
  try {
    const { platformKey } = req.params;
    const platform = await getPlatformByKey(platformKey);

    if (!platform) {
      return res.status(404).json({ success: false, error: 'Platform not found' });
    }

    res.json({ success: true, data: serializePlatformRegistry(platform) });
  } catch (error) {
    logger.error({ msg: 'Failed to get platform', error });
    res.status(500).json({ success: false, error: 'Failed to get platform' });
  }
});

// GET /internal/platforms/:platformKey/capabilities - Get platform capabilities
router.get('/:platformKey/capabilities', async (req: Request, res: Response) => {
  try {
    const { platformKey } = req.params;
    const platform = await getPlatformByKey(platformKey);

    if (!platform) {
      return res.status(404).json({ success: false, error: 'Platform not found' });
    }

    res.json({ success: true, data: platform.capabilityPayload });
  } catch (error) {
    logger.error({ msg: 'Failed to get platform capabilities', error });
    res.status(500).json({ success: false, error: 'Failed to get capabilities' });
  }
});

// POST /internal/platforms - Register new platform
router.post('/', async (req: Request, res: Response) => {
  try {
    const { platformKey, platformName, platformType } = req.body;

    if (!platformKey || !platformName) {
      return res.status(400).json({ success: false, error: 'platformKey and platformName are required' });
    }

    const platform = await registerPlatform({ platformKey, platformName, platformType });
    res.status(201).json({ success: true, data: serializePlatformRegistry(platform) });
  } catch (error) {
    logger.error({ msg: 'Failed to register platform', error });
    res.status(500).json({ success: false, error: 'Failed to register platform' });
  }
});

// PUT /internal/platforms/:platformKey/status - Update platform status
router.put('/:platformKey/status', async (req: Request, res: Response) => {
  try {
    const { platformKey } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required' });
    }

    const platform = await updatePlatformStatus(platformKey, status);
    res.json({ success: true, data: serializePlatformRegistry(platform) });
  } catch (error) {
    logger.error({ msg: 'Failed to update platform status', error });
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

export default router;
