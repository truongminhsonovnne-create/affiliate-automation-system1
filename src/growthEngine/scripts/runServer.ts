#!/usr/bin/env node
/**
 * Growth Engine Server Script
 *
 * Starts the Growth Engine API server.
 */

import { startGrowthEngineServer } from '../server';
import { monitoring } from '../integrations/monitoringIntegration';

const DEFAULT_PORT = 3000;

async function main() {
  const port = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);

  console.log('Starting Growth Engine Server...');
  console.log(`Port: ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    await startGrowthEngineServer(port);
    monitoring.log('info', 'Growth Engine server started', { port });

    console.log(`\n✓ Growth Engine running on http://localhost:${port}`);
    console.log(`  Health: http://localhost:${port}/api/growth/health`);
    console.log(`  Surfaces: http://localhost:${port}/api/growth/surfaces`);
    console.log(`  Governance: http://localhost:${port}/api/growth/governance`);
    console.log(`  Analytics: http://localhost:${port}/api/growth/analytics`);
  } catch (error) {
    console.error('Failed to start server:', error);
    monitoring.log('error', 'Failed to start Growth Engine server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

main();
