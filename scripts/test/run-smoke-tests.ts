#!/usr/bin/env node
/**
 * Smoke Test Runner
 *
 * Runs smoke tests for deployment verification.
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const projectRoot = resolve(__dirname, '../..');
const testDir = resolve(projectRoot, 'src/testing');

const args = process.argv.slice(2);

// Determine smoke test type from args
const isFull = args.includes('--full');
const configFile = isFull
  ? resolve(projectRoot, 'vitest.config.smoke.ts')
  : resolve(projectRoot, 'vitest.config.smoke.ts');

const testArgs = [
  'vitest',
  'run',
  testDir,
  '--config',
  configFile,
  '--reporter',
  'verbose',
  ...args.filter((a) => a !== '--full'),
];

console.log(`Running ${isFull ? 'full' : 'quick'} smoke tests...`);
console.log(`Test directory: ${testDir}`);

const child = spawn('npx', testArgs, {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
