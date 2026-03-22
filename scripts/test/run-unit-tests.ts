#!/usr/bin/env node
/**
 * Unit Test Runner
 *
 * Runs unit tests with proper configuration.
 * Uses vitest.config.unit.ts which includes security, voucher, founder, dashboard tests.
 *
 * Exit codes:
 *   0 = all tests passed
 *   1 = test failure (Fails CI)
 *   2 = config/environment error
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

const args = process.argv.slice(2);
const testArgs = [
  'vitest',
  'run',
  'src/testing',
  '--config',
  resolve(projectRoot, 'vitest.config.unit.ts'),
  '--reporter',
  'verbose',
  ...args,
];

console.log('Running unit tests...');
console.log(`Config: vitest.config.unit.ts`);
console.log(`Includes: security/*.test.ts, voucherEngine/*.test.ts, founderCockpit/*.test.ts`);

const child = spawn('npx', testArgs, {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  // Vitest exits 0 on success, 1 on test failures
  process.exit(code ?? 1);
});
