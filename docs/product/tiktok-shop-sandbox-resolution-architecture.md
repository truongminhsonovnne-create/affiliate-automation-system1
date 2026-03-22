# TikTok Shop Promotion Resolution Sandbox + Multi-Platform Public Flow Gating

## Architecture Overview

This document describes the architecture for TikTok Shop sandbox resolution and multi-platform public flow gating.

## Components Created

### 1. Database Migration
- **018_create_platform_resolution_gates.sql** - Core tables for platform gates, sandbox runs, support state snapshots, enablement reviews, public flow audits, and usage quotas

### 2. TypeScript Types
- **src/platform/shared/resolution/types.ts** - All TypeScript interfaces for platform support states, gate evaluation, sandbox resolution, public flow, and governance

### 3. Constants
- **src/platform/shared/resolution/constants.ts** - Platform identifiers, support states, enablement phases, gate thresholds, and helper functions

### 4. Repository
- **src/platform/shared/resolution/repository/platformResolutionGateRepository.ts** - Database operations for platform gates, snapshots, reviews, audits, and quotas

### 5. Services
- **src/platform/shared/resolution/service/platformGateEvaluationService.ts** - Evaluates platform readiness and determines support states
- **src/platform/shared/resolution/service/multiPlatformPublicFlowService.ts** - Routes public flow requests based on support states
- **src/platform/shared/resolution/service/platformEnablementGovernanceService.ts** - Manages governance reviews and phase transitions
- **src/platform/tiktokShop/resolution/service/tiktokShopSandboxResolutionService.ts** - TikTok Shop sandbox resolution implementation

### 6. API Routes
- **src/server/routes/internal/platformResolutionGates.ts** - Internal API for gate management, governance, and audits
- **src/server/routes/public/platformResolution.ts** - Public API for platform resolution with honest UX

### 7. CLI Scripts
- **src/scripts/runPlatformGateEvaluation.ts** - Evaluate platform gates
- **src/scripts/runPlatformEnablementGovernance.ts** - Manage enablement reviews
- **src/scripts/runTikTokShopSandboxResolution.ts** - Test sandbox resolution
- **src/scripts/runTikTokShopPromotionCompatibilityReview.ts** - Review promotion compatibility

### 8. Documentation
- **docs/product/platform-resolution-gates-runbook.md** - Operational runbook
- **docs/product/tiktok-shop-acquisition-runbook.md** - Existing TikTok Shop acquisition runbook

## Support States

| State | Description | Production | Sandbox | Gated |
|-------|-------------|------------|---------|-------|
| `unsupported` | Not supported | ✗ | ✗ | ✗ |
| `not_ready` | Not ready | ✗ | ✗ | ✗ |
| `sandbox_only` | Sandbox only | ✗ | ✓ | ✗ |
| `gated` | Limited access | ✗ | ✓ | ✓ |
| `partially_supported` | Partial production | ✓* | ✓ | ✗ |
| `supported` | Full support | ✓ | ✓ | ✗ |
| `production_enabled` | Full production | ✓ | ✓ | ✗ |

## Enablement Phases

| Phase | Public Access |
|-------|---------------|
| `disabled` | ✗ |
| `internal_only` | ✗ |
| `sandbox_preview` | ✗ |
| `limited_public_preview` | ✓ (limited) |
| `production_candidate` | ✓ |
| `production_enabled` | ✓ |

## Current Default States

| Platform | Support State | Enablement Phase |
|----------|-------------|------------------|
| Shopee | production_enabled | production_enabled |
| TikTok Shop | sandbox_only | sandbox_preview |
| Lazada | not_ready | disabled |
| Tokopedia | not_ready | disabled |

## API Usage

### Public Resolution
```bash
POST /public/resolve
{
  "platform": "tiktok_shop",
  "inputType": "url",
  "inputValue": "https://shop.tiktok.com/product/123",
  "resolutionType": "promotion"
}
```

### Sandbox Resolution
```bash
POST /internal/platforms/sandbox/resolve
{
  "platform": "tiktok_shop",
  "inputType": "url",
  "inputValue": "https://shop.tiktok.com/product/123",
  "resolutionType": "promotion"
}
```

### Governance Review
```bash
POST /internal/platforms/governance/reviews
{
  "platform": "tiktok_shop",
  "targetPhase": "limited_public_preview",
  "requestedBy": "admin@example.com"
}
```

## Honest UX Representation

The system ensures honest representation by:
1. Always disclosing actual support state
2. Clearly indicating sandbox vs production environment
3. Listing feature availability explicitly
4. Disclosing limitations and restrictions
5. Providing clear next steps for users

## Integration Points

### Ready for Future Connection
- Full TikTok Shop public resolve flow
- TikTok Shop public conversion UX
- Platform-aware public homepage
- Commercial attribution for TikTok Shop
- Release-governed platform enablement

### Already Integrated
- TikTok Shop domain layer
- TikTok Shop data acquisition foundation
- Multi-platform foundation
