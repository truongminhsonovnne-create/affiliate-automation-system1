/**
 * Launch Readiness HTTP Routes
 */
import { Router, Request, Response } from 'express';
import * as service from '../../service/launchClosureService.js';
import * as serializers from '../../api/serializers.js';

const router = Router();

router.get('/readiness', async (_req: Request, res: Response) => {
  try {
    res.json({ status: 'available', message: 'Launch readiness endpoint ready' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/readiness/run', async (req: Request, res: Response) => {
  try {
    const { launchKey, createdBy } = req.body;
    const result = await service.runLaunchReadinessClosure({ launchKey, createdBy });
    res.json(serializers.serializeClosureReport(result.closureReport));
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/checklists', async (_req: Request, res: Response) => {
  try {
    const { buildLaunchHardeningChecklist } = await import('../../checklists/launchChecklistBuilder.js');
    const items = await buildLaunchHardeningChecklist({});
    res.json({ items: items.length });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/risks', async (_req: Request, res: Response) => {
  try {
    res.json({ message: 'Risk endpoint ready' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
