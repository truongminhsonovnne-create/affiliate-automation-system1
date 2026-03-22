/**
 * Launch Closure HTTP Server Integration
 */
import { Express } from 'express';
import launchReadinessRoutes from './routes/launchReadinessRoutes.js';
import launchSignoffRoutes from './routes/launchSignoffRoutes.js';
import launchDecisionRoutes from './routes/launchDecisionRoutes.js';
import launchWatchRoutes from './routes/launchWatchRoutes.js';
import { launchClosureErrorHandler } from './middleware/launchClosureErrorHandler.js';

const DEFAULT_MOUNT_PATH = '/internal';

export function mountLaunchClosureRoutes(app: Express, config: { mountPath?: string } = {}) {
  const mountPath = config.mountPath || DEFAULT_MOUNT_PATH;
  app.use(`${mountPath}/launch`, launchReadinessRoutes, launchSignoffRoutes, launchDecisionRoutes, launchWatchRoutes);
  app.use(launchClosureErrorHandler);
  console.log(`[LaunchClosure] Routes mounted at ${mountPath}/launch`);
}

export function getLaunchClosureRoutes() {
  return [
    'GET /internal/launch/readiness',
    'POST /internal/launch/readiness/run',
    'GET /internal/launch/risks',
    'GET /internal/launch/checklists',
    'GET /internal/launch/signoffs',
    'POST /internal/launch/signoffs',
    'POST /internal/launch/signoffs/:id/complete',
    'GET /internal/launch/decision',
    'POST /internal/launch/decision/go',
    'POST /internal/launch/decision/conditional-go',
    'POST /internal/launch/decision/no-go',
    'GET /internal/launch/watch-plan',
    'POST /internal/launch/watch-plan/build',
    'GET /internal/launch/closure-report',
  ];
}
