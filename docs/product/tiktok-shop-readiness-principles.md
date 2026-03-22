# TikTok Shop Readiness Principles

## Overview

These principles guide the expansion to TikTok Shop. They ensure we don't rush implementation before the foundation is solid, while keeping the path clear for when we're ready.

---

## Core Principles

### 1. Contracts First, Implementation Second

**DO:**
- Define platform-neutral contracts before implementing TikTok Shop adapters
- Ensure contracts work for both Shopee and TikTok Shop
- Test contracts with Shopee first before adding TikTok Shop

**DON'T:**
- Start implementing TikTok Shop features without contracts in place
- Create TikTok Shop-specific code that doesn't fit the contract model
- Rush to "make it work" without proper abstraction

---

### 2. No Premature Feature Parity

**DO:**
- Start with minimal viable capability (MVP)
- Prioritize core flows (reference → context → promotion)
- Add features based on actual need, not speculation

**DON'T:**
- Try to match every Shopee feature for TikTok Shop
- Build features "just in case"
- Create complex implementations before proving the concept

---

### 3. Readiness Before Implementation

**DO:**
- Run readiness review before starting any implementation
- Address blockers before proceeding to next capability
- Use the readiness score as a gate

**DON'T:**
- Start building because "we need TikTok Shop"
- Ignore readiness warnings
- Proceed when blockers exist

---

### 4. Governance Before Scale

**DO:**
- Complete governance setup before scaling TikTok Shop traffic
- Ensure attribution, reporting, and ops are solid
- Get approval at each phase gate

**DON'T:**
- Scale traffic before attribution is proven
- Ignore governance gaps
- Bypass approval processes

---

### 5. Clean Expansion, No Core Regression

**DO:**
- Ensure any TikTok Shop code doesn't break Shopee
- Test Shopee flow after TikTok Shop changes
- Keep platform-specific code isolated

**DON'T:**
- Modify core contracts to "make it work" for TikTok Shop
- Share state between platforms
- Create tight coupling

---

## Readiness Gates

### Phase 0: Discovery (Score: 0-20%)
- [ ] Platform-neutral contracts defined
- [ ] Placeholder adapters created
- [ ] Registry entry created

### Phase 1: Foundation (Score: 20-40%)
- [ ] Product reference parsing implemented
- [ ] Product context resolution implemented
- [ ] Basic validation working

### Phase 2: Core (Score: 40-60%)
- [ ] Promotion rule modeling implemented
- [ ] Public flow UI working
- [ ] Basic attribution in place

### Phase 3: Integration (Score: 60-80%)
- [ ] Full attribution tracking
- [ ] Growth surfaces working
- [ ] BI/reporting integrated

### Phase 4: Launch (Score: 80-100%)
- [ ] Governance complete
- [ ] Ops processes defined
- [ ] Approval granted

---

## Decision Criteria

### When to PROCEED

- Readiness score ≥ 85%
- No critical blockers
- Core capabilities verified
- Governance approved
- Team ready

### When to HOLD

- Readiness score 50-85%
- Some blockers remain
- Governance incomplete
- Need more preparation

### When to NOT PROCEED

- Readiness score < 50%
- Critical blockers exist
- Core capabilities missing
- High risk to core business

---

## Anti-Patterns to Avoid

### ❌ "We Need TikTok Shop ASAP"
Rushing implementation without proper foundation.

**Why it's bad:** Creates technical debt, breaks Shopee, impossible to maintain.

### ❌ "Let's Just Copy Shopee"
Copy-pasting Shopee code into TikTok Shop adapters.

**Why it's bad:** Misses TikTok Shop-specific nuances, doesn't leverage contracts.

### ❌ "Feature Parity with Shopee"
Trying to match every Shopee feature.

**Why it's bad:** Wastes effort on unused features, delays launch unnecessarily.

### ❌ "Ship Now, Fix Later"
Launching with known issues.

**Why it's bad:** Breaks user trust, creates support burden, damages reputation.

---

## Implementation Priority

### Critical Path

1. **Product Reference Parsing** (Week 1-2)
   - Parse TikTok Shop URLs
   - Extract product IDs
   - Normalize to platform-neutral form

2. **Product Context Resolution** (Week 2-4)
   - Fetch product details
   - Extract seller info
   - Get pricing

3. **Promotion Rules** (Week 4-6)
   - Model TikTok Shop promos
   - Map to platform-neutral format
   - Evaluate eligibility

4. **Public Flow** (Week 6-8)
   - Paste-link UI for TikTok Shop
   - Resolution flow
   - Error handling

### Secondary Path

5. **Attribution** (Week 8-10)
   - Click tracking
   - Conversion tracking
   - Attribution models

6. **Growth Surfaces** (Week 10-12)
   - Surface creation
   - Performance tracking
   - Optimization

### Tertiary Path

7. **Governance** (Week 12-14)
   - Reporting
   - Compliance
   - Monitoring

---

## Success Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Readiness Score | ≥85% | 70-85% | <70% |
| Critical Blockers | 0 | 1-2 | >2 |
| Test Coverage | ≥80% | 60-80% | <60% |
| Shopee Regression | 0 | 1-2 | >2 |

---

## Governance Checklist

Before TikTok Shop launch:

- [ ] Readiness review passed
- [ ] All critical blockers resolved
- [ ] Attribution verified
- [ ] Reporting in place
- [ ] Ops processes defined
- [ ] Monitoring active
- [ ] Rollback plan ready
- [ ] Approval obtained

---

## Summary

TikTok Shop expansion is a strategic decision, not an emergency. We move when ready, not when asked. The readiness framework exists to protect us from rushing and failing. Use it.
