# TikTok Shop Acquisition Runbook

## Overview

This runbook provides operational guidance for the TikTok Shop Discovery & Detail Extraction Pipeline.

## Running Cycles

### Discovery Cycle

```bash
# Run discovery with default seeds
npm run tiktok:discovery

# Run discovery with custom seeds
npm run tiktok:discovery -- --seeds "https://shop.tiktok.com/category/electronics"

# Run discovery with categories
npm run tiktok:discovery -- --categories "electronics,beauty,fashion"
```

### Detail Extraction Cycle

```bash
# Extract details for specific references
npm run tiktok:detail -- tiktok-product-123 tiktok-product-456

# Note: Requires reference keys from discovery output
```

### Health Check

```bash
# Check acquisition health
npm run tiktok:acquisition-health
```

## Reading Health

### Health Status

| Status | Meaning | Action |
|--------|---------|--------|
| Healthy | All systems operational | Continue normal operation |
| Degraded | Some issues detected | Monitor closely, consider throttling |
| Paused | Auto-paused due to errors | Investigate and resolve issues |
| Unhealthy | Critical issues | Stop and investigate |

### Quality Scores

```
Extraction Quality: 65%

Title:       80% ██████████░░░░░░
Seller:      60% ████████░░░░░░░░
Price:       75% ██████████░░░░░░
Category:    50% ██████░░░░░░░░░░
Promotion:   40% █████░░░░░░░░░░░░
Media:       60% ████████░░░░░░░░
```

## When to Pause

Pause acquisition immediately if:

1. **Error rate > 20%** - Something is seriously wrong
2. **Anti-bot triggered** - TikTok is blocking us
3. **Consecutive failures ≥ 5** - Pattern suggests systematic issue
4. **Health score < 30%** - System is unhealthy

## When Extraction Quality Is Not Enough

Quality is insufficient when:

1. **Overall score < 50%** - Too many fields missing
2. **Price field missing** - Can't do price comparison
3. **Seller info missing** - Can't attribute to seller
4. **Product ID missing** - Can't identify products reliably

## Handling Failures

### Navigation Timeout

**Symptoms**: Page takes too long to load

**Action**:
1. Check network connectivity
2. Increase timeout values
3. Reduce concurrency
4. Check if TikTok is rate-limiting

### Anti-Bot Detection

**Symptoms**: Access denied, CAPTCHA, blocked

**Action**:
1. Pause acquisition immediately
2. Wait 30+ minutes before resuming
3. Reduce concurrency
4. Consider proxy rotation

### Selector Fragility

**Symptoms**: Inconsistent extraction, element not found

**Action**:
1. Review selector logs
2. Update selectors in code
3. Add fallback selectors
4. Consider XPath alternatives

## Backlog Management

View backlog:
```bash
# Via API
curl http://localhost:3000/internal/platforms/tiktok-shop/acquisition/backlog
```

Priorities:
1. **Critical**: Selector failures, anti-bot issues
2. **High**: Quality gaps, missing fields
3. **Medium**: Optimization, additional fields
4. **Low**: Edge cases, polish

## Scaling Decisions

### Scale Up When

- Health ≥ 80% sustained for 24 hours
- Error rate < 10%
- Quality ≥ 60%
- Governance approval

### Scale Down When

- Health < 60%
- Error rate > 15%
- Quality < 50%

## API Reference

### Discovery

```bash
# Start discovery
POST /internal/platforms/tiktok-shop/discovery/run
{"seeds": ["..."], "categories": ["..."]}

# Get jobs
GET /internal/platforms/tiktok-shop/discovery/jobs
```

### Detail

```bash
# Run extraction
POST /internal/platforms/tiktok-shop/detail/run
{"referenceKeys": ["..."]}

# Get records
GET /internal/platforms/tiktok-shop/detail/raw-records
```

### Health

```bash
# Get health status
GET /internal/platforms/tiktok-shop/acquisition/health

# Get backlog
GET /internal/platforms/tiktok-shop/acquisition/backlog
```

## Troubleshooting

### Issue: No candidates discovered

**Diagnosis**:
1. Check seeds are valid TikTok Shop URLs
2. Verify page loads successfully
3. Check for anti-bot blocks

**Resolution**:
- Use curated URLs from allowed surfaces
- Wait and retry with lower concurrency

### Issue: Low extraction quality

**Diagnosis**:
1. Check which fields are missing
2. Review selectors used
3. Check page structure

**Resolution**:
- Update selectors
- Add fallback selectors
- Implement more robust extraction

### Issue: High error rate

**Diagnosis**:
1. Check error types
2. Review rate limiting
3. Check for blocks

**Resolution**:
- Pause and wait
- Reduce concurrency
- Review error classification

## Support

For issues:
- Check logs: `logs/tiktok-shop-acquisition/`
- Review health via API
- Consult architecture documentation
