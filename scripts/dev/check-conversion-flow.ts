#!/usr/bin/env node

/**
 * Conversion Flow Checker CLI
 * Validates the conversion UX flow and components
 * Run: npx tsx scripts/dev/check-conversion-flow.ts
 */

import { readFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..', '..');

interface CheckResult {
  file: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

async function checkFileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function checkFileContains(path: string, search: string): Promise<boolean> {
  try {
    const content = await readFile(path, 'utf-8');
    return content.includes(search);
  } catch {
    return false;
  }
}

async function checkConversionComponents() {
  console.log('\n📋 Checking conversion components...\n');

  const basePath = join(PROJECT_ROOT, 'src', 'features', 'publicVoucherConversion');

  // Check core files exist
  const requiredFiles = [
    'types.ts',
    'constants.ts',
    'index.ts',
    'components/BestVoucherHero.tsx',
    'components/VoucherConfidenceBadge.tsx',
    'components/VoucherCandidatesPanel.tsx',
    'components/VoucherExplanationSummary.tsx',
    'components/CopySuccessFeedback.tsx',
    'components/OpenShopeeHint.tsx',
    'components/ResultStateLayout.tsx',
    'components/ResultSkeleton.tsx',
    'components/ResultErrorState.tsx',
    'components/NoMatchResultView.tsx',
    'components/index.ts',
    'hooks/useVoucherCopyAction.ts',
    'hooks/useOpenShopeeAction.ts',
    'hooks/useResultInteractionState.ts',
    'hooks/useVoucherConversionFlow.ts',
    'presentation/resultPresentationBuilder.ts',
    'presentation/noMatchPresentationBuilder.ts',
    'presentation/actionPriorityResolver.ts',
    'analytics/conversionAnalytics.ts',
    'analytics/conversionFunnel.ts',
    'styles/conversionDesignTokens.ts',
  ];

  for (const file of requiredFiles) {
    const fullPath = join(basePath, file);
    const exists = await checkFileExists(fullPath);
    results.push({
      file: `publicVoucherConversion/${file}`,
      status: exists ? 'pass' : 'fail',
      message: exists ? 'File exists' : 'File missing',
    });
  }
}

async function checkAnalyticsEvents() {
  console.log('📊 Checking analytics events...\n');

  const analyticsPath = join(
    PROJECT_ROOT,
    'src',
    'features',
    'publicVoucherConversion',
    'analytics',
    'conversionAnalytics.ts'
  );

  const requiredEvents = [
    'trackBestVoucherViewed',
    'trackCopyIntent',
    'trackCopySuccess',
    'trackOpenShopeeIntent',
    'trackNoMatchViewed',
  ];

  for (const event of requiredEvents) {
    const hasEvent = await checkFileContains(analyticsPath, event);
    results.push({
      file: 'analytics/conversionAnalytics.ts',
      status: hasEvent ? 'pass' : 'fail',
      message: hasEvent ? `Event ${event} defined` : `Missing event ${event}`,
    });
  }
}

async function checkConstants() {
  console.log('⚙️ Checking constants...\n');

  const constantsPath = join(
    PROJECT_ROOT,
    'src',
    'features',
    'publicVoucherConversion',
    'constants.ts'
  );

  const requiredConstants = [
    'ACTION_TIMING',
    'DISPLAY_LIMITS',
    'CONFIDENCE',
    'COPYWRITING',
    'LAYOUT',
    'ERROR_MESSAGES',
  ];

  for (const constant of requiredConstants) {
    const hasConstant = await checkFileContains(constantsPath, constant);
    results.push({
      file: 'constants.ts',
      status: hasConstant ? 'pass' : 'fail',
      message: hasConstant ? `Constant ${constant} defined` : `Missing ${constant}`,
    });
  }
}

async function checkConversionFlow() {
  console.log('🔄 Checking conversion flow...\n');

  // Check that hooks properly handle the flow states
  const hooksToCheck = [
    {
      path: 'hooks/useVoucherCopyAction.ts',
      checks: ['clipboard', 'navigator.clipboard', 'fallback'],
    },
    {
      path: 'hooks/useOpenShopeeAction.ts',
      checks: ['window.open', 'shopee'],
    },
    {
      path: 'hooks/useVoucherConversionFlow.ts',
      checks: ['viewState', 'copyState', 'handleCopy', 'handleOpen'],
    },
  ];

  for (const hook of hooksToCheck) {
    const fullPath = join(
      PROJECT_ROOT,
      'src',
      'features',
      'publicVoucherConversion',
      hook.path
    );
    const content = await readFile(fullPath, 'utf-8');

    for (const check of hook.checks) {
      const hasCheck = content.toLowerCase().includes(check.toLowerCase());
      results.push({
        file: hook.path,
        status: hasCheck ? 'pass' : 'warn',
        message: hasCheck ? `Contains ${check}` : `Missing ${check}`,
      });
    }
  }
}

async function checkAccessibility() {
  console.log('♿ Checking accessibility...\n');

  const componentsToCheck = [
    'components/BestVoucherHero.tsx',
    'components/VoucherCandidatesPanel.tsx',
    'components/OpenShopeeHint.tsx',
  ];

  for (const component of componentsToCheck) {
    const fullPath = join(
      PROJECT_ROOT,
      'src',
      'features',
      'publicVoucherConversion',
      component
    );

    const content = await readFile(fullPath, 'utf-8');

    // Check for aria-label
    const hasAriaLabel = content.includes('aria-label');
    // Check for keyboard navigation (onKeyDown, tabIndex)
    const hasKeyboardSupport = content.includes('onKeyDown') || content.includes('tabIndex');
    // Check for button elements (semantic HTML)
    const hasSemanticButton = content.includes('<button');

    results.push({
      file: component,
      status: hasAriaLabel && hasKeyboardSupport ? 'pass' : 'warn',
      message: hasAriaLabel
        ? 'Has accessibility attributes'
        : 'Missing aria-label or keyboard support',
    });
  }
}

function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 CHECK RESULTS');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const warnings = results.filter((r) => r.status === 'warn').length;

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.file}`);
    console.log(`   ${result.message}\n`);
  }

  console.log('='.repeat(60));
  console.log(`Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  console.log('='.repeat(60));

  return failed === 0;
}

async function main() {
  console.log('🚀 Conversion Flow Checker');
  console.log('='.repeat(40));

  await checkConversionComponents();
  await checkAnalyticsEvents();
  await checkConstants();
  await checkConversionFlow();
  await checkAccessibility();

  const success = printResults();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);
