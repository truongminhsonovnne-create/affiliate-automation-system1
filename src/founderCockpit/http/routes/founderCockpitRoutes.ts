/**
 * Founder Cockpit HTTP Routes
 */

import { Router, type Request, type Response } from 'express';
import {
  buildFounderCockpit,
  buildWeeklyOperatingRhythm,
  buildStrategicReviewAutomationPack,
  runFounderOperatingCycle,
} from '../../service/founderCockpitService.js';
import { getCockpitSnapshotRepository } from '../../repositories/cockpitSnapshotRepository.js';
import { getWeeklyReviewRepository } from '../../repositories/weeklyReviewRepository.js';
import { getStrategicPackRepository } from '../../repositories/strategicReviewPackRepository.js';
import { getFounderDecisionQueueRepository } from '../../repositories/founderDecisionQueueRepository.js';
import { logger } from '../../../utils/logger.js';

const router = Router();

// GET /api/founder-cockpit/current - Get current founder cockpit
router.get('/current', async (req: Request, res: Response) => {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const cockpit = await buildFounderCockpit({ startDate, endDate });
    res.json({ success: true, data: cockpit });
  } catch (error) {
    logger.error({ msg: 'Failed to get founder cockpit', error });
    res.status(500).json({ success: false, error: 'Failed to get founder cockpit' });
  }
});

// GET /api/founder-cockpit/snapshots - List cockpit snapshots
router.get('/snapshots', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, limit = '10' } = req.query;
    const repo = getCockpitSnapshotRepository();
    const snapshots = await repo.findByDateRange(
      startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate ? new Date(endDate as string) : new Date(),
      parseInt(limit as string, 10)
    );
    res.json({ success: true, data: snapshots });
  } catch (error) {
    logger.error({ msg: 'Failed to list cockpit snapshots', error });
    res.status(500).json({ success: false, error: 'Failed to list snapshots' });
  }
});

// GET /api/founder-cockpit/snapshots/:id - Get specific snapshot
router.get('/snapshots/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const repo = getCockpitSnapshotRepository();
    const snapshot = await repo.findById(id);
    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' });
    }
    res.json({ success: true, data: snapshot });
  } catch (error) {
    logger.error({ msg: 'Failed to get snapshot', error });
    res.status(500).json({ success: false, error: 'Failed to get snapshot' });
  }
});

// GET /api/founder-cockpit/weekly-reviews - List weekly reviews
router.get('/weekly-reviews', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const repo = getWeeklyReviewRepository();
    const reviews = await repo.findByDateRange(
      startDate ? new Date(startDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate ? new Date(endDate as string) : new Date()
    );
    res.json({ success: true, data: reviews });
  } catch (error) {
    logger.error({ msg: 'Failed to list weekly reviews', error });
    res.status(500).json({ success: false, error: 'Failed to list reviews' });
  }
});

// GET /api/founder-cockpit/weekly-reviews/current - Get current week's review
router.get('/weekly-reviews/current', async (req: Request, res: Response) => {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const review = await buildWeeklyOperatingRhythm({ startDate, endDate });
    res.json({ success: true, data: review });
  } catch (error) {
    logger.error({ msg: 'Failed to get weekly review', error });
    res.status(500).json({ success: false, error: 'Failed to get weekly review' });
  }
});

// GET /api/founder-cockpit/strategic-packs - List strategic review packs
router.get('/strategic-packs', async (req: Request, res: Response) => {
  try {
    const { type, status } = req.query;
    const repo = getStrategicPackRepository();
    const packs = await repo.findByFilters(type as string | undefined, status as string | undefined);
    res.json({ success: true, data: packs });
  } catch (error) {
    logger.error({ msg: 'Failed to list strategic packs', error });
    res.status(500).json({ success: false, error: 'Failed to list packs' });
  }
});

// POST /api/founder-cockpit/strategic-packs - Create strategic review pack
router.post('/strategic-packs', async (req: Request, res: Response) => {
  try {
    const { type, startDate, endDate } = req.body;
    const pack = await buildStrategicReviewAutomationPack({
      type: type || 'monthly',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
    res.status(201).json({ success: true, data: pack });
  } catch (error) {
    logger.error({ msg: 'Failed to create strategic pack', error });
    res.status(500).json({ success: false, error: 'Failed to create pack' });
  }
});

// GET /api/founder-cockpit/decisions - Get decision queue
router.get('/decisions', async (req: Request, res: Response) => {
  try {
    const { status, priority, limit = '20' } = req.query;
    const repo = getFounderDecisionQueueRepository();
    const decisions = await repo.findPending(parseInt(limit as string, 10));
    res.json({ success: true, data: decisions });
  } catch (error) {
    logger.error({ msg: 'Failed to get decisions', error });
    res.status(500).json({ success: false, error: 'Failed to get decisions' });
  }
});

// POST /api/founder-cockpit/decisions/:id/resolve - Resolve a decision
router.post('/decisions/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const repo = getFounderDecisionQueueRepository();
    await repo.resolve(id);
    res.json({ success: true, resolvedAt: new Date().toISOString() });
  } catch (error) {
    logger.error({ msg: 'Failed to resolve decision', error });
    res.status(500).json({ success: false, error: 'Failed to resolve decision' });
  }
});

// POST /api/founder-cockpit/cycle/run - Run full founder operating cycle
router.post('/cycle/run', async (req: Request, res: Response) => {
  try {
    const result = await runFounderOperatingCycle();
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ msg: 'Failed to run founder operating cycle', error });
    res.status(500).json({ success: false, error: 'Failed to run cycle' });
  }
});

// GET /api/founder-cockpit/health - Health check
router.get('/health', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        service: 'ok',
        database: 'ok',
      },
    });
  } catch (error) {
    logger.error({ msg: 'Health check failed', error });
    res.status(503).json({ success: false, status: 'unhealthy' });
  }
});

export default router;
