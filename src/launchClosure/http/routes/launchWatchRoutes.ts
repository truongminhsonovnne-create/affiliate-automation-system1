/**
 * Launch Watch HTTP Routes
 */
import { Router, Request, Response } from 'express';
import * as service from '../../service/launchClosureService.js';

const router = Router();

router.get('/watch-plan', async (_req: Request, res: Response) => {
  try {
    res.json({ status: 'available', message: 'Watch plan endpoint ready' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/watch-plan/build', async (req: Request, res: Response) => {
  try {
    const { launchKey, watchWindowHours } = req.body;
    const result = await service.runPostLaunchWatchPreparation(launchKey, watchWindowHours);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/closure-report', async (_req: Request, res: Response) => {
  try {
    res.json({ message: 'Closure report ready' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
