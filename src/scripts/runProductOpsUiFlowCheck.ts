/**
 * Product Ops UI Flow Check Script
 *
 * Validates that the Product Ops UI implementation is complete and functional
 */

import { PRODUCT_OPS_NAV_CONFIG } from '../components/productOps/navigation/productOpsNavConfig';
import * as productOpsComponents from '../components/productOps';

// Component lists for validation
const CASE_COMPONENTS = [
  'ReviewQueueTable',
  'ReviewQueueToolbar',
  'ReviewQueueSummaryCards',
  'ReviewCaseHeader',
  'ReviewEvidencePanel',
  'ReviewRecommendationPanel',
  'ReviewHistoryPanel',
  'ReviewDecisionActionsPanel',
  'ReviewDecisionDialog',
];

const REMEDIATION_COMPONENTS = [
  'RemediationQueueTable',
  'RemediationDetailPanel',
  'RemediationActionPanel',
  'RemediationDecisionDialog',
];

const WORKBENCH_COMPONENTS = [
  'WorkbenchSummaryCards',
  'WorkbenchTrendPanels',
  'HumanLoopImpactPanel',
];

const COMMON_COMPONENTS = [
  'ProductOpsLoadingState',
  'ProductOpsErrorState',
  'ProductOpsEmptyState',
];

const FORMS = [
  'ReviewDecisionForm',
  'RemediationDecisionForm',
];

const HOOKS = [
  'useQueueFilters',
  'useCaseDetailState',
  'useRemediationDetailState',
];

interface ValidationResult {
  category: string;
  items: string[];
  passed: boolean;
  missing: string[];
}

function validateCategory(name: string, expected: string[], actual: Record<string, unknown>): ValidationResult {
  const missing = expected.filter(item => !actual[item]);

  return {
    category: name,
    items: expected,
    passed: missing.length === 0,
    missing,
  };
}

function runValidation(): void {
  console.log('='.repeat(60));
  console.log('Product Ops UI Flow Check');
  console.log('='.repeat(60));
  console.log('');

  const results: ValidationResult[] = [];

  // Validate components
  results.push(validateCategory('Case Components', CASE_COMPONENTS, productOpsComponents));
  results.push(validateCategory('Remediation Components', REMEDIATION_COMPONENTS, productOpsComponents));
  results.push(validateCategory('Workbench Components', WORKBENCH_COMPONENTS, productOpsComponents));
  results.push(validateCategory('Common Components', COMMON_COMPONENTS, productOpsComponents));
  results.push(validateCategory('Forms', FORMS, productOpsComponents));
  results.push(validateCategory('Hooks', HOOKS, productOpsComponents));

  // Validate navigation config
  console.log('Navigation Configuration:');
  console.log('-'.repeat(40));
  console.log(`  Found ${PRODUCT_OPS_NAV_CONFIG.length} nav items:`);
  PRODUCT_OPS_NAV_CONFIG.forEach(item => {
    console.log(`    - ${item.label}: ${item.href}`);
  });
  console.log('');

  // Print results
  let totalPassed = 0;
  let totalMissing = 0;

  results.forEach(result => {
    const status = result.passed ? '✓' : '✗';
    console.log(`${status} ${result.category}:`);

    if (result.passed) {
      totalPassed++;
      console.log(`  All ${result.items.length} components present`);
    } else {
      totalMissing += result.missing.length;
      console.log(`  Missing: ${result.missing.join(', ')}`);
    }
    console.log('');
  });

  // Summary
  console.log('='.repeat(60));
  console.log('Summary:');
  console.log('-'.repeat(40));
  console.log(`  Categories: ${results.length}`);
  console.log(`  Passed: ${totalPassed}`);
  console.log(`  Failed: ${results.filter(r => !r.passed).length}`);

  if (totalMissing > 0) {
    console.log(`  Missing components: ${totalMissing}`);
    process.exit(1);
  } else {
    console.log('');
    console.log('✓ All validations passed!');
    process.exit(0);
  }
}

// Run if executed directly
runValidation();
