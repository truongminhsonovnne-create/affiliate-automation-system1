# Voucher Engine Architecture

## Overview

The Voucher Engine is a production-grade decision system that solves the problem of finding the best voucher/discount code for a given product URL. Instead of listing all available vouchers for users to manually find, the engine intelligently matches, ranks, and explains voucher recommendations.

## Core Philosophy

- **Tool-first**: Designed as an API-first service
- **Decision engine**: Solves the problem for users, not just lists options
- **Explainable**: Every recommendation comes with clear reasoning
- **Speed-first**: Optimized for fast response times
- **Minimal friction**: Single URL input, actionable output

---

## Domain Model

### Product Reference

The engine receives a product URL and converts it into a structured reference:

```typescript
interface CanonicalShopeeProductReference {
  platform: 'shopee';
  itemId: string;
  shopId: string | null;
  categoryId: string | null;
  categoryPath: string[] | null;
  title: string | null;
  price: number | null;
  normalizedUrl: string;
}
```

### Product Context

Additional context extracted for matching:

```typescript
interface ProductContext {
  platform: SupportedVoucherPlatform;
  productId: string | null;
  shopId: string | null;
  shopName: string | null;
  categoryPath: string[];
  title: string | null;
  price: number | null;
  confidence: number; // How confident we are in the data
  contextSource: 'url' | 'crawler' | 'catalog' | 'inferred';
}
```

### Voucher Catalog

The universe of available vouchers:

```typescript
interface VoucherCatalogRecord {
  id: string;
  platform: SupportedVoucherPlatform;
  voucherCode: string | null;
  voucherTitle: string;
  voucherType: VoucherType;
  discountType: VoucherDiscountType | null;
  discountValue: number | null;
  minimumSpend: number | null;
  appliesToScope: VoucherScope;
  shopId: string | null;
  categoryPath: string[] | null;
  priority: number;
  isActive: boolean;
}
```

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        INPUT: URL                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    1. URL PARSING LAYER                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Parse and validate Shopee URL                         │  │
│  │  • Extract itemId, shopId, category hints                │  │
│  │  • Normalize URL for caching                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               2. PRODUCT REFERENCE RESOLVER                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Convert URL to canonical reference                    │  │
│  │  • Build product fingerprint for caching                 │  │
│  │  • Calculate confidence score                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 3. PRODUCT CONTEXT LOADER                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Load product details from crawler/catalog            │  │
│  │  • Extract category, shop, price info                  │  │
│  │  • Calculate context confidence                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  4. VOUCHER CATALOG LOADER                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Load active vouchers for platform                    │  │
│  │  • Pre-filter by relevance (shop/category)             │  │
│  │  • Sort by priority and expiry                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               5. ELIGIBILITY EVALUATOR                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Check platform match                                 │  │
│  │  • Verify time window (active)                         │  │
│  │  • Evaluate scope (shop/category/all)                  │  │
│  │  • Check minimum spend                                 │  │
│  │  • Apply custom eligibility rules                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    6. RANKING ENGINE                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Score by applicability (35%)                        │  │
│  │  • Score by expected value (35%)                       │  │
│  │  • Score by freshness (15%)                            │  │
│  │  • Score by priority (15%)                             │  │
│  │  • Sort and limit candidates                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                7. EXPLANATION BUILDER                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Generate human-readable match reason                  │  │
│  │  • Create applicability details                          │  │
│  │  • Build fallback recommendations                       │  │
│  │  • Generate user tips                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OUTPUT: Structured Result                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Best voucher with code                               │  │
│  │  • Top candidates (ranked)                             │  │
│  │  • Explanation (why this voucher)                      │  │
│  │  • Tips for user                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Eligibility Logic

The eligibility evaluator checks multiple factors in order:

### Critical Rules (Must Pass)

1. **Platform Match**: Voucher platform must match product platform
2. **Time Window**: Current time must be within voucher validity period
3. **Scope Match**:
   - `all`: Always applicable
   - `shop`: Shop ID must match
   - `category`: Category must match
   - `product`: Product ID must match

### Threshold Rules

4. **Minimum Spend**:
   - If product price < minimum spend: Critical failure
   - If product price is close (within 20%): Warning

### Scoring

Eligibility score = sum of passed checks, normalized to 0-1

```typescript
if (eligibilityScore >= 0.5 && failedRules.length === 0) {
  // Voucher is eligible
}
```

---

## Ranking Logic

The ranking engine scores each eligible voucher:

