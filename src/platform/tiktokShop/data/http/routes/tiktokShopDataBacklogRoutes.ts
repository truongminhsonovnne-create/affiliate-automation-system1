/**
 * TikTok Shop Data Backlog Routes
 * Internal/admin APIs for TikTok Shop data backlog
 */

import { Router } from 'express';
import { getTikTokShopDataBacklog, getTikTokShopDataBacklogSummary, completeTikTokShopDataBacklogItem } from '../../backlog/tiktokShopDataBacklogService.js';
import { serializeError, serializeSuccess } from '../../api/serializers.js';

const router = Router();

/**
 * GET /internal/platforms/tiktok-shop/data-backlog
 * Get data backlog items
 */
router.get('/data-backlog', async (req, res) => {
  try {
    const { backlogType, backlogStatus, priority } = req.query;
    const filters: any = {};
    if (backlogType) filters.backlogType = backlogType;
    if (backlogStatus) filters.backlogStatus = backlogStatus;
    if (priority) filters.priority = priority;

    const items = await getTikTokShopDataBacklog(filters);
    res.json(serializeSuccess(items));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

/**
 * GET /internal/platforms/tiktok-shop/data-backlog/summary
 * Get backlog summary
 */
router.get('/data-backlog/summary', async (req, res) => {
  try {
    const summary = await getTikTokShopDataBacklogSummary();
    res.json(serializeSuccess(summary));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

/**
 * POST /internal/platforms/tiktok-shop/data-backlog/:id/complete
 * Complete a backlog item
 */
router.post('/data-backlog/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { completionNotes } = req.body;

    const completed = await completeTikTokShopDataBacklogItem(id, completionNotes);
    res.json(serializeSuccess(completed));
  } catch (error) {
    res.status(500).json(serializeError(error));
  }
});

export default router;
