# Strategic Decision Support Principles

## Core Philosophy

> **BI must serve decision-making, not vanity. Every metric should help make a better decision.**

This document establishes principles for strategic decision support in the Affiliate Automation System.

## Foundational Principles

### 1. No Vanity Metrics

We measure what matters, not what's easy to count.

#### What Matters
- Revenue that can be attributed
- Users who find value
- Quality that drives retention
- Growth that's sustainable

#### What Doesn't Matter Alone
- Page views without engagement
- Clicks without conversion
- Sessions without action
- "Potential" anything

### 2. Revenue Doesn't Exist Without Quality

Revenue and quality are not separate concerns—they're the same concern.

#### The Truth
- High revenue + low quality = short-term gains, long-term losses
- Low revenue + high quality = sustainable growth opportunity
- High revenue + high quality = winning
- Low revenue + low quality = failure

#### Decision Framework
Every decision must consider:
1. **Revenue Impact**: Will this make money?
2. **Quality Impact**: Will this help users?
3. **Sustainability**: Can we repeat this?

### 3. Growth Must Serve Usefulness

Growth is not an end—it's a means to serve more users.

#### Growth Principles
- More users should mean more value delivered
- Growth channels should be evaluated on quality, not just volume
- High-traffic, low-quality surfaces should be deprioritized
- Organic growth > paid growth > manipulated growth

### 4. Release Cannot Ignore Product Risk

Releases have business impact beyond feature delivery.

#### Release Considerations
- Does this release maintain or improve quality?
- Are there commercial risks?
- Could this break user trust?
- Are we introducing technical debt?

### 5. Recommendations Must Be Explainable

Every recommendation should answer:
- **What?** The recommended action
- **Why?** The reasoning
- **Evidence?** The data supporting it
- **Tradeoffs?** What's being sacrificed
- **Confidence?** How sure are we?

## Decision Types

### Growth Decisions

| Decision | When | Criteria |
|----------|------|----------|
| Scale | Surface performing well | Sessions > 1000, submit rate > 10%, quality > 0.7 |
| Hold | Surface stable | No significant changes needed |
| Pause | Surface degrading | Submit rate < 3%, quality < 0.5 |
| Deindex | Surface failing | Revenue/session < $0.001, no-match > 80% |

### Commercial Decisions

| Decision | When | Criteria |
|----------|------|----------|
| Invest | High ROI | Revenue > cost, quality stable |
| Maintain | Break-even | Revenue ≈ cost |
| Reduce | Low ROI | Revenue < cost |
| Exit | Losing money | No path to profitability |

### Quality Decisions

| Decision | When | Criteria |
|----------|------|----------|
| Improve | Quality declining | No-match rate > 30% |
| Investigate | Anomalies | Unusual patterns detected |
| Fix | Critical issues | User complaints, bugs |

### Release Decisions

| Decision | When | Criteria |
|----------|------|----------|
| Block | High risk | Readiness < 0.5, blockers > 3 |
| Conditional | Moderate risk | Readiness 0.6-0.7, blockers ≤ 2 |
| Approve | Low risk | Readiness > 0.8, blockers = 0 |

### Experiment Decisions

| Decision | When | Criteria |
|----------|------|----------|
| Promote | Winning | Confidence > 95%, improvement > 5% |
| Rollback | Losing | Confidence > 80%, regression > 10% |
| Hold | Inconclusive | Need more data |

## Evidence Requirements

### Minimum Evidence for Decisions

| Priority | Evidence Required |
|----------|-----------------|
| Critical | 3+ data points, statistical significance |
| High | 2+ data points, clear trend |
| Medium | 1+ data point, reasonable assumption |
| Low | Any data, best guess |

### Evidence Quality

- **Strong**: Direct measurement, controlled conditions
- **Moderate**: Observational data, some confounding
- **Weak**: Indirect inference, many assumptions

## Tradeoff Analysis

Every significant decision should document tradeoffs:

### Common Tradeoffs

1. **Revenue vs Quality**: Higher revenue may require lower quality
2. **Speed vs Thoroughness**: Faster releases may miss issues
3. **Scale vs Control**: More traffic is harder to manage
4. **Automation vs Human Judgment**: Auto-scaling removes human review

### Tradeoff Documentation

```
Tradeoff: [What we're sacrificing]
Reason: [Why it's acceptable]
Mitigation: [How we're reducing impact]
Acceptance: [Who approved this]
```

## Confidence Scoring

### Confidence Levels

| Level | Score | Meaning |
|-------|-------|---------|
| High | 0.8+ | Strong evidence, low risk |
| Medium | 0.6-0.79 | Moderate evidence, some risk |
| Low | 0.4-0.59 | Weak evidence, higher risk |
| Speculative | <0.4 | Best guess only |

### Factors Affecting Confidence

1. **Data Quality**: How reliable is the data?
2. **Sample Size**: Enough data points?
3. **Causation vs Correlation**: Can we prove causation?
4. **Time Horizon**: Short-term vs long-term effects?
5. **External Factors**: Market conditions, seasonality?

## Priority Framework

### Priority Levels

| Priority | Score Range | Response Time |
|----------|-------------|---------------|
| Critical | 90-100 | 1 hour |
| High | 70-89 | 4 hours |
| Medium | 50-69 | 24 hours |
| Low | <50 | 72 hours |

### Priority Calculation

```
Priority = Impact × Urgency × Confidence

Impact: How much this affects the business (1-10)
Urgency: How time-sensitive (1-10)
Confidence: How sure we are (0-1)
```

## Governance Integration

### When to Escalate

Escalate when:
1. Decision has >$10K revenue impact
2. Quality score drops >15%
3. Release readiness <0.6
4. User complaints spike

### Escalation Path

1. **Team Lead**: Day-to-day decisions
2. **Product Manager**: Cross-functional impacts
3. **Engineering Manager**: Technical decisions
4. **VP Product**: Strategic decisions

## Anti-Patterns We Reject

### ❌ "Growth at All Costs"
- Don't scale surfaces with low quality
- Don't ignore no-match for volume

### ❌ "Revenue Over Everything"
- Don't sacrifice user trust for short-term revenue
- Don't hide quality issues

### ❌ "Release Fast, Fix Later"
- Don't approve releases with known issues
- Don't skip quality gates

### ❌ "Data-Informed but Decision-Blind"
- Don't collect metrics without action
- Don't make decisions without data

### ❌ "One-Size-Fits-All"
- Don't apply same thresholds to all surfaces
- Don't ignore context

## Implementation Guidelines

### For Engineers

1. Every metric needs lineage documentation
2. Every recommendation needs evidence
3. Every decision needs tradeoff analysis
4. Every assumption needs testing

### For Product

1. Prioritize decisions that affect most users
2. Focus on sustainable metrics, not vanity
3. Consider long-term, not just immediate
4. Question "easy" answers

### For Leadership

1. Ask "so what?" for every metric
2. Demand evidence, not just data
3. Accept uncertainty, but track it
4. Balance short-term and long-term

## Summary

This system is built on the belief that:

1. **Good decisions require good data** - but data alone isn't enough
2. **Quality enables revenue** - not competes with it
3. **Growth serves users** - not the other way around
4. **Transparency builds trust** - including admitting what we don't know
5. **Tradeoffs are inevitable** - but should be conscious choices

---

*Last Updated: 2026-03-17*
*Review Frequency: Quarterly*
*Owner: BI & Product Intelligence Team*
