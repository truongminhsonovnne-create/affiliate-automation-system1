/**
 * Control Plane Server CLI
 *
 * Starts the internal admin control plane server.
 * Includes security posture checks at startup.
 */

import dotenv from 'dotenv';
import { startServer, setupGracefulShutdown } from '../controlPlane/http/server.js';
import { createLogger } from '../observability/logger/structuredLogger.js';
import { runSecurityPostureChecks, logSecurityPostureReport, assertSecurityPosture } from '../security/posture/index.js';

dotenv.config();

const logger = createLogger({ subsystem: 'control_plane_cli' });

/**
 * Main function
 */
async function main() {
  const port = parseInt(process.env.CONTROL_PLANE_PORT || '3001', 10);
  const host = process.env.CONTROL_PLANE_HOST || '0.0.0.0';
  const nodeEnv = process.env.NODE_ENV || 'development';

  console.log('='.repeat(60));
  console.log('Internal Control Plane Server');
  console.log('='.repeat(60));
  console.log();
  console.log(`Port: ${port}`);
  console.log(`Host: ${host}`);
  console.log(`Environment: ${nodeEnv}`);
  console.log();

  // Run security posture checks
  console.log('Running security posture checks...');
  const postureReport = runSecurityPostureChecks();
  logSecurityPostureReport(postureReport);
  
  console.log();
  console.log('Security Posture Summary:');
  console.log(`  Passed: ${postureReport.summary.passed}`);
  console.log(`  Warnings: ${postureReport.summary.warnings}`);
  console.log(`  Critical: ${postureReport.summary.critical}`);
  console.log(`  Overall: ${postureReport.level.toUpperCase()}`);
  console.log();

  // Assert security posture - fail in production if critical issues
  if (nodeEnv === 'production') {
    try {
      assertSecurityPosture();
      console.log('✅ Security posture check passed');
    } catch (err) {
      console.error('\n❌ Security posture check FAILED:');
      console.error(`   ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('\nPlease fix the critical issues before starting in production.');
      process.exit(1);
    }
  } else if (postureReport.level === 'critical') {
    console.log('⚠️  Warning: Critical security issues detected');
    console.log('   Run with NODE_ENV=production to enforce security checks');
  }
  console.log();

  try {
    const { server } = await startServer({ port, host });

    console.log('✅ Server started successfully');
    console.log(`   Health: http://${host}:${port}/health`);
    console.log(`   Internal API: http://${host}:${port}/internal`);
    console.log();
    console.log('Press Ctrl+C to stop');
    console.log('='.repeat(60));

    // Setup graceful shutdown
    setupGracefulShutdown(server);
  } catch (err) {
    console.error('\n❌ Failed to start server:', err);
    process.exit(1);
  }
}

main();
