#!/usr/bin/env node
/**
 * All Tests Runner
 *
 * Runs all test suites in sequence.
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

const testSuites = [
  { name: 'Unit Tests', command: 'npx', args: ['vitest', 'run', 'src/testing', '--config', 'vitest.config.unit.ts'] },
  // Integration and workflow tests are optional - only run if test files exist
];

async function runSuite(suite: { name: string; command: string; args: string[] }): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${suite.name}`);
    console.log('='.repeat(60));

    const child = spawn(suite.command, suite.args, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true,
    });

    child.on('exit', (code) => {
      resolve(code === 0);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const failed: string[] = [];

  console.log('Starting test suite...\n');

  for (const suite of testSuites) {
    const passed = await runSuite(suite);
    if (!passed) {
      failed.push(suite.name);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Suite Results');
  console.log('='.repeat(60));

  if (failed.length === 0) {
    console.log('All test suites passed!');
    process.exit(0);
  } else {
    console.log(`Failed suites: ${failed.join(', ')}`);
    process.exit(1);
  }
}

main().catch(console.error);
