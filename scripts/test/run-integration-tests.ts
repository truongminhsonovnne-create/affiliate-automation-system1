#!/usr/bin/env node
/**
 * Integration Test Runner
 *
 * Runs integration tests with proper configuration.
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');
const testDir = resolve(projectRoot, 'src/testing');

const args = process.argv.slice(2);
const testArgs = [
  'vitest',
  'run',
  testDir,
  '--config',
  resolve(projectRoot, 'vitest.config.integration.ts'),
  '--reporter',
  'verbose',
  ...args,
];

console.log('Running integration tests...');
console.log(`Test directory: ${testDir}`);

const child = spawn('npx', testArgs, {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
