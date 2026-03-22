/**
 * Growth Engine Server Integration
 *
 * Express server setup and route registration for the Growth Engine API.
 */

import express, { Express, Request, Response } from 'express';
import surfacesRouter from './routes/surfaces';
import governanceRouter from './routes/governance';
import analyticsRouter from './routes/analytics';
import {
  validateSurfaceId,
  validatePagination,
  validateDateRange,
  addGovernanceContext,
  governanceErrorHandler,
  createRateLimiter,
} from './middleware/governanceMiddleware';

/**
 * Create and configure the Growth Engine Express app
 */
export function createGrowthEngineApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(addGovernanceContext);

  // Rate limiting
  const rateLimiter = createRateLimiter(100, 60000);
  app.use('/api/growth/', rateLimiter);

  // Health check
  app.get('/api/growth/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'growth-engine',
    });
  });

  // Apply route validation middleware
  app.param('id', validateSurfaceId);

  // Routes
  app.use('/api/growth', surfacesRouter);
  app.use('/api/growth', governanceRouter);
  app.use('/api/growth', analyticsRouter);

  // Error handling
  app.use(governanceErrorHandler);

  return app;
}

/**
 * Start the Growth Engine server
 */
export async function startGrowthEngineServer(
  port: number = 3000
): Promise<Express> {
  const app = createGrowthEngineApp();

  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`Growth Engine server running on port ${port}`);
      resolve(app);
    });
  });
}

/**
 * Default export for testing
 */
export default {
  createGrowthEngineApp,
  startGrowthEngineServer,
};