### Score Components

| Component | Weight | Description |
|----------|--------|-------------|
| Applicability | 35% | How well the voucher matches the product |
| Value | 35% | Expected discount value |
| Freshness | 15% | How recent/valid the voucher is |
| Priority | 15% | Voucher priority and verification status |

### Applicability Score

- Exact product match: 100%
- Shop match: 85%
- Category match: 70%
- Platform-wide: 50%
- Fallback: 30%

### Value Score

- Percentage discount: discount%
- Fixed amount: discount / product price
- Free shipping: 20% (assumed value)

### Final Score

```
finalScore = (applicability * 0.35) +
             (value * 0.35) +
             (freshness * 0.15) +
             (priority * 0.15)
```

---

## Explainability Model

Every result includes clear explanations:

### Best Match Reason

```json
{
  "best_match_reason": "Voucher \"GIAM10\" phù hợp nhất với sản phẩm này"
}
```

### Candidate Summaries

```json
{
  "candidate_summaries": [
    {
      "title": "Giảm 10% toàn sàn",
      "match_reason": "Áp dụng toàn sàn Shopee. Giảm 10%.",
      "applicability_details": [
        "Độ chắc chắn: 95%",
        "Độ chính xác scope: 50%"
      ],
      "value_details": [
        "Giá trị mong đợi: ~12,900đ"
      ]
    }
  ]
}
```

### Tips

```json
{
  "tips": [
    "Sử dụng mã \"GIAM10\" khi thanh toán",
    "Mua thêm 21,000đ để đạt mức tối thiểu 150,000đ"
  ]
}
```

---

## Caching Strategy

### Cache Key

```
voucher_resolution:{platform}:{urlHash}
```

### Cache Flow

1. Check cache before resolution
2. Cache results with 15-minute TTL
3. Invalidate on voucher updates
4. Support force refresh option

### Cache Hit Rate Target

- > 80% for popular products
- > 60% overall

---

## Persistence

### Tables

1. **voucher_catalog**: All vouchers
2. **voucher_resolution_requests**: Request log
3. **voucher_resolution_results**: Result storage
4. **voucher_match_cache**: Fast lookup cache

### Use Cases

- Debug failed resolutions
- Analyze match quality
- Improve ranking over time
- Support analytics

---

## API Contracts

### POST /api/v1/voucher/resolve

**Request:**
```json
{
  "url": "https://shopee.vn/product/12345678/987654321",
  "platform": "shopee",
  "max_candidates": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "has_match": true,
    "match_type": "shop",
    "best_voucher": {
      "id": "voucher-002",
      "code": "SHOP20K",
      "title": "Giảm 20K đơn 150K",
      "discount_type": "fixed_amount",
      "discount_value": 20000,
      "match_type": "shop",
      "expected_value": 20000
    },
    "explanation": {
      "best_match_reason": "Voucher phù hợp với shop này",
      "tips": ["Sử dụng mã SHOP20K"]
    }
  }
}
```

---

## Extension Paths

### Future Enhancements

1. **Multi-platform Support**: Extend to Lazada, Tiki, TikTok
2. **Personalization**: User history-based recommendations
3. **Browser Extension**: One-click voucher discovery
4. **Landing Pages**: SEO-optimized voucher pages per product
5. **Analytics**: Track conversion from recommendations

### Scaling Considerations

- Redis cache for high-traffic URLs
- CDN for static assets
- Rate limiting for API
- A/B testing for ranking improvements

---

## Performance Targets

| Metric | Target |
|--------|--------|
| P50 Latency | < 200ms |
| P95 Latency | < 500ms |
| P99 Latency | < 1s |
| Cache Hit Rate | > 60% |
| Availability | 99.9% |

---

## Error Handling

| Error Code | Description | Recoverable |
|------------|-------------|-------------|
| INVALID_URL | Invalid product URL | Yes |
| UNSUPPORTED_PLATFORM | Platform not supported | Yes |
| PRODUCT_RESOLUTION_FAILED | Cannot parse product | Yes |
| CATALOG_LOAD_FAILED | Database error | No |
| TIMEOUT | Resolution timeout | Yes |
| INTERNAL_ERROR | Unexpected error | No |

---

## Monitoring

### Key Metrics

- Resolution count by status
- Cache hit/miss ratio
- Average resolution time
- No-match rate
- Top requested products

### Alerts

- Resolution failure rate > 5%
- Cache hit rate < 50%
- P95 latency > 1s
