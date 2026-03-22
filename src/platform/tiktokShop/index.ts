/**
 * TikTok Shop Domain Layer Module Exports
 */

// Types
export * from './types.js';

// Constants
export * from './constants.js';

// Reference
export * from './reference/tiktokShopUrlParser.js';
export * from './reference/tiktokShopReferenceResolver.js';
export * from './reference/tiktokShopReferencePatterns.js';

// Context
export * from './context/tiktokShopProductContextModel.js';
export * from './context/tiktokShopContextCompatibility.js';

// Promotions
export * from './promotions/tiktokShopPromotionModel.js';
export * from './promotions/tiktokShopPromotionCompatibilityMapper.js';
export * from './promotions/tiktokShopPromotionConstraintCompiler.js';
export * from './promotions/tiktokShopPromotionRuleCompatibility.js';

// Platform Support
export * from './platformSupport/tiktokShopSupportLevelService.js';
export * from './platformSupport/tiktokShopCapabilityGapService.js';

// Mapping
export * from './mapping/tiktokShopCommerceMapper.js';

// Adapters
export * from './adapters/tiktokShopReferenceAdapter.js';
export * from './adapters/tiktokShopContextAdapter.js';
export * from './adapters/tiktokShopPromotionAdapter.js';

// Service
export * from './service/tiktokShopDomainService.js';
