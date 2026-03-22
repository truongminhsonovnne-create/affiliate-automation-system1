# TikTok Shop Data Acquisition Foundation Architecture

## Overview

The TikTok Shop Data Acquisition Foundation is a production-grade layer for acquiring, normalizing, enriching, and evaluating data readiness for the TikTok Shop platform. This layer sits between the raw data sources and the domain layer, providing a controlled pipeline for data preparation.

## Architecture Principles

1. **Source Quality First**: Data quality is evaluated before any production use
2. **Explicit Readiness**: All data paths have clear supported/partial/unavailable states
3. **Enrichment-Aware**: Context enrichment is a first-class concern
4. **Safe Extension**: New sources can be added without breaking existing functionality
5. **No Premature Rollout**: Production readiness requires evidence, not assumptions

## System Components

### 1. Data Sources Registry

**Location**: `src/platform/tiktokShop/data/sourceRegistry/`

Manages registration and retrieval of TikTok Shop data sources.

**Sources**:
- `manual_sample` - Manual/sample data for testing (partial support)
- `import_file` - JSON/CSV file import (unsupported)
- `tiktok_api_product` - Official TikTok Product API (unavailable)
- `tiktok_api_promotion` - Official TikTok Promotion API (unavailable)
- `tiktok_web_scraper` - Web scraping solution (unavailable)
- `tiktok_affiliate_api` - TikTok Affiliate API (unavailable)

### 2. Source Health Service

**Location**: `src/platform/tiktokShop/data/sourceHealth/`

Evaluates health status for each data source through:
- Availability checks
- Data structure validation
- Connectivity tests

### 3. Acquisition Orchestrator

**Location**: `src/platform/tiktokShop/data/acquisition/`

Orchestrates the data acquisition pipeline:
1. Load raw data from source
2. Validate raw payload
3. Normalize records
4. Persist snapshots
5. Run enrichment
6. Evaluate readiness

### 4. Normalization Pipeline

**Location**: `src/platform/tiktokShop/data/normalization/`

- `tiktokShopProductNormalizer.ts` - Normalizes product data to standard format
- `tiktokShopPromotionSourceNormalizer.ts` - Normalizes promotion data for compatibility

### 5. Context Enrichment

**Location**: `src/platform/tiktokShop/data/enrichment/`

- `tiktokShopContextEnrichmentService.ts` - Enriches product, seller, category, and price context
- `tiktokShopEnrichmentQualityEvaluator.ts` - Evaluates enrichment quality and detects gaps

### 6. Promotion Source Readiness

**Location**: `src/platform/tiktokShop/data/promotions/`

- `tiktokShopPromotionSourceReadinessService.ts` - Evaluates promotion source readiness
- `tiktokShopPromotionAcquisitionGapAnalyzer.ts` - Detects gaps in promotion acquisition

### 7. Freshness Service

**Location**: `src/platform/tiktokShop/data/freshness/`

Evaluates data freshness and staleness:
- Fresh: < 30 minutes
- Stale: > 1 hour
- Expired: > 24 hours

### 8. Data Readiness Evaluator

**Location**: `src/platform/tiktokShop/data/readiness/`

- `tiktokShopDataReadinessEvaluator.ts` - Core evaluator for data layer readiness
- `tiktokShopContextSupportMatrix.ts` - Builds support matrices for context fields

### 9. Backlog Management

**Location**: `src/platform/tiktokShop/data/backlog/`

Manages capability gaps and blockers:
- Source gaps
- Normalization gaps
- Enrichment gaps
- Quality gaps
- Integration gaps

### 10. Integration Layer

**Location**: `src/platform/tiktokShop/data/integration/`

- `tiktokShopDomainDataIntegration.ts` - Integrates with TikTok domain layer
- `tiktokShopPromotionCompatibilityIntegration.ts` - Integrates with promotion compatibility
- `multiPlatformDataIntegration.ts` - Integrates with multi-platform foundation

## Data Flow

```
┌─────────────────┐
│  Source        │
│  Registry      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Source Health  │──── Source Health Result
│ Service        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Acquisition     │──── Raw Data
│ Orchestrator   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Normalization  │──── Normalized Data
│ Pipeline       │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌────────┐
│Domain │ │Enrich- │
│Layer  │ │ment    │
└───┬───┘ └───┬────┘
    │         │
    ▼         ▼
┌─────────────────┐
│ Readiness       │──── Data Readiness
│ Evaluator      │     Summary
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Backlog        │──── Backlog Items
│ Management     │
└─────────────────┘
```

## Database Schema

### Tables

1. **tiktok_shop_data_sources** - Registry of data sources
2. **tiktok_shop_acquisition_runs** - Acquisition run history
3. **tiktok_shop_product_snapshots** - Product data snapshots
4. **tiktok_shop_context_enrichment_records** - Enrichment results
5. **tiktok_shop_promotion_source_records** - Promotion source data
6. **tiktok_shop_source_readiness_reviews** - Readiness review history
7. **tiktok_shop_data_backlog** - Capability gaps and blockers

## API Endpoints

### Data Sources
- `GET /internal/platforms/tiktok-shop/data-sources` - List all sources
- `GET /internal/platforms/tiktok-shop/data-sources/:sourceKey` - Get source by key
- `POST /internal/platforms/tiktok-shop/data-sources/:sourceKey/run` - Run acquisition

### Context
- `GET /internal/platforms/tiktok-shop/context-readiness` - Get context readiness
- `GET /internal/platforms/tiktok-shop/product-snapshots` - List snapshots

### Promotion Sources
- `GET /internal/platforms/tiktok-shop/promotion-sources` - List promotion sources
- `GET /internal/platforms/tiktok-shop/promotion-sources/readiness` - Get readiness

### Backlog
- `GET /internal/platforms/tiktok-shop/data-backlog` - List backlog items
- `POST /internal/platforms/tiktok-shop/data-backlog/:id/complete` - Complete item

## Current Readiness Status

| Component | Status | Score |
|-----------|--------|-------|
| Product Context | Partial | ~40% |
| Seller Context | Partial | ~30% |
| Category Context | Partial | ~25% |
| Price Context | Partial | ~40% |
| Promotion Source | Unavailable | 0% |

## Integration Points

### TikTok Domain Layer
- Provides normalized data for domain context
- Feeds product reference intelligence
- Supports promotion compatibility mapping

### Multi-Platform Foundation
- Reports data capability snapshots
- Updates platform registry
- Provides readiness signals

### Governance & Strategy
- Backlog feeds governance review
- Readiness affects expansion decisions
- Quality metrics inform strategic planning
