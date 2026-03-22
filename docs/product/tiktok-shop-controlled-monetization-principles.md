# TikTok Shop Controlled Monetization Principles

## Core Principles

### 1. Preview Usefulness Before Monetization

**Principle**: The quality and usefulness of the TikTok Shop preview always takes precedence over monetization readiness.

**Implications**:
- Never enable monetization if preview usefulness score < 40%
- Never enable monetization if stability score < 40%
- Always prioritize improving preview quality before expanding monetization
- User value comes before revenue

**Why**: Without useful preview, monetization is premature and damages user trust.

---

### 2. Lineage Confidence Before Revenue Claims

**Principle**: Never claim full commercial attribution without sufficient lineage confidence.

**Implications**:
- Click lineage completeness must be ≥60% before any attribution
- Attribution confidence thresholds must be met before claiming revenue
- Always disclose preview-level attribution limitations
- Never overclaim conversion accuracy

**Why**: Premature attribution claims lead to inaccurate revenue reporting and stakeholder misdirection.

---

### 3. No Premature Monetization

**Principle**: Monetization expansion must be evidence-based, not timeline-based.

**Implications**:
- Must meet all guardrail thresholds before enabling any monetization
- Must have sufficient preview data before expansion decisions
- Blockers must be resolved before proceeding
- Cannot skip phases without explicit approval

**Why**: Premature monetization creates technical debt and user experience issues.

---

### 4. No Deceptive Preview UX

**Principle**: Preview must honestly represent support states at all times.

**Implications**:
- Always disclose when platform is in sandbox/preview
- Never optimize for click-through over honest representation
- Clear support state indicators required
- Limitations must be visible

**Why**: Deceptive patterns erode user trust and violate platform ethics.

---

### 5. Governance Must Gate Enablement

**Principle**: All monetization enablement requires explicit governance approval.

**Implications**:
- All stage transitions require governance review
- Blockers require explicit approval to override
- Rollback capability must exist
- Full audit trail required

**Why**: Governance provides checks and balances against premature expansion.

---

## Monetization Stages

### Stage 1: Disabled
- No commercial actions allowed
- Pure preview mode only
- No attribution claims

### Stage 2: Internal Validation Only
- Internal testing only
- No external exposure
- Signal collection begins

### Stage 3: Preview Signal Collection
- Limited internal access
- Collecting attribution signals
- No revenue claims

### Stage 4: Limited Monetization Preview
- Limited external access
- Controlled attribution
- Revenue disclosure required

### Stage 5: Production Candidate
- Ready for production review
- Full attribution prepared
- Governance approval required

### Stage 6: Production Enabled
- Full production monetization
- Standard attribution
- Revenue reporting active

---

## Guardrails

### Quality Guardrails
- Preview quality score ≥50%
- Usefulness score ≥50%
- Stability score ≥60%

### Attribution Guardrails
- Lineage confidence ≥50%
- Unsupported rate ≤30%
- Complete click tracking

### Governance Guardrails
- No critical blockers
- Governance approval obtained
- Rollback plan in place

### UX Guardrails
- Honest representation ≥60%
- No deceptive patterns
- Clear support disclosure

---

## Decision Framework

### Hold Decision Triggers
- Blockers exist
- Critical quality issues
- Governance rejection
- Security concerns
- User feedback issues

### Proceed Decision Triggers
- All thresholds met
- Governance approval
- Rollback plan ready
- Monitoring active

### Extend Decision Triggers
- Insufficient data
- Mixed signals
- Warnings present
- Need more evidence

---

## Anti-Patterns

### Anti-Pattern 1: Vanity Metrics Optimization
**Bad**: Optimizing preview for click-through rates
**Good**: Optimizing for user value and honesty

### Anti-Pattern 2: Timeline-Driven Expansion
**Bad**: "We need to enable monetization by Q2"
**Good**: "We can enable monetization when thresholds are met"

### Anti-Pattern 3: Revenue Over Quality
**Bad**: "The numbers look good, let's expand"
**Good**: "The quality metrics support expansion"

### Anti-Pattern 4: Hiding Limitations
**Bad**: Not disclosing sandbox/preview status
**Good**: Always clear about support limitations

### Anti-Pattern 5: Ignoring Warnings
**Bad**: Proceeding despite warnings
**Good**: Addressing warnings before expansion

---

## Enforcement

### Technical Enforcement
- Guardrail thresholds in code
- Automated quality checks
- Blocking at API level

### Governance Enforcement
- Manual approval required
- Audit trail required
- Rollback capability

### Cultural Enforcement
- Training on principles
- Code review checks
- Post-mortem reviews

---

## Success Criteria

### For Monetization Enablement
- [ ] All quality thresholds met
- [ ] Governance approval obtained
- [ ] Rollback plan documented
- [ ] Monitoring active
- [ ] User feedback mechanism in place

### For Production Expansion
- [ ] ≥80% readiness score
- [ ] 30+ days of stable preview data
- [ ] No critical blockers
- [ ] Governance approval
- [ ] Operations ready

---

## References

- Preview Intelligence Architecture: `tiktok-shop-preview-intelligence-architecture.md`
- Preview Runbook: `tiktok-shop-preview-runbook.md`
- Platform Resolution Gates: `platform-resolution-gates-runbook.md`
