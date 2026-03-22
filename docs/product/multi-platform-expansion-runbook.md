# Multi-Platform Expansion Runbook

## Overview

This runbook guides the team through evaluating, preparing for, and executing platform expansion.

---

## Running Readiness Reviews

### Basic Usage

```bash
# Run readiness review for a platform
npm run platform:readiness -- --platform=tiktok_shop --type=initial

# Run TikTok Shop specific review
npm run platform:tiktok-readiness
```

### Interpreting Results

#### Status: READY (Score ≥ 85%)
- Platform is prepared for expansion
- Can proceed with confidence
- Minimal risk to core business

#### Status: PROCEED CAUTIOUSLY (Score 70-85%)
- Platform is mostly ready
- Review warnings carefully
- May proceed with enhanced monitoring

#### Status: HOLD (Score 50-70%)
- Platform needs more preparation
- Address blockers before proceeding
- Re-evaluate in 2-4 weeks

#### Status: NOT READY (Score < 50%)
- Critical blockers exist
- Do not proceed
- Focus on resolving blockers first

---

## Reading the Readiness Review

### Score Breakdown

```
Overall Score: 45%

Domain Model:      30% ████████░░░░░░░░░░
Parser/Reference:  40% ██████████░░░░░░░░░
Product Context:  30% ████████░░░░░░░░░░░
Promotion Rules:  20% ██████░░░░░░░░░░░░░
Public Flow:      10% ███░░░░░░░░░░░░░░░░
Commercial Attr:  20% ██████░░░░░░░░░░░░░
Governance:       10% ███░░░░░░░░░░░░░░░
```

### Understanding Blockers

Blockers are issues that prevent expansion:

- **Critical**: Must fix before any expansion
- **High**: Should fix before proceeding
- **Medium**: Fix before launch

### Understanding Warnings

Warnings are concerns but not blocking:

- **High**: Address before scaling
- **Medium**: Monitor during expansion
- **Low**: Track for future improvement

---

## Managing the Expansion Backlog

### Viewing Backlog

```bash
# Get backlog for a platform
curl http://localhost:3000/internal/platforms/tiktok_shop/backlog
```

### Backlog Item Structure

```json
{
  "id": "uuid",
  "title": "Implement TikTok Shop Product Reference Parser",
  "priority": "critical",
  "status": "pending",
  "dueAt": "2024-03-15T00:00:00Z",
  "capabilityArea": "product_reference_parsing"
}
```

### Completing Backlog Items

```bash
# Mark item as complete
curl -X POST http://localhost:3000/internal/platforms/tiktok_shop/backlog/{id}/complete
```

---

## Making Expansion Decisions

### Decision Framework

1. **Check Readiness Score**
   ```bash
   npm run platform:tiktok-readiness
   ```

2. **Review Blockers**
   - Are there critical blockers?
   - Can they be resolved quickly?

3. **Check Backlog**
   - What's remaining?
   - Is it achievable in timeline?

4. **Get Approval**
   - Present findings to leadership
   - Get sign-off before proceeding

### Approval Gates

| Phase | Gate | Approver |
|-------|------|----------|
| Discovery | Contracts Approved | Tech Lead |
| Foundation | MVP Ready | Engineering Manager |
| Core | Features Ready | VP Engineering |
| Integration | Attribution Verified | Head of Product |
| Launch | Full Approval | CEO/Founder |

---

## Troubleshooting

### Review Fails to Run

**Symptom:** `npm run platform:readiness` returns error

**Solution:**
1. Check database connectivity
2. Verify migrations ran
3. Check logs for details

### Backlog Items Won't Complete

**Symptom:** Item status stays as "pending"

**Solution:**
1. Verify item ID is correct
2. Check database write permissions
3. Review error logs

### Platform Not Found

**Symptom:** Getting 404 on platform endpoints

**Solution:**
1. Register platform first: `POST /internal/platforms`
2. Verify platform key spelling
3. Check platform_registry table

---

## TikTok Shop Specific Guide

### Current Status

```
Platform: TikTok Shop
Status: NOT READY
Score: 0%
Blockers: 6
Warnings: 0
```

### What's Missing

1. Product Reference Parsing
2. Product Context Resolution
3. Promotion Rules
4. Public Flow Support
5. Commercial Attribution
6. Growth Surface Support

### Recommended Path

#### Step 1: Foundation (Weeks 1-4)
- [ ] Build TikTok Shop URL parser
- [ ] Build product context resolver

#### Step 2: Core (Weeks 5-8)
- [ ] Model TikTok Shop promotions
- [ ] Implement public flow UI

#### Step 3: Integration (Weeks 9-12)
- [ ] Set up attribution
- [ ] Create growth surfaces

#### Step 4: Launch (Week 13+)
- [ ] Run final readiness review
- [ ] Get approval
- [ ] Launch

---

## Escalation

### When to Escalate

- Readiness score stuck below 50% for 2+ weeks
- Critical blockers can't be resolved
- Timeline at risk
- Scope creep

### Escalation Path

1. **Team Lead** → Resolve blockers
2. **Engineering Manager** → Timeline/scope decisions
3. **VP Engineering** → Resource allocation
4. **CTO** → Strategic decisions

---

## Best Practices

1. **Run reviews regularly** - At least monthly during expansion
2. **Address blockers immediately** - Don't let them accumulate
3. **Keep backlog updated** - Complete items as you go
4. **Test Shopee first** - Any changes should work for Shopee
5. **Document decisions** - Record rationale for future reference
6. **Get sign-off** - Never proceed without approval

---

## Quick Reference

```bash
# Run TikTok Shop readiness review
npm run platform:tiktok-readiness

# Run platform readiness review
npm run platform:readiness -- --platform=tiktok_shop --type=initial

# Check platform list
curl http://localhost:3000/internal/platforms

# Get platform status
curl http://localhost:3000/internal/platforms/tiktok_shop

# Get backlog
curl http://localhost:3000/internal/platforms/tiktok_shop/backlog
```
