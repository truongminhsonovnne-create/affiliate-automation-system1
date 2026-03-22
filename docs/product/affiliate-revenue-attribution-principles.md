# Affiliate Revenue Attribution Principles

## Core Philosophy

> **Revenue attribution must be explainable, honest, and never compromise user usefulness.**

This document establishes the principles that govern how we measure, report, and optimize affiliate revenue in our system.

## Foundational Principles

### 1. Attribution Must Be Explainable

Every attributed dollar must be traceable to:

- **Which flow** (paste-link → resolution → copy → click)
- **Which voucher** was used
- **Which surface** the user came from
- **How confident** we are in the attribution
- **What assumptions** were made

#### What This Means

- No "black box" attribution
- Every report includes confidence scores
- Assumptions are documented and auditable
- Attribution can be explained to stakeholders

### 2. No Overclaiming Revenue

We will never claim revenue we cannot reasonably attribute.

#### Rules

- Only attribute to clicks within the attribution window (7 days)
- Only attribute to confirmed conversions
- Mark low-confidence attributions clearly
- Never count duplicate conversions
- Account for attribution decay

#### What This Means

- Lower revenue numbers that are accurate > Higher numbers that are inflated
- "Unknown" is an acceptable attribution state
- External reporting may show different numbers (and that's OK)

### 3. No Vanity Metrics Obsession

We measure what matters, not what's easy to measure.

#### What Matters

- **Revenue**: Actual money earned
- **Commission**: What we actually receive
- **Conversions**: Real transactions
- **Quality**: User satisfaction

#### What Doesn't Matter (Alone)

- Click counts without conversion
- Paste submits without resolution
- Views without engagement
- "Potential" revenue

### 4. User Usefulness First

Commercial optimization will never override user value.

#### The Hierarchy

1. **User Usefulness**: Does this help users find what they need?
2. **Clean UX**: Is the experience transparent and honest?
3. **Revenue**: Can we monetize sustainably?

#### Revenue is Secondary When:

- No-match rate is increasing
- User engagement (copy/open) is decreasing
- Quality scores are declining
- User complaints are rising

### 5. No Dark-Pattern Monetization

We will not optimize for revenue in ways that:

- Mislead users about what they're getting
- Force unnecessary actions
- Hide important information
- Create artificial urgency
- Push low-quality results

## Attribution Principles

### First-Touch vs. Last-Touch

We support multiple attribution models, but:

- **First-touch** is useful for acquisition analysis
- **Last-touch** is useful for conversion optimization
- **Multi-touch** gives the most accurate picture
- Always report which model was used

### Confidence Scoring

| Level | Criteria | Usage |
|-------|----------|-------|
| High | Direct click + voucher + conversion within window | Primary reporting |
| Medium | Either click or voucher match | Secondary reporting |
| Low | Inferred attribution | Context only |
| Unknown | No data | Exclude from totals |

### Attribution Windows

- **Click to Conversion**: 7 days
- **Impression to Click**: 24 hours
- **Session Timeout**: 30 minutes

These windows are configurable and reviewed quarterly.

### Attribution Assumptions

Every attribution report must document:

1. What data was available
2. What was imputed or assumed
3. What the confidence level is
4. What could cause false positives/negatives

## Quality Principles

### Measuring Quality

Quality is not an afterthought—it's a primary metric.

#### Quality Dimensions

1. **Relevance**: Did the user find what they wanted?
2. **Success Rate**: Did the resolution work?
3. **Engagement**: Did they use the voucher?
4. **Satisfaction**: Did they come back?

#### Quality Metrics

- No-match rate (lower is better)
- Copy rate (voucher copy / resolution)
- Open rate (Shopee open / voucher copy)
- Return visitor rate

### Quality Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| No-match rate | > 30% | > 50% |
| Copy rate | < 30% | < 15% |
| Open rate | < 40% | < 20% |
| Balance score | < 0.7 | < 0.5 |

## Surface Attribution Principles

### Surface Quality Categories

Every growth surface is evaluated on:

1. **Traffic Quality**: Are these users actually interested?
2. **Conversion Quality**: Do they convert at healthy rates?
3. **Revenue Quality**: Is the revenue sustainable?
4. **Quality Contribution**: Does it help or hurt overall quality?

### Surface Health Indicators

| Indicator | Healthy | Warning | Unhealthy |
|-----------|---------|---------|-----------|
| Submit rate | > 5% | 1-5% | < 1% |
| No-match rate | < 20% | 20-40% | > 40% |
| Copy rate | > 40% | 20-40% | < 20% |
| Revenue/session | > $0.10 | $0.01-$0.10 | < $0.01 |

### Surface Governance

- **Scale**: Healthy metrics, improving trends
- **Maintain**: Acceptable metrics, stable
- **Investigate**: Declining metrics or anomalies
- **Reduce**: Poor metrics, not improving
- **Remove**: Critical issues, user harm

## Experiment Attribution Principles

### Measuring Experiment Impact

Experiments must be evaluated on:

1. **Revenue Impact**: Did it make money?
2. **Quality Impact**: Did it help or hurt users?
3. **Statistical Significance**: Are results reliable?

### Experiment Health Indicators

| Scenario | Revenue | Quality | Action |
|----------|---------|---------|--------|
| Good | ↑ | ↑ | Approve |
| Mixed | ↑ | ↓ | Review carefully |
| Bad | ↓ | ↑ | Investigate |
| Critical | ↓ | ↓ | Reject |

### Guardrails for Experiments

- Revenue cannot drop more than 20% vs control
- Quality cannot drop more than 15% vs control
- Minimum sample size required (100 sessions)
- Minimum detection period (3 days)

## Reporting Principles

### What Reports Must Include

Every report must answer:

1. **What happened?** (Metrics)
2. **How confident are we?** (Confidence scores)
3. **What assumptions did we make?** (Documentation)
4. **What might be wrong?** (Caveats)
5. **What should we do?** (Recommendations)

### Report Transparency

- Raw data available for audit
- Methodology documented
- Changes to methodology noted
- Historical comparisons available

### Report Frequency

| Report Type | Frequency | Audience |
|------------|-----------|----------|
| Daily metrics | Daily | Operations |
| Weekly summary | Weekly | Product |
| Monthly review | Monthly | Leadership |
| Quarterly deep-dive | Quarterly | Executive |

## Governance Principles

### When to Review

Automatic review triggers:

- Revenue drops > 20% week-over-week
- Quality metrics drop > 15%
- No-match rate > 40%
- New surface launch
- Experiment shows unexpected results

### Decision Framework

1. **Data**: What do the numbers say?
2. **Context**: What's happening in the market?
3. **Quality**: Are we helping users?
4. **Sustainability**: Is this repeatable?
5. **Risk**: What could go wrong?

### Escalation Paths

| Severity | Response Time | Escalation |
|----------|--------------|------------|
| Critical | 1 hour | Immediate |
| High | 4 hours | Daily standup |
| Medium | 24 hours | Weekly review |
| Low | 72 hours | Backlog |

## Anti-Patterns We Reject

### ❌ "Revenue at All Costs"

- Don't hide no-match results
- Don't optimize for clicks without conversion
- Don't push low-quality vouchers for high commission

### ❌ "Vanity Metrics"

- Views without engagement don't matter
- Clicks without conversion are noise
- "Potential" revenue is fictional

### ❌ "Gaming the Numbers"

- Don't count partial conversions
- Don't exclude "bad" data points
- Don't change definitions mid-period

### ❌ "Ignoring Quality"

- Revenue up + quality down = warning sign
- No-match is a failure, not just a metric
- User complaints are data points

## Implementation Guidelines

### Code Level

1. Always include confidence scores
2. Document attribution assumptions
3. Log quality metrics alongside revenue
4. Make attribution lineage traceable

### Process Level

1. Review quality metrics in every report
2. Flag anomalies immediately
3. Update thresholds quarterly
4. Audit attribution accuracy regularly

### Culture Level

1. "User first" is not just a slogan
2. It's OK to report bad news
3. Quality is everyone's responsibility
4. Question unusual patterns

## Summary

This system is built on the belief that:

1. **Honest measurement** builds trust
2. **User value** creates sustainable revenue
3. **Transparency** enables better decisions
4. **Quality** is not a constraint on revenue—it's the foundation

Revenue optimization that sacrifices user usefulness is not optimization—it's exploitation. We will not do it.

---

*Last Updated: 2026-03-17*
*Review Frequency: Quarterly*
*Owner: Commercial Intelligence Team*
