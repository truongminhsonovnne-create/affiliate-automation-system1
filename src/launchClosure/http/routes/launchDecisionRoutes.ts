/**
 * Launch Decision HTTP Routes
 */
import { Router, Request, Response } from 'express';
import * as service from '../../service/launchClosureService.js';
import * as serializers from '../../api/serializers.js';

const router = Router();

router.get('/decision', async (_req: Request, res: Response) => {
  try {
    const result = await service.buildLaunchClosureDecisionSupport({ launchKey: 'demo-launch' });
    res.json(serializers.serializeGoNoGo(result.goNoGo));
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/decision/go', async (req: Request, res: Response) => {
  try {
    res.json({ decision: 'go', message: 'Launch approved' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/decision/conditional-go', async (req: Request, res: Response) => {
  try {
    res.json({ decision: 'conditional_go', message: 'Launch approved with conditions' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/decision/no-go', async (req: Request, res: Response) => {
  try {
    res.json({ decision: 'no_go', message: 'Launch not approved' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
