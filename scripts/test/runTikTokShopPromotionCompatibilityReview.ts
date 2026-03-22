/**
 * Run TikTok Shop Promotion Compatibility Review
 *
 * Usage: npx tsx scripts/test/runTikTokShopPromotionCompatibilityReview.ts
 */

import { buildTikTokShopPromotionCompatibilityReport } from '../../src/platform/tiktokShop/service/tiktokShopDomainService.js';
import { logger } from '../../src/utils/logger.js';

// Sample TikTok Shop promotion data for testing
const samplePromotions = [
  {
    promotionId: 'DISCOUNT001',
    promotionCode: 'SAVE10',
    promotionType: 'discount',
    title: '10% Off',
    scope: 'global',
    benefit: { discountType: 'percentage', discountValue: 10 },
    eligibility: { eligibilityType: 'all', constraints: [] },
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isStackable: true,
  },
  {
    promotionId: 'VOUCHER001',
    promotionCode: 'VIP20',
    promotionType: 'voucher',
    title: '20% Off for VIP',
    scope: 'shop',
    benefit: { discountType: 'percentage', discountValue: 20 },
    eligibility: { eligibilityType: 'vip', constraints: [] },
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isStackable: false,
  },
  {
    promotionId: 'BOGO001',
    promotionType: 'bundle',
    title: 'Buy 2 Get 1 Free',
    scope: 'product',
    benefit: { discountType: 'bogo', discountValue: 1 },
    eligibility: { eligibilityType: 'all', constraints: [{ type: 'min_quantity', operator: 'gte', value: 2 }] },
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isStackable: false,
  },
];

async function main() {
  logger.info({ msg: 'Starting TikTok Shop Promotion Compatibility Review' });

  try {
    const result = await buildTikTokShopPromotionCompatibilityReport(samplePromotions);

    console.log('\n=== TikTok Shop Promotion Compatibility Review ===');
    console.log(`Total Promotions: ${result.total}`);
    console.log(`Fully Compatible: ${result.fullyCompatible}`);
    console.log(`Partially Compatible: ${result.partiallyCompatible}`);
    console.log(`Not Compatible: ${result.notCompatible}`);
    console.log(`Average Score: ${(result.averageScore * 100).toFixed(0)}%`);

    if (result.commonGaps.length > 0) {
      console.log('\nCommon Gaps:');
      result.commonGaps.forEach(gap => console.log(`  - ${gap}`));
    }

    if (result.recommendations.length > 0) {
      console.log('\nRecommendations:');
      result.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

    process.exit(0);
  } catch (error) {
    logger.error({ msg: 'Promotion Compatibility Review Failed', error });
    process.exit(1);
  }
}

main();
