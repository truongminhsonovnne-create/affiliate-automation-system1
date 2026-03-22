# TikTok Shop Data Foundation Runbook

## Overview

This runbook provides operational guidance for the TikTok Shop Data Acquisition Foundation layer. It covers how to interpret readiness outputs, handle issues, and determine when the system is ready for the next implementation phase.

## Running Reviews

### Basic Usage

```bash
# Run full data foundation review
npm run tiktok:data-foundation

# Run source readiness review
npm run tiktok:source-readiness

# Run context enrichment review
npm run tiktok:context-enrichment

# Run promotion source review
npm run tiktok:promotion-review
```

### Interpreting Outputs

## Reading Source Health

### Health Status Indicators

| Status | Score | Meaning |
|--------|-------|---------|
| Healthy | ≥80% | Source is functioning well |
| Degraded | 50-80% | Source has issues but works |
| Unhealthy | <50% | Source has critical problems |
| Unknown | N/A | Source hasn't been checked |

### Health Check Components

Each source health check includes:
- **Availability**: Can we reach the source?
- **Data Quality**: Does the data have required structure?
- **Freshness**: Is the data current?

## Reading Data Readiness

### Score Breakdown

```
Overall Score: 35%

Product Context:    40% ████████░░░░░░░░░
Seller Context:    30% ██████░░░░░░░░░░░░
Category Context:  25% █████░░░░░░░░░░░░░
Price Context:     40% ████████░░░░░░░░░
Promotion Source:    0% ░░░░░░░░░░░░░░░░░
```

### Readiness Status

| Status | Score | Action |
|--------|-------|---------|
| Ready | ≥80% | Can proceed to implementation |
| Proceed Cautiously | 50-80% | Address gaps before proceeding |
| Hold | 30-50% | Major blockers exist |
| Not Ready | <30% | Critical blockers must be resolved |

## When Context is Ready

Context enrichment is considered ready when:

### Product Context
- ✓ `productId` is extractable
- ✓ `productTitle` is available
- ✓ `price` and `currency` are present
- ✓ Quality score ≥ 60%

### Seller Context
- ✓ `sellerId` is extractable
- ✓ `sellerName` is available
- ✓ Quality score ≥ 50%

### Category Context
- ✓ `categoryId` is extractable
- ✓ `categoryName` is available
- ✓ Quality score ≥ 40%

### Price Context
- ✓ `price` is available
- ✓ `currency` is present
- ✓ Quality score ≥ 70%

## When Promotion Source is Not Ready

Promotion source is NOT ready when:

1. **No Data Available**: No promotion data can be acquired
2. **Critical Blockers Exist**: Source access issues prevent any data flow
3. **Compatibility < 30%**: Less than 30% of fields map to platform-neutral contracts
4. **Missing Critical Fields**: No promotionId, promotionType, or discountValue

## Handling Freshness Issues

### Freshness Thresholds

| Status | Age | Action |
|--------|-----|--------|
| Fresh | < 30 min | No action needed |
| Stale | 1-24 hours | Consider refresh |
| Expired | > 24 hours | Must refresh |

### Detecting Stale Data

```bash
# Check data freshness via API
curl http://localhost:3000/internal/platforms/tiktok-shop/product-snapshots
```

### Refreshing Data

```bash
# Run acquisition to refresh
curl -X POST http://localhost:3000/internal/platforms/tiktok-shop/data-sources/manual_sample/run
```

## Handling Gaps and Backlog

### Viewing Backlog

```bash
# Get all backlog items
curl http://localhost:3000/internal/platforms/tiktok-shop/data-backlog

# Get summary
curl http://localhost:3000/internal/platforms/tiktok-shop/data-backlog/summary
```

### Backlog Priorities

1. **Critical**: Source unavailable, no data flow
2. **High**: Context below threshold, quality issues
3. **Medium**: Additional field coverage needed
4. **Low**: Optimization, edge cases

### Completing Backlog Items

```bash
# Mark item as complete
curl -X POST http://localhost:3000/internal/platforms/tiktok-shop/data-backlog/{id}/complete \
  -H "Content-Type: application/json" \
  -d '{"completionNotes": "Issue resolved"}'
```

## When to Proceed to Next Phase

### Current Phase: Data Acquisition Foundation

The data foundation is ready for the next phase when:

1. **Source Health**: At least one source shows "healthy" status
2. **Context Enrichment**: All context types ≥ 40% quality
3. **No Critical Blockers**: All critical blockers resolved
4. **Governance Approval**: Platform expansion approved

### Next Phase: Discovery & Detail Extraction

Before moving to implementation:
- ✓ Data sources identified and tested
- ✓ Normalization pipeline working
- ✓ Enrichment quality meets thresholds
- ✓ Backlog items prioritized
- ✓ Integration contracts defined

## Troubleshooting

### Issue: Source Returns No Data

**Symptoms**: Acquisition runs complete but no records

**Diagnosis**:
1. Check source configuration
2. Verify source availability
3. Review acquisition logs

**Resolution**:
- Configure source if needed
- Address availability issues
- Fix data extraction logic

### Issue: Enrichment Quality Low

**Symptoms**: Quality scores below threshold

**Diagnosis**:
1. Check field coverage
2. Review source data structure
3. Identify missing fields

**Resolution**:
- Improve source data quality
- Add field mapping
- Enhance enrichment logic

### Issue: Promotion Compatibility Low

**Symptoms**: Promotion compatibility < 30%

**Diagnosis**:
1. Check promotion data structure
2. Verify field mapping
3. Identify missing fields

**Resolution**:
- Improve promotion source data
- Add missing field support
- Adjust compatibility expectations

## API Reference

### Data Sources

```bash
# List all sources
GET /internal/platforms/tiktok-shop/data-sources

# Get source by key
GET /internal/platforms/tiktok-shop/data-sources/:sourceKey

# Run acquisition
POST /internal/platforms/tiktok-shop/data-sources/:sourceKey/run
```

### Context

```bash
# Get context readiness
GET /internal/platforms/tiktok-shop/context-readiness

# List product snapshots
GET /internal/platforms/tiktok-shop/product-snapshots
```

### Promotion Sources

```bash
# List promotion sources
GET /internal/platforms/tiktok-shop/promotion-sources

# Get readiness
GET /internal/platforms/tiktok-shop/promotion-sources/readiness
```

### Backlog

```bash
# List backlog
GET /internal/platforms/tiktok-shop/data-backlog

# Complete item
POST /internal/platforms/tiktok-shop/data-backlog/:id/complete
```

## Metrics to Watch

### Key Performance Indicators

1. **Source Health**: Should be ≥ 80% for healthy sources
2. **Enrichment Quality**: Should be ≥ 60% for all context types
3. **Data Freshness**: Should be < 1 hour for active data
4. **Backlog Size**: Should decrease over time

### Warning Signs

- Health score dropping
- Quality scores declining
- Stale data accumulating
- Backlog growing

## Support

For issues or questions:
- Check logs in `logs/tiktok-shop-data/`
- Review source health via API
- Examine backlog for blockers
- Consult architecture documentation
