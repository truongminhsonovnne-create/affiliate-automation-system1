# Commercial Governance Runbook

## Overview

This runbook provides operational guidance for commercial governance in the Affiliate Automation System. It covers:

- How to interpret commercial metrics
- When to trigger reviews
- How to handle anomalies
- How commercial signals feed into product governance

## Quick Reference

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| No-match rate | > 30% | > 50% | Investigate → Block |
| Balance score | < 0.7 | < 0.5 | Review → Reject |
| Revenue drop | -20% | -30% | Review → Rollback |
| Quality drop | -15% | -25% | Review → Rollback |
| Low-value surfaces | > 3 | > 5 | Reduce → Remove |

### Severity Response Times

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| Critical | 1 hour | P0 - Immediate |
| High | 4 hours | P1 - Same day |
| Medium | 24 hours | P2 - Next day |
| Low | 72 hours | P3 - This week |

## Daily Operations

### 1. Morning Metric Review

**Who**: Operations team
**When**: Start of each day
**Duration**: 15 minutes

Check the commercial dashboard for:

1. **Overall Revenue**: Compare to 7-day average
2. **No-match Rate**: Should be < 30%
3. **Funnel Rates**:
   - Submit rate: > 5%
   - Resolution success rate: > 70%
   - Copy rate: > 30%
   - Open rate: > 40%
4. **Anomalies**: Any new critical/warning signals?

**If issues found**: Open incident ticket, escalate to product team

### 2. Anomaly Triage

**Who**: On-call engineer
**When**: As alerts arrive
**Duration**: 30 minutes per anomaly

#### Triage Process

1. **Identify the anomaly type** (from signal_type)
2. **Check affected entity** (voucher, surface, experiment)
3. **Review recent changes** (deployments, config changes)
4. **Determine severity** (critical/warning/info)
5. **Take action** (see anomaly-specific guidance)

### 3. Governance Review Processing

**Who**: Product team
**When**: Weekly
**Duration**: 1 hour

Review pending governance reviews:

1. Check new reviews since last week
2. Evaluate business vs usefulness tradeoffs
3. Make approve/reject/investigate decisions
4. Document rationale
5. Track items needing engineering work

## Anomaly Response Guide

### Revenue Usefulness Divergence

**Signal**: `revenue_usefulness_divergence`
**Pattern**: Revenue up, quality down

#### Investigation Steps

1. Check no-match rate trend
2. Compare voucher ranking changes
3. Review recent algorithm changes
4. Check for new high-commission low-quality vouchers

#### Resolution Options

| Scenario | Action |
|----------|--------|
| Algorithm change caused it | Roll back or fix |
| New vouchers introduced | Remove low-quality |
| Surface quality degraded | Investigate surface |
| Normal variation | Monitor |

### No-Match Spike

**Signal**: `no_match_spike`
**Pattern**: No-match rate > 40%

#### Investigation Steps

1. Check which vouchers are failing
2. Review resolution algorithm logs
3. Check for changed product data
4. Verify crawler still working

#### Resolution Options

| Scenario | Action |
|----------|--------|
| Voucher data stale | Refresh catalog |
| Algorithm regression | Roll back |
| New edge cases | Fix algorithm |
| Normal variation | Monitor |

### Low-Value Surface

**Signal**: `low_value_surface`
**Pattern**: Surface has high traffic, low conversion

#### Investigation Steps

1. Check surface type (SEO, paid, social)
2. Review traffic quality indicators
3. Compare to historical performance
4. Check for bot traffic

#### Resolution Options

| Scenario | Action |
|----------|--------|
| SEO content issue | Fix content |
| Paid targeting issue | Adjust targeting |
| Bot traffic | Block traffic |
| Natural decline | Deprioritize |

### Voucher Underperformance

**Signal**: `voucher_underperformance`
**Pattern**: High clicks, low conversion

#### Investigation Steps

1. Check voucher relevance to queries
2. Review commission rate
3. Check expiration status
4. Verify voucher still valid

#### Resolution Options

| Scenario | Action |
|----------|--------|
| Expired voucher | Remove |
| Low commission | Replace |
| Not relevant | Deprioritize |
| Edge case | Improve matching |

### Experiment Regression

**Signal**: `experiment_regression`
**Pattern**: Experiment caused quality drop

#### Investigation Steps

1. Identify experiment variant
2. Check which metrics affected
3. Review experiment design
4. Calculate statistical significance

#### Resolution Options

| Scenario | Action |
|----------|--------|
| Significant negative impact | Roll back |
| Insufficient data | Continue experiment |
| Mixed results | Review manually |

## Surface Governance

### Surface Health Scoring

Each surface gets scored on:

1. **Traffic volume**: Sessions generated
2. **Conversion quality**: Resolution success rate
3. **Engagement**: Copy and open rates
4. **Revenue**: Commission generated
5. **Quality contribution**: Impact on overall quality

### Surface Actions

