# TikTok Shop Domain Architecture

## Overview

The TikTok Shop Domain Layer provides production-grade domain modeling for TikTok Shop integration. It includes:

- **Product Reference Intelligence** - URL parsing and canonical reference generation
- **Product Context Modeling** - Rich product data structures for promotion resolution
- **Promotion Compatibility** - Mapping TikTok Shop promotions to platform-neutral contracts

## Architecture

```
TikTok Shop Input
       │
       ▼
┌─────────────────┐
│  URL Parser     │ ───► Parse variants
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Reference       │ ───► Canonical reference
│ Resolver        │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Context Model   │ ───► Product context
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Promotion       │ ───► Compatibility mapping
│ Model           │
└─────────────────┘
       │
       ▼
  Platform-Neutral
    Contracts
```

## Reference Intelligence

### Supported URL Types

| Type | Pattern | Example |
|------|---------|---------|
| Product Detail | `/shop/{shopId}/product/{itemId}` | shop.tiktok.com/shop/123/product/456 |
| Shop | `/@username` | tiktok.com/@shopname |
| Short Link | `vm.tiktok.com/{id}` | vm.tiktok.com/abc123 |
| Video | `/video/{id}` | tiktok.com/@user/video/123 |

### Parsing Confidence

- **High (≥90%)**: Valid TikTok Shop URL with product ID
- **Medium (70-90%)**: Valid URL, partial ID
- **Low (<70%)**: Unknown format

## Product Context Model

### Required Fields

- `productId` - Unique product identifier
- `title` - Product title
- `seller` - Seller context (shopId required)
- `price` - Price context (currentPrice required)

### Optional Fields

- `description` - Product description
- `category` - Category context
- `images` - Product images
- `inventory` - Stock status

## Promotion Compatibility

### Compatibility Levels

| Level | Score | Meaning |
|-------|-------|----------|
| Full | ≥90% | Direct mapping available |
| Partial | 60-90% | Some adaptation needed |
| Unsupported | <60% | Not compatible |

### Supported Promotion Types

- Discounts
- Vouchers/Coupons
- Flash Sales
- Bundles
- Free Shipping

### Scope Mapping

| TikTok Scope | Commerce Scope |
|--------------|----------------|
| global | global |
| shop | seller |
| product | product |
| category | category |
| cart | cart |

### Known Gaps

1. **User Segment** - Not directly supported, use eligibility conditions
2. **BOGO** - Requires workaround with fixed discount
3. **VIP Eligibility** - Different tier system than Shopee
4. **Region Constraints** - Different implementation

## Integration

### Platform-Neutral Contracts

The layer maps to these contracts:

- `CommerceProductReference`
- `CommerceProductContext`
- `CommercePromotion`

### Adapter Pattern

Adapters implement platform contracts:
- `PlatformProductReferenceAdapter`
- `PlatformProductContextAdapter`
- `PlatformPromotionAdapter`

## Usage

```typescript
import { resolveTikTokShopProductReference } from './platform/tiktokShop/reference';
import { buildTikTokShopProductContext } from './platform/tiktokShop/context';

// Parse URL
const result = resolveTikTokShopProductReference('https://shop.tiktok.com/shop/123/product/456');

// Build context
const context = buildTikTokShopProductContext(rawData);
```

## Current Status

| Component | Status | Score |
|-----------|--------|-------|
| Reference Parsing | Partial | 60% |
| Context Modeling | Partial | 40% |
| Promotion Compatibility | Partial | 30% |
| Integration | Partial | 20% |

## Next Steps

1. Implement reference parser with more variants
2. Build context resolver service
3. Complete promotion compatibility mappings
4. Integrate with multi-platform foundation
