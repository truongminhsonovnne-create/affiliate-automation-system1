#!/usr/bin/env node
/**
 * Verification Pack Runner
 *
 * Runs verification packs for staging pre-release validation.
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const projectRoot = resolve(__dirname, '../..');

const args = process.argv.slice(2);
const packName = args[0] || 'staging-prerelease';

const testArgs = [
  'vitest',
  'run',
  resolve(projectRoot, 'src/testing/verification'),
  '--config',
  resolve(projectRoot, 'vitest.config.verification.ts'),
  '--reporter',
  'verbose',
  '--testNamePattern',
  packName,
  ...args.slice(1),
];

console.log(`Running verification pack: ${packName}...`);

const child = spawn('npx', testArgs, {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
