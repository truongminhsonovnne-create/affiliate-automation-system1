# TikTok Shop Preview Intelligence Runbook

## Overview

This runbook provides operational guidance for the TikTok Shop Preview Intelligence layer.

## Running Preview Intelligence Cycles

### Daily Operations

```bash
# Run preview intelligence cycle (last 7 days)
npm run tiktok:preview:intelligence

# Run with custom date range
npm run tiktok:preview:intelligence -- 14
```

### Commercial Readiness Review

```bash
# Run commercial readiness review
npm run tiktok:preview:commercial-review

# Run with date range
npm run tiktok:preview:commercial-review -- --from 2024-01-01 --to 2024-01-31
```

### Monetization Governance

```bash
# Check governance status
npm run tiktok:preview:governance status

# Hold monetization
npm run tiktok:preview:governance hold "Quality issues detected"

# Approve stage
npm run tiktok:preview:governance approve limited_monetization_preview

# Rollback
npm run tiktok:preview:governance rollback "Critical blocker found"
```

## Understanding Preview Metrics

### Usefulness Score

| Score | Classification | Action |
|-------|---------------|--------|
| ≥60% | Useful | Continue monitoring |
| 40-59% | Needs Improvement | Address issues |
| <40% | Poor | Hold expansion |

### Stability Score

| Score | Classification | Action |
|-------|---------------|--------|
| ≥70% | Stable | Good for expansion |
| 40-69% | Unstable | Monitor closely |
| <40% | Critical | Hold, investigate |

### Commercial Readiness

| Status | Meaning | Action |
|--------|---------|--------|
| not_ready | Not ready | Continue preview |
| insufficient_evidence | Need more data | Collect signals |
| proceed_cautiously | Can proceed | Enable with monitoring |
| ready_for_preview_monetization | Ready for limited | Enable limited |
| ready_for_production | Ready for full | Prepare production |

## Decision Matrix

### When to HOLD Monetization

Hold immediately if:
- Blockers exist (any count)
- Usefulness < 40%
- Stability < 40%
- Unsupported rate > 50%
- Critical governance issues
- Security concerns

### When to PROCEED CAUTIOUSLY

Proceed if:
- Score 60-79%
- Some warnings exist
- Limited monetization enabled
- Enhanced monitoring active

### When to PROCEED TO PRODUCTION

Proceed if:
- Score ≥80%
- No blockers
- Stable metrics for 30+ days
- Governance approval
- Operations ready

## Reading Reports

### Preview Summary

```
FUNNEL SUMMARY:
  Total Sessions: 1,234
  Surface Views: 10,000
  Input Submissions: 3,500
  Resolution Attempts: 2,800
  Supported: 1,400 (50%)
  Partial: 560 (20%)
  Unavailable: 840 (30%)
```

### Quality Evaluation

```
QUALITY:
  Usefulness Score: 65%
    Clarity: 70%
    Honest Representation: 75%
    Outcome Quality: 55%
    User Actionability: 60%
```

### Decision Support

```
DECISION: proceed_cautiously
  Readiness Score: 68%
  Blocker Count: 0
  Warning Count: 3
  Next Steps:
    - Enable limited monetization
    - Monitor closely
    - Address warnings
    - Plan production transition
```

## Troubleshooting

### Issue: Low Usefulness Score

**Diagnosis:**
1. Check clarity score - is preview confusing?
2. Check honest representation - users misled?
3. Check outcome quality - results not useful?
4. Check actionability - users can't act?

**Resolution:**
- Improve UI clarity
- Fix support state disclosure
- Enhance data quality
- Add copy/open capabilities

### Issue: Low Stability Score

**Diagnosis:**
1. Check support state consistency
2. Check outcome consistency
3. Check error rate
4. Check drift indicators

**Resolution:**
- Stabilize support states
- Improve pipeline consistency
- Fix error causes
- Monitor for changes

### Issue: Blockers Detected

**Diagnosis:**
1. Review blocker details
2. Check severity
3. Identify root cause

**Resolution:**
- Address critical blockers first
- Assign owners
- Set due dates
- Track to resolution

### Issue: Monetization Hold Refused

**Diagnosis:**
1. Review hold reason
2. Check if addressed
3. Verify metrics improved

**Resolution:**
- Document resolution
- Request re-evaluation
- Get approval for proceed

## API Reference

### Preview Summary

```bash
GET /internal/platforms/tiktok-shop/preview/summary
```

### Quality Review

```bash
GET /internal/platforms/tiktok-shop/preview/quality
```

### Commercial Readiness

```bash
GET /internal/platforms/tiktok-shop/commercial-readiness
```

### Governance Status

```bash
GET /internal/platforms/tiktok-shop/monetization/governance
```

### Decision Support

```bash
GET /internal/platforms/tiktok-shop/monetization/decision-support
```

## Backlog Management

### Viewing Backlog

```bash
GET /internal/platforms/tiktok-shop/preview/backlog
```

### Backlog Priorities

1. **Critical**: Data gaps, quality issues
2. **High**: Context gaps, lineage gaps
3. **Medium**: Stability issues, ops gaps
4. **Low**: Improvements, nice-to-haves

### Managing Backlog

- Review weekly
- Assign owners
- Set due dates
- Track to completion
- Close resolved items

## Support

For issues:
- Check logs: `logs/tiktok-shop-preview/`
- Review metrics via API
- Consult architecture documentation
- Contact platform team
