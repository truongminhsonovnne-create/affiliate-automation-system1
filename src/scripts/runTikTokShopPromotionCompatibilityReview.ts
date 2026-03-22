/**
 * TikTok Shop Promotion Compatibility Review CLI Script
 *
 * Reviews TikTok Shop promotion compatibility with the platform's
 * resolution system, validates support states, and generates reports.
 */

import { platformGateEvaluationService } from '../platform/shared/resolution/service/platformGateEvaluationService.js';
import { tiktokShopSandboxResolutionService } from '../platform/tiktokShop/resolution/service/tiktokShopSandboxResolutionService.js';
import { SUPPORT_STATES, ROUTE_DECISIONS, getSupportStateDisplay } from '../platform/shared/resolution/constants.js';
import type { SandboxResolutionRequest } from '../platform/shared/resolution/types.js';

async function main() {
  console.log('\n===========================================');
  console.log('TIKTOK SHOP PROMOTION COMPATIBILITY REVIEW');
  console.log('===========================================\n');

  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'check': {
        // Check promotion compatibility status
        const platform = 'tiktok_shop';
        console.log(`Checking promotion compatibility for ${platform}\n`);

        const evaluation = await platformGateEvaluationService.evaluatePlatformGates(platform);

        console.log('PROMOTION SUPPORT STATUS:');
        console.log(`  Support State: ${evaluation.supportState}`);
        console.log(`  Enablement Phase: ${evaluation.enablementPhase}`);
        console.log(`  Resolution Ready: ${evaluation.resolutionReady}`);
        console.log(`  Governance Approved: ${evaluation.governanceApproved}`);

        const display = getSupportStateDisplay(evaluation.supportState);
        console.log(`\n  Display: ${display.label}`);
        console.log(`  Description: ${display.description}`);

        console.log('\nFEATURE AVAILABILITY:');
        console.log(`  Promotion Resolution: ${evaluation.gateConfig.promotionResolutionEnabled ? '✓' : '✗'}`);
        console.log(`  Product Resolution: ${evaluation.gateConfig.productResolutionEnabled ? '✓' : '✗'}`);
        console.log(`  Seller Resolution: ${evaluation.gateConfig.sellerResolutionEnabled ? '✓' : '✗'}`);
        console.log(`  Attribution: ${evaluation.gateConfig.attributionEnabled ? '✓' : '✗'}`);

        console.log('\nCOMPATIBILITY VERDICT:');
        if (evaluation.canUseProduction) {
          console.log('  ✓ Full production support available');
        } else if (evaluation.canUseSandbox) {
          console.log('  ⚠ Sandbox only - limited support');
        } else {
          console.log('  ✗ Not supported');
        }

        console.log('\n===========================================\n');
        break;
      }

      case 'test': {
        // Test promotion resolution
        const inputType = args[1] || 'url';
        const inputValue = args[2] || 'https://shop.tiktok.com/product/sample';

        console.log(`Testing promotion resolution\n`);
        console.log(`  Input Type: ${inputType}`);
        console.log(`  Input Value: ${inputValue}\n`);

        const request: SandboxResolutionRequest = {
          platform: 'tiktok_shop',
          inputType: inputType as 'url' | 'reference_key' | 'product_id' | 'promotion_code',
          inputValue,
          resolutionType: 'promotion',
        };

        const result = await tiktokShopSandboxResolutionService.resolvePromotion(request);

        console.log('RESULT:');
        console.log(`  Status: ${result.resolutionStatus}`);
        console.log(`  Support State: ${result.supportState}`);
        console.log(`  Quality Score: ${result.responseQualityScore}%`);
        console.log(`  Duration: ${result.resolutionDurationMs}ms`);

        if (result.errorCode) {
          console.log(`  Error: ${result.errorCode} - ${result.errorMessage}`);
        } else if (result.responseData) {
          console.log('\n  Response Data:');
          console.log(JSON.stringify(result.responseData, null, 2));
        }

        console.log('\n===========================================\n');
        break;
      }

      case 'validate': {
        // Validate promotion compatibility requirements
        const platform = 'tiktok_shop';

        console.log(`Validating promotion compatibility requirements for ${platform}\n`);

        const evaluation = await platformGateEvaluationService.evaluatePlatformGates(platform);

        const requirements = [
          {
            name: 'Domain Ready',
            required: true,
            met: evaluation.domainReady,
            message: evaluation.domainReady ? 'Domain knowledge available' : 'Domain not ready',
          },
          {
            name: 'Data Foundation Ready',
            required: true,
            met: evaluation.dataFoundationReady,
            message: evaluation.dataFoundationReady ? 'Data foundation operational' : 'Data foundation not ready',
          },
          {
            name: 'Acquisition Ready',
            required: true,
            met: evaluation.acquisitionReady,
            message: evaluation.acquisitionReady ? 'Acquisition pipeline operational' : 'Acquisition not ready',
          },
          {
            name: 'Resolution Ready',
            required: true,
            met: evaluation.resolutionReady,
            message: evaluation.resolutionReady ? 'Resolution service available' : 'Resolution not ready',
          },
          {
            name: 'Governance Approved',
            required: true,
            met: evaluation.governanceApproved,
            message: evaluation.governanceApproved ? 'Governance approved' : 'Pending governance approval',
          },
          {
            name: 'Promotion Resolution Enabled',
            required: false,
            met: evaluation.gateConfig.promotionResolutionEnabled,
            message: evaluation.gateConfig.promotionResolutionEnabled ? 'Enabled' : 'Not enabled',
          },
        ];

        console.log('REQUIREMENTS VALIDATION:');
        console.log('-'.repeat(60));

        let allRequiredMet = true;

        for (const req of requirements) {
          const icon = req.met ? '✓' : req.required ? '✗' : '⚠';
          console.log(`${icon} ${req.name.padEnd(30)} ${req.message}`);

          if (req.required && !req.met) {
            allRequiredMet = false;
          }
        }

        console.log('-'.repeat(60));

        console.log('\nVERDICT:');
        if (allRequiredMet) {
          console.log('  ✓ All required requirements met');
          console.log('  → Ready for promotion resolution');
        } else {
          console.log('  ✗ Some required requirements not met');
          console.log('  → Not ready for production promotion resolution');
        }

        console.log('\n===========================================\n');
        break;
      }

      case 'sandbox': {
        // Test sandbox promotion resolution
        const testCases = [
          { type: 'url', value: 'https://shop.tiktok.com/product/test-123' },
          { type: 'reference_key', value: 'tiktok-product-abc123' },
          { type: 'promotion_code', value: 'TEST10' },
        ];

        console.log('Running sandbox promotion compatibility tests\n');

        for (const testCase of testCases) {
          console.log(`Test: ${testCase.type} - ${testCase.value}`);

          const request: SandboxResolutionRequest = {
            platform: 'tiktok_shop',
            inputType: testCase.type as 'url' | 'reference_key' | 'product_id' | 'promotion_code',
            inputValue: testCase.value,
            resolutionType: 'promotion',
          };

          const result = await tiktokShopSandboxResolutionService.resolvePromotion(request);

          console.log(`  Status: ${result.resolutionStatus}`);
          console.log(`  Quality: ${result.responseQualityScore}%`);
          console.log(`  Duration: ${result.resolutionDurationMs}ms`);

          if (result.errorCode) {
            console.log(`  Error: ${result.errorCode}`);
          }

          console.log();
        }

        console.log('===========================================\n');
        break;
      }

      default:
        console.log('Commands:');
        console.log('  check                              - Check promotion support status');
        console.log('  test <inputType> <inputValue>    - Test promotion resolution');
        console.log('  validate                           - Validate compatibility requirements');
        console.log('  sandbox                            - Run sandbox compatibility tests');
        console.log('\nExamples:');
        console.log('  npm run tiktok:promotion-review -- check');
        console.log('  npm run tiktok:promotion-review -- test url "https://shop.tiktok.com/product/123"');
        console.log('  npm run tiktok:promotion-review -- validate');
        console.log('  npm run tiktok:promotion-review -- sandbox');
        console.log('===========================================\n');
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('\nERROR:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
