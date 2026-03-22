/**
 * Weekly Review HTTP Routes
 */

import { Router, type Request, type Response } from 'express';
import { buildWeeklyOperatingRhythm } from '../../service/founderCockpitService.js';
import { getWeeklyReviewRepository } from '../../repositories/weeklyReviewRepository.js';
import { logger } from '../../../utils/logger.js';

const router = Router();

// GET /internal/founder/reviews/weekly - List weekly reviews
router.get('/', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, status, limit = '20' } = req.query;
    const repo = getWeeklyReviewRepository();

    let reviews;
    if (startDate && endDate) {
      reviews = await repo.findByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );
    } else {
      reviews = await repo.findRecent(parseInt(limit as string, 10));
    }

    if (status) {
      reviews = reviews.filter(r => r.status === status);
    }

    res.json({ success: true, data: reviews });
  } catch (error) {
    logger.error({ msg: 'Failed to list weekly reviews', error });
    res.status(500).json({ success: false, error: 'Failed to list reviews' });
  }
});

// GET /internal/founder/reviews/weekly/current - Get current week's review
router.get('/current', async (req: Request, res: Response) => {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const review = await buildWeeklyOperatingRhythm({ startDate, endDate });
    res.json({ success: true, data: review });
  } catch (error) {
    logger.error({ msg: 'Failed to get current weekly review', error });
    res.status(500).json({ success: false, error: 'Failed to get current review' });
  }
});

// GET /internal/founder/reviews/weekly/:reviewKey - Get specific review
router.get('/:reviewKey', async (req: Request, res: Response) => {
  try {
    const { reviewKey } = req.params;
    const repo = getWeeklyReviewRepository();
    const review = await repo.findByKey(reviewKey);

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    res.json({ success: true, data: review });
  } catch (error) {
    logger.error({ msg: 'Failed to get weekly review', error });
    res.status(500).json({ success: false, error: 'Failed to get review' });
  }
});

// POST /internal/founder/reviews/weekly/run - Run weekly review
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.body;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const review = await buildWeeklyOperatingRhythm({ startDate: start, endDate: end });

    // Persist the review
    const repo = getWeeklyReviewRepository();
    const saved = await repo.create({
      reviewKey: `weekly-${start.toISOString().split('T')[0]}`,
      periodStart: start,
      periodEnd: end,
      status: 'completed',
      payload: review as unknown as Record<string, unknown>,
      createdBy: 'system',
    });

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    logger.error({ msg: 'Failed to run weekly review', error });
    res.status(500).json({ success: false, error: 'Failed to run review' });
  }
});

// PUT /internal/founder/reviews/weekly/:reviewKey/status - Update review status
router.put('/:reviewKey/status', async (req: Request, res: Response) => {
  try {
    const { reviewKey } = req.params;
    const { status, completedAt } = req.body;

    const repo = getWeeklyReviewRepository();
    await repo.updateStatus(reviewKey, status, completedAt ? new Date(completedAt) : undefined);

    res.json({ success: true });
  } catch (error) {
    logger.error({ msg: 'Failed to update review status', error });
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// DELETE /internal/founder/reviews/weekly/:reviewKey - Delete a review
router.delete('/:reviewKey', async (req: Request, res: Response) => {
  try {
    const { reviewKey } = req.params;
    const repo = getWeeklyReviewRepository();
    await repo.delete(reviewKey);

    res.json({ success: true });
  } catch (error) {
    logger.error({ msg: 'Failed to delete review', error });
    res.status(500).json({ success: false, error: 'Failed to delete review' });
  }
});

export default router;
