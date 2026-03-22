/**
 * Strategic Review HTTP Routes
 */

import { Router, type Request, type Response } from 'express';
import { buildStrategicReviewAutomationPack } from '../../service/founderCockpitService.js';
import { getStrategicPackRepository } from '../../repositories/strategicPackRepository.js';
import { logger } from '../../../utils/logger.js';

const router = Router();

// GET /internal/founder/reviews/strategic - List strategic review packs
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, status, startDate, endDate, limit = '20' } = req.query;
    const repo = getStrategicPackRepository();

    let packs;
    if (startDate && endDate) {
      packs = await repo.findByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );
    } else {
      packs = await repo.findRecent(parseInt(limit as string, 10));
    }

    if (type) {
      packs = packs.filter(p => p.reviewType === type);
    }
    if (status) {
      packs = packs.filter(p => p.status === status);
    }

    res.json({ success: true, data: packs });
  } catch (error) {
    logger.error({ msg: 'Failed to list strategic packs', error });
    res.status(500).json({ success: false, error: 'Failed to list packs' });
  }
});

// GET /internal/founder/reviews/strategic/:id - Get specific strategic pack
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const repo = getStrategicPackRepository();
    const pack = await repo.findById(id);

    if (!pack) {
      return res.status(404).json({ success: false, error: 'Strategic pack not found' });
    }

    res.json({ success: true, data: pack });
  } catch (error) {
    logger.error({ msg: 'Failed to get strategic pack', error });
    res.status(500).json({ success: false, error: 'Failed to get pack' });
  }
});

// POST /internal/founder/reviews/strategic/run - Run strategic review
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { type, startDate, endDate } = req.body;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const pack = await buildStrategicReviewAutomationPack({
      type: type || 'monthly',
      startDate: start,
      endDate: end,
    });

    // Persist the pack
    const repo = getStrategicPackRepository();
    const saved = await repo.create({
      reviewType: pack.reviewType,
      periodStart: start,
      periodEnd: end,
      status: pack.status,
      packPayload: pack as unknown as Record<string, unknown>,
    });

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    logger.error({ msg: 'Failed to run strategic review', error });
    res.status(500).json({ success: false, error: 'Failed to run review' });
  }
});

// GET /internal/founder/reviews/strategic/types - Get available review types
router.get('/meta/types', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { type: 'weekly', name: 'Weekly Operating Review', description: 'Weekly operational pulse check' },
      { type: 'monthly', name: 'Monthly Strategic Review', description: 'Monthly full strategic review' },
      { type: 'quarterly', name: 'Quarterly Business Review', description: 'Comprehensive quarterly review' },
      { type: 'growth', name: 'Growth Strategic Review', description: 'Growth-focused strategic review' },
      { type: 'quality', name: 'Quality Strategic Review', description: 'Quality-focused strategic review' },
      { type: 'commercial', name: 'Commercial Strategic Review', description: 'Commercial performance review' },
      { type: 'release', name: 'Release Strategic Review', description: 'Release readiness review' },
    ],
  });
});

// PUT /internal/founder/reviews/strategic/:id/status - Update pack status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const repo = getStrategicPackRepository();
    await repo.updateStatus(id, status);

    res.json({ success: true });
  } catch (error) {
    logger.error({ msg: 'Failed to update pack status', error });
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// DELETE /internal/founder/reviews/strategic/:id - Delete a pack
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const repo = getStrategicPackRepository();
    await repo.delete(id);

    res.json({ success: true });
  } catch (error) {
    logger.error({ msg: 'Failed to delete pack', error });
    res.status(500).json({ success: false, error: 'Failed to delete pack' });
  }
});

export default router;
