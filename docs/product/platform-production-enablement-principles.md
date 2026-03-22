# Platform Production Enablement Principles

## Core Principles

### 1. No Production Candidate Without Evidence

**Principle**: A platform cannot be marked as a production candidate without comprehensive evidence from multiple subsystems.

**Rationale**:
- Single-metric readiness is insufficient
- Evidence must be fresh (within configurable staleness threshold)
- Gaps in evidence reduce confidence

**Implementation**:
- Evidence collection from 8+ subsystems required
- Confidence scoring based on data completeness
- Stale evidence triggers re-collection

### 2. No Enablement Without Governance

**Principle**: No platform can proceed to production without explicit governance approval.

**Rationale**:
- Compliance, security, and legal are non-negotiable
- Commercial pressure must not override safety
- Governance approval is a hard gate

**Implementation**:
- Governance safety score must be ≥80%
- Critical governance blockers block all decisions
- Audit trail for all governance decisions

### 3. Conditions Must Be Explicit

**Principle**: Conditional approvals require explicit, trackable, expiring conditions.

**Rationale**:
- "We'll figure it out later" leads to technical debt
- Conditions without tracking become ignored
- Expiry forces re-evaluation

**Implementation**:
- Conditions stored in database
- Expiry dates auto-calculated
- Satisfaction requires explicit action

### 4. Rollback Path Must Exist

**Principle**: Every production enablement must have a documented rollback path.

**Rationale**:
- Production is not a point of no return
- Fast rollback reduces incident impact
- Emergency procedures must be documented

**Implementation**:
- Stage transitions tracked in history
- Rollback triggers audit
- Rollback procedures documented

### 5. Usefulness and Safety Beat Premature Expansion

**Principle**: User value and platform safety take precedence over expansion speed.

**Rationale**:
- Poor quality damages user trust
- Instability damages platform reputation
- Slow is smooth, smooth is fast

**Implementation**:
- Preview usefulness score ≥65% required
- Preview stability score ≥65% required
- User feedback integrated

### 6. No Single-Point-of-Failure Decisions

**Principle**: Production decisions require consensus across multiple dimensions.

**Rationale**:
- Gaming single metrics is trivial
- Cross-dimensional health indicates real readiness
- Failures are more visible early

**Implementation**:
- Weighted scoring across 10 dimensions
- Multiple subsystems must approve
- Blocker classification prevents gaming

### 7. Evidence First, Opinion Second

**Principle**: Decisions must be evidence-based, not intuition-based.

**Rationale**:
- Memory is fallible
- Metrics are objective
- Audit trails enable learning

**Implementation**:
- All evidence persisted
- All decisions linked to evidence
- Confidence scoring for transparency

### 8. Shopee-Safe

**Principle**: Existing production platforms must not be affected by new platform expansion.

**Rationale**:
- Core business stability first
- New platforms start from scratch
- No shared state corruption

**Implementation**:
- Platform keys isolated
- No cross-platform score influence
- Separate governance per platform

---

## Decision Principles

### Not Ready Decision

When to use:
- Overall score <40%
- Governance not approved
- Critical blockers present

What it means:
- Platform cannot proceed
- Work required on fundamentals
- Re-review after work completion

### Hold Decision

When to use:
- Overall score 40-54%
- High-severity blockers present
- Preview quality issues

What it means:
- Platform should pause
- Address specific issues
- Re-review in next cycle

### Proceed Cautiously Decision

When to use:
- Overall score 55-74%
- No critical blockers
- Governance approved

What it means:
- Limited rollout possible
- Enhanced monitoring required
- Conditions may apply

### Production Candidate Decision

When to use:
- Overall score ≥75%
- Governance ≥80%
- No critical blockers
- Preview quality acceptable

What it means:
- Ready for production planning
- Can schedule production enablement
- Post-enablement monitoring required

### Production Candidate With Conditions Decision

When to use:
- Overall score ≥75%
- All critical conditions satisfied
- Some high-severity conditions pending

What it means:
- Production ready with caveats
- Conditions must be satisfied
- Explicit sign-offs required

### Rollback to Preview Only Decision

When to use:
- Critical stability issues in production
- Governance withdrawn
- Severe quality degradation

What it means:
- Immediate action required
- Root cause analysis needed
- Re-evaluation after fixes

---

## Blocker Principles

### Critical Blockers

**Definition**: Issues that absolutely prevent production.

**Examples**:
- Data foundation not ready
- Governance not approved
- Critical security issues

**Resolution**: Must be resolved before any production decision.

### High Blockers

**Definition**: Issues that strongly recommend against production.

**Examples**:
- Preview stability <40%
- High remediation backlog
- Operator team not ready

**Resolution**: Should be resolved before production candidate status.

### Medium Blockers

**Definition**: Issues that should be addressed but don't block.

**Examples**:
- Domain documentation incomplete
- Some data quality concerns

**Resolution**: Address in production planning phase.

---

## Condition Principles

### Required Conditions

**Definition**: Must be satisfied before production can proceed.

**Examples**:
- Explicit governance approval
- Monitoring enabled
- Runbooks complete

**Tracking**: Expire after configurable days, require explicit satisfaction.

### Optional Conditions

**Definition**: Should be satisfied but don't block.

**Examples**:
- Documentation improvements
- Additional monitoring

**Tracking**: Expire after longer period, can be waived.

---

## Governance Integration

### Pre-Production Gate

Before any production candidate status:
- [ ] Governance review complete
- [ ] Security review approved
- [ ] Privacy assessment complete
- [ ] Legal clearance obtained
- [ ] Risk acceptance documented

### Production Enablement Gate

Before production enablement:
- [ ] All critical blockers resolved
- [ ] Conditions satisfied or waived
- [ ] Rollback procedure documented
- [ ] Monitoring active
- [ ] Team onboarded

### Post-Enablement Review

After production enablement:
- [ ] Metrics monitored
- [ ] Incidents tracked
- [ ] User feedback collected
- [ ] Quality maintained
- [ ] Governance status current

---

## Audit Principles

Every action must be auditable:
- Who made the decision
- When it was made
- What evidence was used
- What the previous state was
- What the new state is
- Why the decision was made

---

*Principles Version: 1.0*
*Last Updated: 2024*
