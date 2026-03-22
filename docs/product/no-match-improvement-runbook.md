# No-Match Improvement Runbook

## Overview

This runbook covers operational procedures for handling no-match cases in the voucher intelligence system.

## No-Match Categories

### Category 1: No-Match Spike

**Symptoms:**
- Sudden increase in no-match rate (>15%)
- Specific URL patterns showing high no-match rates
- User complaints about not finding vouchers

**Investigation Steps:**

1. Check time window
```bash
npm run voucher:intelligence:analyze -- --hours 24 --verbose
```

2. Identify affected patterns
```bash
# Look for patterns with high no-match rates
```

3. Check for recent changes:
- New voucher catalog updates?
- Parser changes?
- URL format changes from Shopee?
- Product catalog changes?

**Resolution:**

| Cause | Action |
|-------|--------|
| Parser issue | Fix parser, re-parse affected URLs |
| Coverage gap | Add vouchers to catalog |
| Rule too strict | Review and relax rules |
| Shopee changed | Update parser |

### Category 2: Bad Ranking Suspicion

**Symptoms:**
- Users not selecting "best" voucher
- High divergence between best and selected
- Low copy success rate

**Investigation Steps:**

1. Check aggregate data
```bash
npm run voucher:intelligence:analyze -- --days 7
```

2. Look for patterns:
- Are candidates outperforming best?
- Is discount calculation wrong?
- Are terms being interpreted correctly?

3. Review recent ranking changes
```bash
# Check ranking snapshots
```

**Resolution:**

| Issue | Action |
|-------|--------|
| Wrong discount | Fix discount calculation |
| Bad candidate ranking | Adjust weights |
| Confusing UI | Improve presentation |

### Category 3: Best Voucher Underperformance

**Symptoms:**
- Best voucher selected <20% of time
- Candidates selected more often than best
- High divergence scores

**Investigation Steps:**

1. Identify affected vouchers
```bash
# Get list of underperforming best vouchers
```

2. Analyze why:
- Is discount correct?
- Are terms accurate?
- Is ranking order confusing?

3. Check user feedback

**Resolution:**

| Root Cause | Action |
|-----------|--------|
| Wrong ranking | Adjust scoring weights |
| Bad data | Fix voucher data |
| Confusing UI | Improve display |

### Category 4: Candidate Outperforming Best

**Symptoms:**
- Users consistently choose candidate over best
- Best voucher not actually best value

**Investigation Steps:**

1. Compare actual savings
2. Check if best has hidden conditions
3. Verify discount calculations

**Resolution:**

| Issue | Fix |
|-------|-----|
| Wrong "best" calculation | Fix algorithm |
| Hidden conditions | Update data |
| User preference | Consider signals |

### Category 5: Catalog/Rule Coverage Gaps

**Symptoms:**
- Large category with no vouchers
- Specific URL patterns never match
- Consistent no-match for product types

**Investigation Steps:**

1. Identify gaps
```bash
# Analyze no-match URL patterns
```

2. Prioritize by:
- Frequency
- Product value
- User demand

3. Source new vouchers

**Resolution:**

| Gap Type | Action |
|----------|--------|
| New category | Source vouchers |
| Parser weakness | Improve parser |
| Coverage hole | Prioritize acquisition |

### Category 6: Insight Review Workflow

**Symptoms:**
- New insights generated
- Need to decide on actions

**Workflow:**

1. Review insights list
```bash
# Get open insights
```

2. Prioritize by:
- Severity
- Impact
- Effort to fix

3. For each insight:
   - Verify data
   - Determine root cause
   - Decide action (fix/accept/wontfix)

4. Update insight status
```bash
# Mark as resolved or dismissed
```

5. Track actions taken

## Escalation Procedures

### When to Escalate

| Condition | Escalate To |
|-----------|-------------|
| No-match rate >30% | Engineering Lead |
| Data quality issue | Data Team |
| Parser broken | Backend Team |
| Security concern | Security Team |

### Escalation Template

```
## No-Match Escalation

### Summary
[One-line description]

### Details
- Time window: [when it started]
- Affected: [what's affected]
- Rate: [current vs normal]

### Investigation
[What you've tried]

### Next Steps
[What you need]
```

## Monitoring

### Key Metrics

| Metric | Normal Range | Alert Threshold |
|--------|-------------|----------------|
| No-match rate | <10% | >15% |
| Fallback click rate | <50% | >70% |
| Copy success rate | >80% | <60% |

### Dashboards

- Daily no-match rate
- Top no-match patterns
- Insight backlog

### Alerts

Set up alerts for:
- No-match rate spike
- Copy success rate drop
- New critical insights

## Quick Reference

### Common Commands

```bash
# Run 24h analysis
npm run voucher:intelligence:analyze -- --hours 24

# Run 7-day analysis
npm run voucher:intelligence:analyze -- --days 7

# Get open insights
curl /internal/voucher-intelligence/insights?status=open

# Get no-match analysis
curl /internal/voucher-intelligence/no-match-analysis
```

### Common Patterns

**Pattern 1: Parser failure**
- URL extracted but no product info
- Fix: Update parser selectors

**Pattern 2: Coverage gap**
- URL valid but no matching vouchers
- Fix: Add vouchers to catalog

**Pattern 3: Rule too strict**
- Vouchers exist but don't match
- Fix: Review matching rules

**Pattern 4: Data quality**
- Voucher data wrong
- Fix: Update voucher data

## Prevention

### Proactive Measures

1. **Regular analysis** - Run weekly analysis
2. **Catalog monitoring** - Track coverage gaps
3. **Parser testing** - Test with sample URLs
4. **User feedback** - Monitor complaints

### Early Warning Signs

- Gradual no-match increase
- New URL patterns from Shopee
- Voucher expiration clusters
- Parser error increases

## Recovery

### After Fix

1. Verify fix works
2. Monitor metrics for 48h
3. Update documentation
4. Close incident

### Rollback

If fix causes regression:
1. Revert change
2. Restore snapshot
3. Investigate cause
4. Try again with different approach
