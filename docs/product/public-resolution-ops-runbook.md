# Public Resolution Operations Runbook

## Overview

This runbook covers operational procedures for the public voucher resolution API and consumer web product.

## Common Issues and Resolution

### A. Public API Failures

#### Issue: High latency

**Symptoms:**
- API response time > 2 seconds
- User complaints about slow resolution

**Diagnosis:**
```bash
# Check latency metrics
curl http://localhost:3000/metrics | grep latency
```

**Resolution:**
1. Check cache hit ratio
2. If low, investigate why
3. Check database query performance
4. Review voucher engine health

**Prevention:**
- Monitor cache hit ratio
- Set up latency alerts

#### Issue: API returning 500 errors

**Symptoms:**
- HTTP 500 responses
- Users see error messages

**Diagnosis:**
```bash
# Check logs
tail -f logs/public-api.log | grep "500"
```

**Resolution:**
1. Check error details in logs
2. Identify root cause
3. Fix or rollback if needed
4. Verify service recovery

**Common causes:**
- Database connection issues
- Voucher engine failures
- Memory exhaustion

#### Issue: Invalid input errors increasing

**Symptoms:**
- High rate of `invalid_input` status

**Diagnosis:**
```bash
# Check validation errors
curl http://localhost:3000/metrics | grep invalid_input
```

**Resolution:**
1. Check if users are confused about input format
2. Improve error messages
3. Add input examples

### B. Cache Issues

#### Issue: Cache not working

**Symptoms:**
- Cache hit ratio = 0
- Every request hits the engine

**Diagnosis:**
```bash
# Check cache stats
curl http://localhost:3000/internal/voucher-cache/stats
```

**Resolution:**
1. Check cache service is running
2. Verify cache size limits
3. Check TTL settings

#### Issue: Stale cache entries

**Symptoms:**
- Users see expired vouchers
- Voucher codes don't work

**Diagnosis:**
```bash
# Check voucher freshness
curl http://localhost:3000/internal/vouchers/freshness
```

**Resolution:**
1. Clear cache for affected products
2. Run freshness update
3. Investigate why vouchers weren't updated

**Cache invalidation:**
```bash
# Invalidate specific product
curl -X POST http://localhost:3000/internal/voucher-cache/invalidate \
  -d '{"productId": "12345"}'

# Invalidate all
curl -X POST http://localhost:3000/internal/voucher-cache/invalidate \
  -d '{"pattern": "*"}'
```

### C. Rate Limit Issues

#### Issue: Users getting rate limited

**Symptoms:**
- Users see rate limit errors
- HTTP 429 responses

**Diagnosis:**
```bash
# Check rate limit stats
curl http://localhost:3000/metrics | grep rate_limit
```

**Resolution:**
1. Verify it's legitimate traffic
2. Check for bot activity
3. Adjust rate limits if needed

**Prevention:**
- Monitor rate limit hits
- Set up alerts for unusual patterns

#### Issue: Rate limit config too aggressive

**Symptoms:**
- Legitimate users blocked

**Resolution:**
1. Review rate limit thresholds
2. Adjust in config
3. Test with staging

### D. Slow Resolution Debugging

#### Issue: Resolution taking too long

**Symptoms:**
- Users wait > 5 seconds
- High latency metrics

**Diagnosis:**
1. Check which step is slow:
   - Input validation
   - Cache lookup
   - Voucher engine call
   - Serialization

2. Check engine health:
```bash
curl http://localhost:3000/internal/voucher-engine/health
```

3. Check database latency

**Resolution:**
- Optimize slow step
- Add caching
- Scale if needed

### E. Consumer Web Issues

#### Issue: Page not loading

**Symptoms:**
- 502/503 errors
- Blank page

**Diagnosis:**
1. Check Next.js server logs
2. Check browser console
3. Verify API connectivity

**Resolution:**
1. Restart Next.js server
2. Check environment variables
3. Verify dependencies

#### Issue: Copy button not working

**Symptoms:**
- Users can't copy codes
- Clipboard API issues

**Diagnosis:**
1. Check browser console
2. Verify HTTPS (required for clipboard)

**Resolution:**
1. Add fallback copy method
2. Show manual copy field

### F. Safe Rollout

#### Deploying changes safely

1. **Staging first**
   - Test in staging environment
   - Verify all flows work
   - Check performance

2. **Canary rollout**
   - Deploy to 10% of traffic
   - Monitor metrics
   - Check error rates

3. **Full rollout**
   - Deploy to 100%
   - Continue monitoring
   - Set up rollback plan

4. **Post-deploy verification**
   - Check key metrics
   - Verify no increase in errors
   - Monitor user feedback

#### Rollback procedure

```bash
# Quick rollback
git revert HEAD
npm run deploy

# Or use deployment tool
./scripts/deploy --rollback
```

## Monitoring

### Key Metrics

| Metric | Alert Threshold | Description |
|--------|----------------|-------------|
| API Latency P99 | > 2s | 99th percentile latency |
| Cache Hit Ratio | < 0.5 | Should be > 0.7 |
| Error Rate | > 1% | Any 5xx errors |
| Rate Limited | > 10% | Users blocked |

### Dashboards

1. **API Health Dashboard**
   - Request count
   - Latency
   - Error rate
   - Cache hit ratio

2. **Conversion Dashboard**
   - Pastes → Resolutions
   - Resolutions → Copies
   - Copies → Shopee opens

3. **System Dashboard**
   - CPU/Memory
   - Database connections
   - Cache size

## Health Checks

### API Health

```bash
# Check API health
curl http://localhost:3000/api/public/v1/resolve/health

# Response
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "v1"
}
```

### Cache Health

```bash
# Check cache stats
curl http://localhost:3000/internal/voucher-cache/health
```

### Engine Health

```bash
# Check voucher engine
curl http://localhost:3000/internal/voucher-engine/health
```

## Emergency Contacts

| Role | Responsibility |
|------|----------------|
| API On-Call | API failures, latency |
| Frontend On-Call | Web issues |
| Backend On-Call | Voucher engine issues |
| Platform On-Call | Infrastructure |

## Quick Reference

### Common Commands

```bash
# Restart API
pm2 restart public-api

# Clear cache
curl -X POST http://localhost:3000/internal/voucher-cache/clear

# Check logs
tail -f logs/public-api.log

# Check metrics
curl http://localhost:3000/metrics

# Health check
curl http://localhost:3000/api/public/v1/resolve/health
```

### Emergency Numbers

- API Emergency: @api-oncall
- Web Emergency: @frontend-oncall
- Voucher Engine: @backend-oncall

## Post-Incident

After any incident:
1. Write incident report
2. Identify root cause
3. Add monitoring/automation to prevent recurrence
4. Update runbook if needed
