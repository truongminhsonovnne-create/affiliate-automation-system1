#!/usr/bin/env ts-node
/**
 * Security Posture Verification Script
 * 
 * Validates security posture configuration.
 * Run this to verify security settings.
 */

import dotenv from 'dotenv';
import { runSecurityPostureChecks, logSecurityPostureReport, assertSecurityPosture } from '../src/security/posture/index.js';

dotenv.config();

console.log('=== Security Posture Verification ===\n');

const report = runSecurityPostureChecks();

console.log('Environment:', report.environment);
console.log('Overall Level:', report.level.toUpperCase());
console.log();

console.log('Summary:');
console.log(`  Passed: ${report.summary.passed}`);
console.log(`  Warnings: ${report.summary.warnings}`);
console.log(`  Critical: ${report.summary.critical}`);
console.log();

console.log('Checks:');
for (const check of report.checks) {
  const icon = check.level === 'secure' ? '✓' : check.level === 'warning' ? '⚠' : '✗';
  console.log(`  ${icon} ${check.name}: ${check.message}`);
  if (check.details) {
    console.log(`    Details: ${JSON.stringify(check.details)}`);
  }
}

console.log('\n=== Summary ===');
if (report.level === 'critical') {
  console.log('❌ FAILED: Critical security issues detected');
  console.log('\nTo fix:');
  console.log('1. Set CONTROL_PLANE_INTERNAL_SECRET (min 32 chars)');
  console.log('2. Set ADMIN_USERNAME and ADMIN_PASSWORD');
  console.log('3. For production: USE_REDIS_RATE_LIMIT=true');
  process.exit(1);
} else if (report.level === 'warning') {
  console.log('⚠️  WARNING: Some security issues detected');
  console.log('   These should be addressed before production');
  process.exit(0);
} else {
  console.log('✅ PASSED: Security posture is good');
  process.exit(0);
}
