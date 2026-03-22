# Voucher Matching Quality Runbook

## Overview

This runbook provides operational guidance for managing the voucher data ingestion system, handling common issues, and maintaining matching quality.

## Common Issues and Resolution

### A. Ingestion Failures

#### Issue: Source connection timeout

**Symptoms:**
- Ingestion run fails with timeout error
- `items_seen` is 0

**Resolution:**
```bash
# Check source health
curl http://localhost:3000/internal/vouchers/sources

# Retry with increased timeout
npm run voucher:ingest -- --source-id <uuid> --since 2024-01-01
```

**Prevention:**
- Monitor source health endpoints
- Set up alerts for ingestion failures

#### Issue: Validation failures

**Symptoms:**
- Ingestion completes but `items_failed` > 0
- Error summary shows validation errors

**Resolution:**
1. Check error summary:
```bash
curl http://localhost:3000/internal/vouchers/ingestion-runs | jq '.data[] | select(.run_status == "completed_with_errors")'
```

2. Fix source data format
3. Re-run ingestion

**Prevention:**
- Use validation webhooks before ingestion
- Implement data quality checks at source

#### Issue: Partial ingestion (some items failed)

**Symptoms:**
- `run_status` = "completed_with_errors"
- Some items inserted, some failed

**Resolution:**
1. Review error summary for patterns
2. Fix source data issues
3. Re-run with `--since` to pick up failed items:
```bash
npm run voucher:ingest -- --source-id <uuid> --since 2024-01-01
```

### B. Stale Catalog

#### Issue: Vouchers marked as stale

**Symptoms:**
- Freshness status shows "stale"
- Users see expired vouchers

**Resolution:**
1. Run freshness evaluation:
```typescript
import { refreshAllVoucherFreshness } from './voucherData/catalog/voucherFreshnessService';

const result = await refreshAllVoucherFreshness();
console.log(result);
```

2. Deactivate expired vouchers:
```typescript
import { deactivateExpiredVouchers } from './voucherData/service/voucherCatalogService';

const count = await deactivateExpiredVouchers();
```

3. Trigger fresh ingestion

**Prevention:**
- Schedule regular freshness checks via cron
- Set up alerts for stale voucher threshold

#### Automated freshness check cron:
```bash
# Add to crontab
0 */6 * * * cd /app && npm run voucher:freshness
```

### C. Bad Rules

#### Issue: Rule validation failure

**Symptoms:**
- Cannot activate rule
- Validation errors shown

**Resolution:**
1. Get validation errors:
```bash
curl http://localhost:3000/internal/vouchers/rules/<rule-id>
```

2. Fix rule payload according to errors
3. Update rule:
```bash
curl -X PATCH http://localhost:3000/internal/vouchers/rules/<rule-id> \
  -H "Content-Type: application/json" \
  -d '{"rulePayload": {...}}'
```

4. Re-validate and activate

#### Issue: Rule conflicts

**Symptoms:**
- Multiple active rules for same voucher
- Unexpected matching behavior

**Resolution:**
1. List active rules:
```bash
curl http://localhost:3000/internal/vouchers/rules?ruleStatus=active
```

2. Identify conflicting rules
3. Archive older rule:
```bash
curl -X POST http://localhost:3000/internal/vouchers/rules/<rule-id>/archive
```

4. Activate corrected rule

**Prevention:**
- Use rule validation to catch conflicts early
- Review rule changes before activation

### D. Ranking Quality Drop

#### Issue: Quality score decreased

**Symptoms:**
- `averageQualityScore` below threshold
- More complaints about wrong vouchers

**Resolution:**
1. Run quality evaluation:
```bash
npm run voucher:evaluate -- --platform shopee
```

2. Review identified weaknesses:
```
=== Weaknesses Detected ===
[Low Recall]
  Description: More than 30% of evaluations have low recall
  Recommendation: Expand voucher matching logic
```

3. Address specific issues:
   - **Low Recall**: Expand eligibility criteria
   - **Low Precision**: Tighten eligibility criteria
   - **Poor Ranking**: Adjust ranking weights

4. Create new rule version with fixes
5. Activate new rule

#### Issue: False positives increased

**Symptoms:**
- Users see irrelevant vouchers
- `falsePositiveHints` > 0 in evaluations

**Resolution:**
1. Review false positive patterns:
```bash
curl http://localhost:3000/internal/vouchers/quality | jq '.commonIssues'
```

2. Identify problematic conditions
3. Add exclusion rules or tighten constraints

#### Issue: False negatives increased

**Symptoms:**
- Users not seeing relevant vouchers
- `falseNegativeHints` > 0 in evaluations

**Resolution:**
1. Review missing voucher patterns
2. Relax eligibility criteria
3. Add more matching conditions

### E. Evaluation Workflow

#### Running manual evaluation

**Scenario:** You want to test matching quality for a specific product

1. Make a matching request:
```bash
curl -X POST http://localhost:3000/internal/vouchers/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "shopee",
    "requestInput": {
      "productId": "12345",
      "productTitle": "iPhone 15 Pro",
      "productCategory": "electronics",
      "productPrice": 999
    },
    "expectedVoucherIds": ["uuid1", "uuid2"],
    "resolvedVoucherIds": ["uuid1", "uuid3"],
    "bestVoucherId": "uuid1"
  }'
```

2. Review quality metrics in response

