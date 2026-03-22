/**
 * Operator BI Routes
 */

import { Router, Request, Response } from 'express';
import { buildOperatorBiSurface } from '../../service/businessIntelligenceService.js';

const router = Router();

router.get('/operator/:surface', async (req: Request, res: Response) => {
  try {
    const surface = req.params.surface as any;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const result = await buildOperatorBiSurface(surface, { dateRange: { start: startDate, end: endDate } });

    if (!result.success || !result.data) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

export default router;
