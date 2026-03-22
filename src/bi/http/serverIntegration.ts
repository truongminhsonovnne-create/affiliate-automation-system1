/**
 * BI Server Integration
 */

import { Router } from 'express';
import executiveScorecardRoutes from './routes/executiveScorecardRoutes.js';
import operatorBiRoutes from './routes/operatorBiRoutes.js';
import decisionSupportRoutes from './routes/decisionSupportRoutes.js';
import { biErrorHandler } from './middleware/biErrorHandler.js';

export function createBiRouter(): Router {
  const router = Router();
  router.use('/executive', executiveScorecardRoutes);
  router.use('/operator', operatorBiRoutes);
  router.use('/decision-support', decisionSupportRoutes);
  router.use(biErrorHandler);
  return router;
}

export function mountBiRoutes(app: Router, basePath = '/internal/bi'): void {
  const biRouter = createBiRouter();
  app.use(basePath, biRouter);
}

export default createBiRouter;
