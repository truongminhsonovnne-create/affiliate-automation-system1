/**
 * TikTok Shop Sandbox Resolution CLI Script
 *
 * Runs TikTok Shop sandbox resolution for testing purposes.
 */

import { tiktokShopSandboxResolutionService } from '../platform/tiktokShop/resolution/service/tiktokShopSandboxResolutionService.js';
import type { SandboxResolutionRequest } from '../platform/shared/resolution/types.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('\n===========================================');
  console.log('TIKTOK SHOP SANDBOX RESOLUTION');
  console.log('===========================================\n');

  try {
    switch (command) {
      case 'promotion': {
        const inputType = args[1] || 'url';
        const inputValue = args[2] || 'https://shop.tiktok.com/product/sample';

        console.log(`Resolving promotion\n`);
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
        console.log(`  Request ID: ${result.requestId}`);
        console.log(`  Run ID: ${result.runId}`);
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

      case 'product': {
        const inputType = args[1] || 'reference_key';
        const inputValue = args[2] || 'tiktok-product-001';

        console.log(`Resolving product\n`);
        console.log(`  Input Type: ${inputType}`);
        console.log(`  Input Value: ${inputValue}\n`);

        const request: SandboxResolutionRequest = {
          platform: 'tiktok_shop',
          inputType: inputType as 'url' | 'reference_key' | 'product_id' | 'promotion_code',
          inputValue,
          resolutionType: 'product',
        };

        const result = await tiktokShopSandboxResolutionService.resolveProduct(request);

        console.log('RESULT:');
        console.log(`  Request ID: ${result.requestId}`);
        console.log(`  Run ID: ${result.runId}`);
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

      case 'batch': {
        const testCases = [
          { type: 'url', value: 'https://shop.tiktok.com/product/test-123', resolutionType: 'promotion' },
          { type: 'reference_key', value: 'tiktok-product-abc123', resolutionType: 'product' },
          { type: 'promotion_code', value: 'SAVE10', resolutionType: 'promotion' },
          { type: 'product_id', value: 'prod_123456', resolutionType: 'product' },
        ];

        console.log('Running batch sandbox resolution\n');

        let successCount = 0;
        let failCount = 0;

        for (const testCase of testCases) {
          console.log(`Test: ${testCase.type} - ${testCase.value} (${testCase.resolutionType})`);

          const request: SandboxResolutionRequest = {
            platform: 'tiktok_shop',
            inputType: testCase.type as 'url' | 'reference_key' | 'product_id' | 'promotion_code',
            inputValue: testCase.value,
            resolutionType: testCase.resolutionType as 'promotion' | 'product',
          };

          const result = testCase.resolutionType === 'promotion'
            ? await tiktokShopSandboxResolutionService.resolvePromotion(request)
            : await tiktokShopSandboxResolutionService.resolveProduct(request);

          console.log(`  Status: ${result.resolutionStatus}`);
          console.log(`  Quality: ${result.responseQualityScore}%`);
          console.log(`  Duration: ${result.resolutionDurationMs}ms`);

          if (result.resolutionStatus === 'success') {
            successCount++;
          } else {
            failCount++;
            if (result.errorCode) {
              console.log(`  Error: ${result.errorCode}`);
            }
          }

          console.log();
        }

        console.log(`Results: ${successCount} success, ${failCount} failed`);
        console.log('===========================================\n');
        break;
      }

      default:
        console.log('Commands:');
        console.log('  promotion <inputType> <inputValue>  - Resolve promotion');
        console.log('  product <inputType> <inputValue>    - Resolve product');
        console.log('  batch                              - Run batch tests');
        console.log('\nInput types: url, reference_key, product_id, promotion_code');
        console.log('\nExamples:');
        console.log('  npm run sandbox:resolve -- promotion url "https://shop.tiktok.com/product/123"');
        console.log('  npm run sandbox:resolve -- product reference_key "tiktok-product-001"');
        console.log('  npm run sandbox:resolve -- batch');
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
