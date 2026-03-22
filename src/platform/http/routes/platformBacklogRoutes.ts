/**
 * Platform Backlog HTTP Routes
 */

import { Router, type Request, type Response } from 'express';
import { getPlatformExpansionBacklog, completePlatformExpansionBacklogItem } from '../../backlog/platformExpansionBacklogService.js';
import { serializeBacklogItem } from '../../api/serializers.js';
import { logger } from '../../../utils/logger.js';

const router = Router();

// GET /internal/platforms/:platformKey/backlog - Get platform backlog
router.get('/:platformKey/backlog', async (req: Request, res: Response) => {
  try {
    const { platformKey } = req.params;
    const { status } = req.query;

    const items = await getPlatformExpansionBacklog(platformKey, status as string);
    const backlog = {
      platformKey,
      items: items.map(serializeBacklogItem),
      summary: {
        total: items.length,
        pending: items.filter(i => i.backlogStatus === 'pending').length,
        inProgress: items.filter(i => i.backlogStatus === 'in_progress').length,
        completed: items.filter(i => i.backlogStatus === 'completed').length,
      },
    };

    res.json({ success: true, data: backlog });
  } catch (error) {
    logger.error({ msg: 'Failed to get platform backlog', error });
    res.status(500).json({ success: false, error: 'Failed to get backlog' });
  }
});

// POST /internal/platforms/:platformKey/backlog/:id/complete - Complete backlog item
router.post('/:platformKey/backlog/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { completedBy } = req.body;

    const item = await completePlatformExpansionBacklogItem(id, completedBy);
    res.json({ success: true, data: serializeBacklogItem(item) });
  } catch (error) {
    logger.error({ msg: 'Failed to complete backlog item', error });
    res.status(500).json({ success: false, error: 'Failed to complete item' });
  }
});

export default router;