3. If quality is poor, investigate:
   - Check rule configuration
   - Review voucher eligibility
   - Analyze ranking scores

#### Bulk evaluation

**Scenario:** You want to evaluate matching quality on a sample set

1. Export test cases (expected + resolved pairs)
2. Run batch evaluation:
```typescript
import { evaluateVoucherResolutionBatch } from './voucherData/evaluation/voucherMatchingEvaluator';

const inputs = testCases.map(tc => ({
  platform: 'shopee' as const,
  requestInput: tc.request,
  expectedVoucherIds: tc.expected,
}));

const resolutions = testCases.map(tc => ({
  resolvedVoucherIds: tc.resolved,
  bestVoucherId: tc.resolved[0],
}));

const results = await evaluateVoucherResolutionBatch(inputs,
  (input) => Promise.resolve(resolutions[inputs.indexOf(input)])
);
```

3. Review aggregate quality report

### F. Safe Rollback of Rule Changes

#### Scenario: New rule causes quality drop

**Detection:**
- Quality score drops below threshold
- User complaints increase

**Rollback Steps:**

1. Identify the problematic rule:
```bash
curl http://localhost:3000/internal/vouchers/rules?voucherId=<voucher-id>&ruleStatus=active
```

2. Get previous active rule (archived):
```bash
curl http://localhost:3000/internal/vouchers/rules?voucherId=<voucher-id>&ruleStatus=archived
```

3. Reactivate previous rule:
```bash
curl -X POST http://localhost:3000/internal/vouchers/rules/<old-rule-id>/activate
```

4. Verify quality improvement:
```bash
npm run voucher:evaluate -- --platform shopee
```

**Prevention:**
- Always test rules in draft mode first
- Monitor quality metrics after rule changes
- Keep previous rule archived for quick rollback

## Monitoring

### Key Dashboards

1. **Ingestion Health**
   - Items seen/inserted/updated/failed
   - Run success rate
   - Last sync time per source

2. **Catalog Health**
   - Total active vouchers
   - Fresh vs stale vs expired
   - Quality score distribution

3. **Matching Quality**
   - Average quality score
   - Top-K recall/precision
   - Ranking consistency

### Alerts

Set up alerts for:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Ingestion failures | > 5% | Investigate source |
| Stale vouchers | > 20% of catalog | Run freshness refresh |
| Quality score | < 0.6 | Review rules |
| False positives | > 25% evaluations | Adjust eligibility |

### Health Checks

```bash
# Check ingestion run status
curl http://localhost:3000/internal/vouchers/ingestion-runs?limit=5

# Check source health
curl http://localhost:3000/internal/vouchers/sources

# Check quality summary
curl http://localhost:3000/internal/vouchers/quality
```

## Recovery Procedures

### Complete Ingestion Failure

**Situation:** All ingestion runs failing

**Recovery:**
1. Check database connectivity:
```bash
psql $DATABASE_URL -c "SELECT 1"
```

2. Check source configurations:
```bash
curl http://localhost:3000/internal/vouchers/sources
```

3. Attempt manual ingestion with verbose logging:
```bash
npm run voucher:ingest -- --source-id <uuid> --all 2>&1 | tee ingestion.log
```

4. If still failing, check logs:
```bash
tail -f logs/voucher-*.log
```

### Catalog Corruption

**Situation:** Voucher data appears corrupted

**Recovery:**
1. Stop all ingestion jobs
2. Identify corrupted records:
```sql
SELECT * FROM voucher_catalog
WHERE code IS NULL
   OR discount_value < 0
   OR end_date < start_date;
```

3. Remove or fix corrupted records
4. Re-run full ingestion from last good backup

### Quality Metrics Gap

**Situation:** No evaluation data

**Recovery:**
1. Ensure matching engine records evaluations:
   - Check that `recordVoucherEvaluationCompleted` is called
2. Run manual evaluations:
```bash
npm run voucher:evaluate -- --limit 1000
```
3. Verify data is being recorded:
```bash
curl http://localhost:3000/internal/vouchers/evaluations | jq '.total'
```

## Emergency Contacts

| Role | Responsibility |
|------|-----------------|
| Voucher Ops | Ingestion issues, rule changes |
| Backend Lead | System outages, database issues |
| Data Engineer | Quality metrics, analytics |

## Quick Reference

### Common Commands

```bash
# Run ingestion
npm run voucher:ingest -- --all

# Check quality
npm run voucher:evaluate -- --platform shopee

# Refresh freshness
npm run voucher:freshness

# List sources
curl http://localhost:3000/internal/vouchers/sources

# Get quality report
curl http://localhost:3000/internal/vouchers/quality
```

### API Quick Reference

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List vouchers | /internal/vouchers/catalog | GET |
| Trigger ingestion | /internal/vouchers/catalog/ingest | POST |
| Create rule | /internal/vouchers/rules | POST |
| Activate rule | /internal/vouchers/rules/:id/activate | POST |
| Evaluate | /internal/vouchers/evaluate | POST |
| Get quality | /internal/vouchers/quality | GET |

### Environment Variables

| Variable | Description |
|----------|-------------|
| SUPABASE_URL | Database URL |
| SUPABASE_SERVICE_KEY | Service key |
| VOUCHER_BATCH_SIZE | Default batch size (100) |
| FRESHNESS_CHECK_INTERVAL | Freshness check interval (30min) |
