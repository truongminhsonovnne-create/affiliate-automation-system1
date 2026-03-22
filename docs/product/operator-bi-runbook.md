# Operator BI Runbook

## Overview

This runbook provides operational guidance for using the Business Intelligence layer as an operator. It covers:

- How to read executive scorecards
- How to use operator BI views
- How to use decision support
- When to take action

## Daily Operations

### Morning Check (15 minutes)

**Who**: Operations team
**When**: Start of each day

1. **Check Executive Scorecards**
   - Run: `npm run bi:scorecards`
   - Review overall health status
   - Identify any critical issues

2. **Check Active Alerts**
   - Run: `npm run bi:alerts`
   - Review new alerts from past 24 hours
   - Triage by severity

3. **Check Decision Queue**
   - Run: `npm run bi:decisions`
   - Review pending recommendations
   - Take action on high-priority items

## Understanding Scorecards

### Reading a Scorecard

Each scorecard has:

1. **Headline**: Overall score (0-1), status (healthy/warning/critical), trend
2. **Metrics**: Key performance indicators
3. **Risks**: Identified issues
4. **Decision Hints**: Recommended actions

### Scorecard Statuses

| Status | Score | Meaning | Action |
|--------|-------|---------|--------|
| Healthy | 0.8-1.0 | Everything good | Continue monitoring |
| Warning | 0.6-0.79 | Some issues | Investigate |
| Critical | <0.6 | Major problems | Immediate action |

### Example: Growth Scorecard

```
=== Growth Scorecard ===
Score: 0.78 (WARNING)
Trend: STABLE

Metrics:
- Sessions: 15,234 (up 5%)
- Submit Rate: 8.2% (up 2%)
- Surface Count: 5
- Traffic Quality: 0.72

Risks:
- [MEDIUM] Submit rate declining on social surfaces

Hints:
- Monitor paid social performance
- Review SEO article performance
```

## Using Operator BI Views

### Growth Ops View

Access: `/internal/bi/operator/growth_ops`

**Purpose**: Monitor growth surfaces and traffic

**Key Metrics**:
- Sessions by surface
- Submit rates by surface
- Traffic quality trends

**When to Act**:
- Any surface with submit rate < 3%
- Sessions drop > 20% day-over-day
- New surface added

### Product Ops View

Access: `/internal/bi/operator/product_ops`

**Purpose**: Monitor product health and remediation

**Key Metrics**:
- Remediation backlog
- Resolution times
- Critical issues

**When to Act**:
- Backlog grows > 20%
- Resolution time > 48 hours
- Critical issues appear

### Commercial Ops View

Access: `/internal/bi/operator/commercial_ops`

**Purpose**: Monitor commercial performance

**Key Metrics**:
- Revenue
- Commission
- Conversions
- Revenue per session

**When to Act**:
- Revenue drops > 15%
- Conversion rate changes significantly

### Release Ops View

Access: `/internal/bi/operator/release_ops`

**Purpose**: Monitor release readiness

**Key Metrics**:
- Readiness score
- Active blockers
- Active anomalies

**When to Act**:
- Readiness < 0.7
- Blockers > 2
- Anomalies spike

### Quality Ops View

Access: `/internal/bi/operator/quality_ops`

**Purpose**: Monitor quality metrics

**Key Metrics**:
- No-match rate
- Copy rate
- Open rate

**When to Act**:
- No-match > 30%
- Copy rate < 20%
- Open rate < 30%

## Using Decision Support

### Decision Types

Decision support provides recommendations in these categories:

1. **Growth**: Scale, hold, pause, deindex surfaces
2. **Commercial**: Invest, maintain, reduce, exit
3. **Release**: Block, conditional, approve
4. **Quality**: Improve, investigate, fix
5. **Experiment**: Promote, rollback, hold

### Understanding Recommendations

Each recommendation includes:

1. **Recommendation**: What to do
2. **Priority**: Critical, high, medium, low
3. **Confidence**: How sure we are (0-100%)
4. **Evidence**: Supporting metrics
5. **Tradeoffs**: What's being sacrificed
6. **Steps**: How to execute

### Example Recommendation

```
=== Recommendation ===
Area: growth_surface_scale
Recommendation: SCALE
Priority: HIGH
Confidence: 85%

Evidence:
- sessions: 15000 (threshold: 10000) ✓
- submit_rate: 0.12 (threshold: 0.10) ✓

Tradeoffs:
- [NEGATIVE] Higher infrastructure costs
- [POSITIVE] More users served

Action Steps:
1. Review capacity planning
2. Scale infrastructure
3. Monitor performance after scaling
```

### Taking Action on Decisions

