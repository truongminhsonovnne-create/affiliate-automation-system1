# Ranking Optimization Principles

## Core Philosophy

**We optimize for user usefulness, not metrics.**

The ranking system should help users find the best voucher for their needs, not maximize clicks or engagement metrics.

## What We Optimize For

### Primary Goals
- ✅ **Correct voucher delivery** - User gets voucher that works
- ✅ **Usefulness** - Voucher saves money
- ✅ **Trust** - System is accurate and reliable
- ✅ **Speed** - Fast resolution, fast application

### Metrics We Track (But Don't Optimize For)
- Copy rate (but don't manipulate it)
- Open rate (but don't force clicks)
- Engagement time (but don't clutter UI)
- Bounce rate (but don't trap users)

## What We Reject

### Dark Patterns
- ❌ Fake urgency ("Only 2 hours left!")
- ❌ Scarcity manipulation ("Only 3 left!")
- ❌ Hidden terms (make conditions clear)
- ❌ Pre-selected options (let users choose)
- ❌ Obstacle courses (make it easy to copy)

### Vanity Metrics
- ❌ Maximizing clicks at all costs
- ❌ Increasing page time with clutter
- ❌ Forcing re-engagement
- ❌ Creating artificial loops

### Manipulation Tactics
- ❌ Ranking vouchers by commission, not usefulness
- ❌ Showing "popular" vouchers that aren't good deals
- ❌ Hiding bad results with "no match" inappropriately
- ❌ Gaming SEO with voucher lists

## Signal Quality Principles

### Not All Signals Are Equal

A copy is NOT always good:
- User might copy wrong voucher
- User might not be able to use it
- User might copy and abandon

A view is NOT always bad:
- User might find what they need
- User might come back later
- User might share with friends

### Weighting Rules

We weight signals based on:
1. **Intent clarity** - Copy > Open > View
2. **Sample size** - More data = more confidence
3. **Divergence** - Big gaps need investigation
4. **Context** - Same signal, different situations

### Confidence Levels

| Sample Size | Confidence | Action |
|-------------|------------|--------|
| < 10 | Low | Observe only |
| 10-30 | Medium | Investigate |
| > 30 | High | Consider changes |

## Feedback Principles

### Feedback Is Signal, Not Truth

- Single events are noisy
- Aggregates are better but not perfect
- Correlation is not causation
- Short-term patterns can mislead

### Feedback Quality Checks

Before acting on feedback:
1. Is sample size sufficient?
2. Is the pattern consistent over time?
3. Is there a confounding variable?
4. Does it make user sense?

## Tuning Principles

### Weight Changes

Weight changes MUST be:
- ✅ Reviewed by humans
- ✅ Tested in staging
- ✅ Monitored for regressions
- ✅ Snapshotted for rollback
- ✅ Explained in changelog

### What Gets Tuned

We tune for:
- Better copy success rates
- Fewer no-match cases
- Faster time-to-use
- Higher user satisfaction

### What Doesn't Get Tuned

We DON'T tune for:
- More clicks
- More pageviews
- Higher engagement time
- More sessions per user

## Safety Guardrails

### Auto-Blocking

The system blocks:
- Any weight change > 10% without review
- Any rule change without human approval
- Any experiment running > 2 weeks
- Any experiment without clear success metric

### Required Approvals

Weight changes require:
- Data analysis showing issue
- Proposed solution with rationale
- Test in staging
- Monitoring plan
- Rollback plan

## Experimentation Principles

### When to Experiment

Experiments should test:
- New ranking signals
- Weight adjustments
- UI changes that affect behavior

### When NOT to Experiment

Don't experiment with:
- User trust
- Privacy
- Core matching logic
- Safety systems

### Experiment Standards

Every experiment needs:
1. Clear hypothesis
2. Success metrics (user-focused, not vanity)
3. Success criteria defined upfront
4. Monitoring plan
5. Rollback trigger
6. End date

## Explainability

### Every Change Needs Explanation

When we make changes, we document:
- Why the change was needed
- What data supported it
- What we expect to happen
- How we'll measure success
- What could go wrong

### Audit Trail

All ranking changes are logged:
- Previous values
- New values
- Who approved
- When approved
- Rationale

## Summary

**This is a tool, not a game.**

We exist to help users save money, not to maximize metrics. Every optimization should answer:

> "Does this help users get better vouchers faster?"

If yes, consider it.
If no, reject it.
If unsure, test it carefully.
