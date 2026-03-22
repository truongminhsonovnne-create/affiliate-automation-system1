# Multi-Platform Foundation Architecture

## Overview

The Multi-Platform Foundation provides a standardized architecture for expanding the Affiliate Automation System to support multiple e-commerce platforms beyond Shopee. It creates platform-neutral contracts while maintaining clean boundaries between generic and platform-specific implementations.

## Core Design Principles

1. **Abstraction at the Right Places** - Contracts are platform-neutral, implementations are platform-specific
2. **No Premature Generalization** - Don't over-abstract until there's actual need
3. **Shopee Compatibility** - Existing Shopee functionality must not break
4. **Governance-First Expansion** - Readiness review before implementation

## Platform Contracts

### Product Reference Contract (`contracts/productReference.ts`)
- `CommerceProductReference` - Platform-neutral product reference
- `PlatformProductIdentifier` - Platform-specific identifiers
- `normalizeCommerceProductReference()` - Normalize input to platform-neutral form
- `validateCommerceProductReference()` - Validate reference

### Product Context Contract (`contracts/productContext.ts`)
- `CommerceProductContext` - Normalized product details
- `CommerceSellerContext` - Seller information
- `CommerceCategoryContext` - Category hierarchy
- `CommercePriceContext` - Pricing data

### Promotion Contract (`contracts/promotion.ts`)
- `CommercePromotion` - Platform-neutral promotion
- `CommercePromotionEligibility` - Eligibility rules
- `resolvePromotionCandidates()` - Find applicable promotions

### Commercial Contract (`contracts/commercial.ts`)
- `CommerceOutboundAction` - Click/action tracking
- `CommerceConversionOutcome` - Conversion data
- `CommerceAttributionLineage` - Attribution breakdown

### Growth Contract (`contracts/growth.ts`)
- `CommerceGrowthSurface` - Growth surface definition
- `CommerceEntrySurface` - Entry point tracking

## Platform Capability Model

### Capability Areas

| Area | Description | Dependencies |
|------|-------------|---------------|
| `product_reference_parsing` | Parse product URLs/IDs | None |
| `product_context_resolution` | Resolve product details | product_reference_parsing |
| `promotion_rule_modeling` | Model promotions/vouchers | product_context_resolution |
| `public_flow_support` | Public paste-link flow | product_reference_parsing, product_context_resolution |
| `commercial_attribution` | Attribution tracking | public_flow_support, promotion_rule_modeling |
| `growth_surface_support` | Growth surfaces | public_flow_support |
| `ops_governance_support` | Operations/governance | commercial_attribution |
| `bi_readiness_support` | BI/reporting | commercial_attribution, growth_surface_support |

### Capability Statuses

- `not_started` - Not yet implemented
- `in_progress` - Currently being developed
- `partial` - Partially implemented
- `complete` - Fully implemented
- `verified` - Tested and verified in production

## Platform Adapter Architecture

### Adapter Contracts

Each platform implements these adapters:
- `PlatformProductReferenceAdapter` - Parse and normalize references
- `PlatformProductContextAdapter` - Resolve product details
- `PlatformPromotionAdapter` - Resolve promotions
- `PlatformCommercialAdapter` - Track actions/conversions
- `PlatformGrowthAdapter` - Manage growth surfaces

### Implementation Status

| Platform | Reference | Context | Promotion | Commercial | Growth |
|----------|------------|---------|------------|------------|--------|
| Shopee | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete |
| TikTok Shop | ⏳ Placeholder | ⏳ Placeholder | ⏳ Placeholder | ⏳ Placeholder | ⏳ Placeholder |

## Readiness Model

### Readiness Statuses

| Status | Score | Meaning |
|--------|-------|---------|
| `ready` | ≥85% | Can proceed with expansion |
| `proceed_cautiously` | 70-85% | Can proceed with caution |
| `hold` | 50-70% | Need more preparation |
| `not_ready` | <50% | Critical blockers exist |

### Readiness Review Types

- `initial` - First-time readiness evaluation
- `incremental` - Periodic check-in
- `pre_launch` - Before launching on platform
- `post_launch` - After going live
- `quarterly` - Regular governance review

## TikTok Shop Readiness

### Current Status

```
Status: NOT_READY
Score: 0%
```

### Missing Capabilities

1. **Product Reference Parsing** - Not started
2. **Product Context Resolution** - Not started
3. **Promotion Rule Modeling** - Not started
4. **Public Flow Support** - Not started
5. **Commercial Attribution** - Not started
6. **Growth Surface Support** - Not started

### Recommended Path

1. Build product reference parser for TikTok Shop URLs
2. Build product context resolver (prices, sellers, categories)
3. Model TikTok Shop promotion types
4. Implement public paste-link UI
5. Set up attribution tracking
6. Create growth surfaces

## Integration Points

### Voucher Engine Integration

```typescript
// Platform-aware voucher resolution
const result = await resolvePromotionCandidatesForPlatform(
  'tiktok_shop',
  promotions,
  context
);
```

### Public Flow Integration

```typescript
// Detect platform from input
const { platform, isValid } = resolvePublicPlatformContext(input);
```

### Commercial Attribution Integration

```typescript
// Platform-aware attribution
const lineage = await buildPlatformAwareAttributionLineage(params);
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/internal/platforms` | GET | List platforms |
| `/internal/platforms/:key` | GET | Get platform |
| `/internal/platforms/:key/capabilities` | GET | Get capabilities |
| `/internal/platforms/:key/readiness` | GET | Get readiness |
| `/internal/platforms/:key/readiness/run` | POST | Run review |
| `/internal/platforms/:key/backlog` | GET | Get backlog |
| `/internal/platforms/tiktok-shop/readiness` | GET | TikTok Shop status |

## Database Schema

### Tables

- `platform_registry` - Platform registration
- `platform_capability_snapshots` - Capability snapshots
- `platform_readiness_reviews` - Readiness reviews
- `platform_expansion_backlog` - Work items
- `platform_governance_audits` - Audit trail

## Expansion Governance

### Decision Framework

Before expanding to a new platform:

1. ✅ Run initial readiness review
2. ✅ Review blockers and warnings
3. ✅ Get recommendation (proceed/hold/not_ready)
4. ✅ Create expansion backlog
5. ✅ Complete critical items
6. ✅ Re-evaluate readiness
7. ✅ Get approval before launch

### Risk Management

- Critical blockers automatically prevent expansion
- Warnings are tracked but don't block
- Backlog items have due dates and owners
- Stale items escalate automatically