| Priority | Response Time | Action |
|----------|---------------|--------|
| Critical | 1 hour | Execute immediately |
| High | 4 hours | Plan and execute today |
| Medium | 24 hours | Plan for tomorrow |
| Low | 72 hours | Add to backlog |

## Common Scenarios

### Scenario 1: No-Match Rate Spike

**Signal**: Quality scorecard shows no-match > 30%

**Investigation**:
1. Check operator quality view
2. Identify affected voucher types
3. Review recent changes

**Action**:
- If algorithm change → rollback
- If data stale → refresh
- If new edge case → fix matching

### Scenario 2: Revenue Drop

**Signal**: Commercial scorecard shows revenue down > 15%

**Investigation**:
1. Check attribution reports
2. Compare by surface
3. Check conversion rates

**Action**:
- If attribution issue → fix tracking
- If surface issue → investigate surface
- If conversion issue → review UX

### Scenario 3: Surface Underperformance

**Signal**: Growth surface has submit rate < 3%

**Investigation**:
1. Check surface details
2. Review traffic sources
3. Check quality metrics

**Action**:
- If quality issue → pause surface
- If targeting issue → fix
- If content issue → improve

### Scenario 4: Release Blockers

**Signal**: Release score shows blockers > 2

**Investigation**:
1. List active blockers
2. Assess severity
3. Assign owners

**Action**:
- Critical → Block release
- High → Conditional release
- Medium → Document and proceed

## Alert Response

### Alert Types

1. **Threshold Breach**: Metric crossed a threshold
2. **Trend Reversal**: Trend changed direction
3. **Anomaly**: Unusual pattern detected
4. **Stale Data**: Data not updating

### Alert Response Guide

| Severity | Response | Escalation |
|----------|----------|-------------|
| Critical | Immediate action | 1 hour |
| Warning | Investigate today | 4 hours |
| Info | Review this week | None |

## KPI Lineage

### Why Lineage Matters

Every KPI should be traceable to its source. This helps:
- Debug issues
- Understand assumptions
- Validate calculations

### How to Check Lineage

Access metric definition: `/internal/bi/metrics/:metricKey`

Example:
```
Metric: quality.no_match_rate
Definition: Percentage of resolutions with no voucher
Lineage:
  - Source: funnel_events
  - Calculation: no_match / total_resolution
  - Dependencies: voucher_engine
```

## Troubleshooting

### Problem: Scorecard Shows Stale Data

**Solution**:
1. Check data pipeline status
2. Verify database connectivity
3. Run scorecard rebuild: `npm run bi:scorecards`

### Problem: Decision Seems Wrong

**Solution**:
1. Review evidence
2. Check assumptions
3. Consider context not captured
4. Override with justification

### Problem: Metrics Don't Match

**Solution**:
1. Check lineage
2. Verify calculation method
3. Compare time windows
4. Check for data gaps

## Tools & References

### Scripts

```bash
# Build scorecards
npm run bi:scorecards

# Build decision support
npm run bi:decisions

# Check alerts
npm run bi:alerts

# Generate report
npm run bi:report
```

### API Endpoints

- `/internal/bi/executive/scorecards` - Get all scorecards
- `/internal/bi/operator/:surface` - Get operator view
- `/internal/bi/decision-support` - Get recommendations
- `/internal/bi/metrics/:key` - Get metric definition

### Dashboards

- Executive Dashboard: `admin/dashboards/executive`
- Growth Dashboard: `admin/dashboards/growth`
- Quality Dashboard: `admin/dashboards/quality`

## Escalation

### When to Escalate

Escalate when:
1. Critical scorecard status persists > 4 hours
2. Decision recommendation seems wrong
3. Data quality issues
4. Need additional context

### Escalation Path

1. **Team Lead**: Operational issues
2. **Product Manager**: Product decisions
3. **Engineering Manager**: Technical issues
4. **VP Product**: Strategic decisions

### Escalation Template

```
## Issue
[One sentence description]

## Context
[What you observed]
[What you tried]
[What you need]

## Impact
[Business impact]

## Timeline
[When this needs resolution]
```

## Quick Reference

### Scorecard Health

| Score | Status | Action |
|-------|---------|--------|
| 0.8+ | Healthy | Monitor |
| 0.6-0.79 | Warning | Investigate |
| <0.6 | Critical | Act now |

### Key Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| No-match rate | 30% | 50% |
| Submit rate | 3% | 1% |
| Readiness | 0.7 | 0.5 |
| Blockers | 2 | 5 |

### Decision Priorities

| Priority | Response | Review |
|----------|----------|--------|
| Critical | 1 hour | Daily |
| High | 4 hours | Daily |
| Medium | 24 hours | Weekly |
| Low | 72 hours | Weekly |

---

*Last Updated: 2026-03-17*
*Review Frequency: Monthly*
*Owner: BI & Operations Team*
