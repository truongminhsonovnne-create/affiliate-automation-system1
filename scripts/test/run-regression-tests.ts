#!/usr/bin/env node
/**
 * Regression Test Runner
 *
 * Runs regression test packs.
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const projectRoot = resolve(__dirname, '../..');
const testDir = resolve(projectRoot, 'src/testing');

const args = process.argv.slice(2);
const packName = args.includes('--full') ? 'full-regression' : 'quick-regression';

const testArgs = [
  'vitest',
  'run',
  testDir,
  '--config',
  resolve(projectRoot, 'vitest.config.regression.ts'),
  '--reporter',
  'verbose',
  '--testNamePattern',
  packName,
  ...args.filter((a) => a !== '--full'),
];

console.log(`Running regression pack: ${packName}...`);
console.log(`Test directory: ${testDir}`);

const child = spawn('npx', testArgs, {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