| Score Range | Classification | Action |
|-------------|----------------|--------|
| 0.8-1.0 | Excellent | Scale investment |
| 0.6-0.8 | Healthy | Maintain |
| 0.4-0.6 | Below average | Investigate |
| 0.2-0.4 | Poor | Reduce |
| 0.0-0.2 | Critical | Remove |

### Surface Review Cadence

| Surface Type | Review Frequency |
|--------------|------------------|
| SEO (owned) | Monthly |
| Paid | Weekly |
| Social | Weekly |
| Email | Per campaign |
| Referral | Monthly |

## Voucher Governance

### Voucher Health Indicators

1. **Resolution rate**: % of queries returning this voucher
2. **Copy rate**: % copying the voucher
3. **Open rate**: % opening Shopee
4. **Revenue**: Commission generated
5. **Quality score**: Relevance rating

### Voucher Actions

| Indicator | Threshold | Action |
|-----------|-----------|--------|
| No-match rate | > 70% | Remove |
| Copy rate | < 10% | Deprioritize |
| Open rate | < 20% | Review relevance |
| Revenue/click | < $0.001 | Replace |

### Voucher Review Process

1. Weekly extraction of bottom 10% vouchers
2. Manual review of quality metrics
3. Decision: Keep / Improve / Remove
4. Track removal impact

## Experiment Commercial Review

### Pre-Experiment Checklist

Before launching an experiment:

- [ ] Define success metrics (revenue + quality)
- [ ] Set guardrail thresholds
- [ ] Define minimum sample size
- [ ] Plan analysis timeline

### Experiment Guardrails

| Guardrail | Threshold | Action |
|-----------|-----------|--------|
| Revenue vs control | > -20% | Continue |
| Quality vs control | > -15% | Continue |
| No-match vs control | < +20% | Continue |

### Experiment Evaluation

When experiment reaches minimum sample (100 sessions):

1. Calculate revenue delta
2. Calculate quality delta
3. Check statistical significance
4. Make decision:

| Revenue | Quality | Statistical | Decision |
|---------|---------|-------------|----------|
| ↑ | ↑ | Yes | Approve |
| ↑ | ↓ | Yes | Review |
| ↓ | ↑ | Yes | Review |
| ↓ | ↓ | Yes | Reject |
| Any | Any | No | Continue |

## Release Readiness

### Pre-Release Commercial Check

Before any release:

1. **Run attribution cycle** on staging data
2. **Verify quality metrics** unchanged
3. **Check for new anomalies**
4. **Review any pending governance items**

### Release Blocking Criteria

Release should be blocked if:

- [ ] Any critical anomaly in last 7 days
- [ ] Revenue-quality balance < 0.5
- [ ] Any unresolved governance rejection
- [ ] No-match rate > 50%

### Release Approval Process

1. Engineering completes changes
2. QA validates functionality
3. Commercial review: Run attribution cycle
4. Product review: Check metrics
5. If all pass: Approve release
6. If issues found: Triage and fix

## Reporting

### Daily Report (Automated)

Generated each morning:

- Revenue (last 24h vs 7d avg)
- No-match rate (last 24h vs 7d avg)
- Funnel rates
- New anomalies
- Pending reviews

### Weekly Report

Generated each Monday:

- Week-over-week trends
- Surface performance ranking
- Voucher performance ranking
- Experiment results
- Governance review summary

### Monthly Report

Generated first week of month:

- Month-over-month trends
- Revenue attribution summary
- Quality score trends
- Surface investment recommendations
- Governance metrics

## Escalation

### When to Escalate

Escalate immediately if:

1. Revenue drops > 30% suddenly
2. No-match rate hits > 60%
3. Critical anomaly not resolved in 24h
4. Multiple surfaces turning critical

### Escalation Path

1. **Engineering On-call** → For technical issues
2. **Product Lead** → For product decisions
3. **Engineering Manager** → For resource needs
4. **VP Product** → For strategic decisions

### Escalation Template

When escalating, include:

```
## Issue Summary
[One sentence description]

## Metrics Impact
- Revenue: [current] vs [expected]
- Quality: [current] vs [expected]
- No-match: [current] vs [expected]

## Investigation
[What you've checked so far]

## Required Action
[What you need from escalator]

## Timeline
[When this needs to be resolved]
```

## Tools & References

### Dashboards

- Commercial Summary: `/internal/commercial/summary`
- Attribution: `/internal/commercial/attribution/revenue`
- Anomalies: `/internal/commercial/anomalies`
- Governance: `/internal/commercial/governance/reviews`

### Scripts

- Run attribution: `npm run commercial:attribution`
- Run governance: `npm run commercial:governance`
- Detect anomalies: `npm run commercial:anomalies`

### Documentation

- Architecture: `docs/product/commercial-intelligence-architecture.md`
- Attribution Principles: `docs/product/affiliate-revenue-attribution-principles.md`

## Contact

- **Commercial Intelligence Team**: #commercial-intelligence
- **On-call**: Check PagerDuty rotation
- **Product Lead**: [Name]
- **Engineering Lead**: [Name]

---

*Last Updated: 2026-03-17*
*Review Frequency: Monthly*
*Owner: Commercial Intelligence Team*
