# Safe Experimentation Principles

## Core Philosophy

**We experiment to improve user usefulness, not to manipulate metrics.**

## What We Optimize For

### User-First Goals
- ✅ Better voucher delivery
- ✅ Higher copy success
- ✅ Faster resolution
- ✅ Lower no-match rate
- ✅ Cleaner UX

### What We Reject

#### Dark Patterns
- ❌ Fake urgency ("Only 2 hours left!")
- ❌ Scarcity manipulation
- ❌ Deceptive CTAs
- ❌ Confusing UI

#### Vanity Metrics
- ❌ Click maximization
- ❌ Engagement time inflation
- ❌ Session count optimization
- ❌ Bounce rate gaming

## Experimentation Rules

### 1. Always Have a Hypothesis
Every experiment needs a clear, testable hypothesis about user benefit.

### 2. Never Auto-Promote
All experiment winners require human review before rollout.

### 3. Guardrails Are Non-Negotiable
- Error rate must stay < 5% increase
- No-match rate must stay < 10% increase
- Latency must stay < 25% increase

### 4. Gradual Rollout
- Start at 10%
- Wait 24h between increments
- Max 50% without guardrails passing

### 5. Fast Rollback
Kill switches must work within seconds.

### 6. Clean UX is Non-Negotiable
- No cluttered layouts
- No misleading CTAs
- No fake urgency

## Decision Framework

### Before Experiment
- [ ] Clear hypothesis
- [ ] Success metrics defined
- [ ] Guardrails configured
- [ ] Rollout plan documented

### During Experiment
- [ ] Monitor guardrails
- [ ] Review daily metrics
- [ ] Stop if critical breach

### After Experiment
- [ ] Analyze results
- [ ] Document learnings
- [ ] Get approval to promote
- [ ] Update docs

## Summary

Experiments should make the product better for users, not better for metrics.
