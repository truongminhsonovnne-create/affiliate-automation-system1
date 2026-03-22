# Paste-Link Feature Runbook

## Overview

This runbook covers the operation of the "Paste Link Find Voucher" feature - the voucher resolution engine that takes a product URL and returns the best voucher.

---

## Expected Flow

### Happy Path

1. **User Action**: User pastes a Shopee product URL into the web interface
2. **API Request**: POST to `/api/v1/voucher/resolve`
3. **URL Parsing**: Engine extracts product identifiers
4. **Context Loading**: Product details loaded
5. **Voucher Matching**: System finds eligible vouchers
6. **Ranking**: Vouchers ranked by relevance
7. **Response**: User sees best voucher + explanation

### Response Time Expectations

- P50: < 200ms (cached)
- P95: < 500ms (fresh resolution)
- P99: < 1s

---

## Common Failure Modes

### 1. Invalid URL

**Symptom**: API returns error `INVALID_URL`

**Causes**:
- Malformed URL
- Non-Shopee URL
- URL too short/long

**Resolution**:
- Validate URL format client-side
- Show user-friendly error message
- Guide user to paste complete URL

### 2. No Product Identifiers

**Symptom**: `has_match: false`, `no_match_reason: "Cannot extract product identifiers"`

**Causes**:
- URL is a category page, not product page
- URL missing item/shop ID
- Tracking parameters corrupted URL

**Resolution**:
- Request user to paste product-specific URL
- Show tips: "Make sure you're on a product page, not a category"

### 3. No Matching Voucher

**Symptom**: `has_match: false`, no vouchers returned

**Causes**:
- No vouchers in system for that shop/category
- All vouchers expired
- Product outside voucher scope

**Resolution**:
- Show fallback recommendations
- Provide tips: "Check Shopee directly for vouchers"
- Log for voucher catalog improvement

### 4. Low Confidence Context

**Symptom**: `product_context.confidence < 0.5`

**Causes**:
- URL parsing only, no crawler data
- Missing price/shop info

**Resolution**:
- Still return results but with disclaimer
- Note: "Based on limited product information"

### 5. Timeout

**Symptom**: Request hangs or returns timeout error

**Causes**:
- Database slow
- Too many vouchers to evaluate
- Network issues

**Resolution**:
- Check database connection
- Verify voucher catalog size (limit to 1000)
- Increase timeout if needed

---

## Cache Invalidation

### When to Invalidate

1. **Voucher Updates**: When voucher catalog changes
2. **Scheduled**: Every 15 minutes TTL
3. **Manual**: Force refresh option

### How to Invalidate

```bash
# Force refresh a URL
curl -X POST https://api.example.com/api/v1/voucher/resolve \
  -H "Content-Type: application/json" \
  -d '{"url": "...", "force_refresh": true}'
```

### Cache Metrics

- Monitor: `voucher_cache_hit_rate`
- Target: > 60%
- Alert if: < 40%

---

## Voucher Data Freshness

### Assumptions

1. Vouchers expire within 7 days typically
2. New vouchers added daily via:
   - Manual entry
   - Crawler
   - Partner API

### Refresh Strategy

- Load all active vouchers at startup
- Filter by expiry every resolution
- Full refresh every hour
- Incremental updates as needed

### Health Checks

```sql
-- Check voucher freshness
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN ends_at > NOW() THEN 1 END) as active,
  COUNT(CASE WHEN ends_at < NOW() THEN 1 END) as expired,
  MAX(ends_at) as latest_expiry
FROM voucher_catalog;
```

---

## Debugging

### Check Request Status

```bash
# Find request
curl https://api.example.com/api/v1/voucher/stats
```

### View Recent Resolutions

```sql
SELECT
  id,
  raw_url,
  resolution_status,
  resolved_at,
  duration_ms
FROM voucher_resolution_requests
ORDER BY created_at DESC
LIMIT 10;
```

### Check for Patterns

```sql
-- No match patterns
SELECT
  product_reference->>'shopId' as shop_id,
  COUNT(*) as no_match_count
FROM voucher_resolution_requests
WHERE resolution_status = 'no_match'
GROUP BY shop_id
ORDER BY no_match_count DESC
LIMIT 10;
```

### Test URL Manually

```bash
# Using the smoke test script
npm run test:voucher \
  -- --url "https://shopee.vn/product/12345678/987654321"
```

---

## Safe Rollout Checklist

### Pre-Launch

- [ ] Database migrations applied
- [ ] Voucher catalog seeded with test data
- [ ] API endpoints responding
- [ ] Smoke tests passing
- [ ] Cache warming complete

### Launch

- [ ] Monitor cache hit rate
- [ ] Watch for error spikes
- [ ] Check P50/P95 latency
- [ ] Verify no data leaks

### Post-Launch

- [ ] Daily review of no-match rate
- [ ] Weekly voucher catalog audit
- [ ] Monthly ranking algorithm review
- [ ] User feedback collection

---

## Rollback Procedures

### If Issues Found

1. **Rollback Code**: Revert to previous version
2. **Disable Feature**: Route traffic away from `/api/v1/voucher/*`
3. **Check Health**: Verify core pipelines unaffected

### Emergency Contacts

- On-call: [PAGERDUTY_LINK]
- Slack: #voucher-engine-alerts

---

## Metrics Dashboards

### Key Dashboards

1. **Voucher Resolution**: `/dashboards/voucher-resolution`
2. **Cache Performance**: `/dashboards/voucher-cache`
3. **API Health**: `/dashboards/voucher-api`

### Important Queries

```promql
# Resolution rate
sum(rate(voucher_resolution_total[5m]))

# Error rate
sum(rate(voucher_resolution_failed_total[5m])) / sum(rate(voucher_resolution_total[5m]))

# Cache hit rate
voucher_cache_hit_rate

# Latency
histogram_quantile(0.95, voucher_resolution_duration_seconds_bucket)
```

---

## Capacity Planning

### Current Capacity

- Max requests/minute: 1000
- Max vouchers in catalog: 1000
- Cache entries: 10000

### Scaling Triggers

- Request rate > 800/min: Scale horizontally
- Cache hit rate < 50%: Increase cache size
- Resolution time > 1s: Optimize ranking

---

## Common Issues FAQ

### Q: Why do some URLs return no match?

**A**: The product may not have a matching voucher in the catalog. Check if the shop has active vouchers or if category matches exist.

### Q: Can users trust the voucher is valid?

**A**: Vouchers marked as `verified` have higher confidence. Unverified vouchers may have changed. Always check the expiry date.

### Q: What if the voucher doesn't work?

**A**: Common reasons:
- Voucher expired
- Minimum spend not met
- Specific payment method required
- Product not in eligible list

Users should always verify voucher terms on the platform.

### Q: How often is voucher data updated?

**A**: Voucher catalog is refreshed hourly. Individual resolutions use 15-minute cache.

---

## Support

For issues or questions:
- Internal: #voucher-engine channel
- External: support@affiliate-system.com
- Documentation: /docs/product/voucher-engine-architecture.md
