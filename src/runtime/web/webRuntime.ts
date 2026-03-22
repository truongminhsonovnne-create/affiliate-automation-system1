/**
 * Runtime Layer - Web Runtime
 * Web application runtime integration
 */

import type { HttpServerConfig } from '../types';
import { getCurrentRuntimeConfig } from '../config/runtimeConfig';
import { registerHealthEndpoints } from '../health/healthEndpoints';

// =============================================================================
// WEB RUNTIME
// =============================================================================

/**
 * Start web runtime
 */
export async function startWebRuntime(options?: {
  port?: number;
  config?: HttpServerConfig;
}): Promise<{
  port: number;
  close: () => Promise<void>;
}> {
  const runtimeConfig = getCurrentRuntimeConfig();
  const port = options?.port ?? runtimeConfig.port;

  console.log(`[Web] Starting web runtime on port ${port}`);

  // In production, this would start Next.js
  // For now, create a placeholder
  const server = {
    close: async () => {
      console.log('[Web] Closing web runtime');
    },
  };

  return {
    port,
    close: server.close,
  };
}

/**
 * Attach health endpoints to web runtime
 */
export function attachWebRuntimeHealth(app: unknown): void {
  // This would attach health endpoints to Express/Next.js
  console.log('[Web] Health endpoints attached');
}
