/**
 * Executive Scorecard Routes
 */

import { Router, Request, Response } from 'express';
import { buildExecutiveScorecardPack } from '../../service/businessIntelligenceService.js';
import { serializeScorecardPack } from '../api/serializers.js';

const router = Router();

router.get('/executive/scorecards', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const types = req.query.types ? (req.query.types as string).split(',') : undefined;

    const result = await buildExecutiveScorecardPack({ startDate, endDate, types });

    if (!result.success || !result.data) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      data: serializeScorecardPack(result.data, { start: startDate, end: endDate }),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

export default router;
