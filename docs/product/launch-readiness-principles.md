# Launch Readiness Principles

## Core Principles

### 1. Launch Readiness is NOT Build Success

A passing build does NOT mean the system is ready for launch.

**Build success proves:**
- Code compiles
- Tests pass
- Artifacts are created

**Launch readiness proves:**
- Runtime is stable
- Public flows work
- Quality gates passed
- Commercial impact is acceptable
- Operations is ready
- Rollback is tested

### 2. Blockers Must Be Explicit

Never declare "launch ready" with unresolved blocking issues.

**What makes a blocker:**
- Critical severity risk
- Failed critical checklist item
- Missing required sign-off
- Failed quality gate
- Security issue

**Blocker handling:**
1. Identify and document
2. Assign owner
3. Set due date
4. Track to resolution
5. Verify before launch

### 3. Sign-offs Must Be Explicit

Every required area must have documented sign-off.

**Required sign-offs:**
- Product Quality
- Release/Runtime
- Commercial Safety
- Multi-Platform Support
- Governance/Ops

**Sign-off requirements:**
- Named approver
- Timestamp
- Explicit approval/rejection
- Rationale for decisions

### 4. Rollback/Freeze/Watch Must Exist

Never launch without a plan to handle problems.

**Freeze policy:**
- No production deployments during freeze
- No config changes
- Emergency bypass requires approval

**Rollback readiness:**
- Tested rollback procedures
- Clear rollback triggers
- Documented rollback steps

**Watch window:**
- Defined monitoring signals
- Escalation triggers
- Review schedule

### 5. Usefulness/Quality/Governance Must Be Launch Inputs

Launch decisions must consider:

**Usefulness:**
- Will users find this valuable?
- Does it solve a real problem?
- Is the experience acceptable?

**Quality:**
- Error rates acceptable?
- Performance baseline established?
- Data quality verified?

**Governance:**
- Compliance requirements met?
- Security audit passed?
- Quality gates passed?

### 6. No Premature Declaration of Readiness

Don't declare launch ready to meet deadlines.

**Anti-patterns:**
- "We need to launch by date X"
- "The build is passing"
- "We've been working on this for months"
- "Competitors are launching"

**Correct approach:**
- Assess current state honestly
- Identify gaps explicitly
- Plan remediation
- Make data-driven decision

## Decision Framework

### When to GO

- All critical checklist items complete
- Zero critical/open risks
- All required sign-offs approved
- Error rates within threshold
- Rollback tested and ready
- Watch plan in place

### When to CONDITIONAL GO

- Minor warnings exist
- ≤2 high-severity risks
- All critical items resolved
- All required sign-offs obtained (may be conditional)
- Watch plan enhanced for known issues
- Additional monitoring in place

### When to NO-GO

- Critical unresolved issues
- High-severity risks not mitigated
- Missing required sign-offs
- Error rates exceed threshold
- Rollback not tested
- Watch plan incomplete

## Anti-Patterns to Avoid

### Dashboard Decoration
❌ Making dashboards look good to hide real issues
✅ Transparent metrics with honest assessment

### Checkbox Compliance
❌ Completing checklists without verification
✅ Verified completion with evidence

### Deadline-Driven Launch
❌ Launching to meet a date regardless of state
✅ State-driven launch with realistic timeline

### Risk Hiding
❌ Not documenting known issues
✅ Explicit risk register with ownership

### Sign-off Theater
❌ Getting sign-offs without real review
✅ Meaningful review with explicit approval

## Governance

### Review Cadence

- **Daily** during launch week: Status sync
- **Pre-launch** (3 days): Final readiness review
- **Launch day**: Go/No-Go decision
- **Post-launch** (7 days): Daily reviews

### Escalation Path

1. **Issue → Team Lead**: Immediate
2. **Blocker → Manager**: Within 4 hours
3. **Critical → Director**: Within 1 hour
4. **Launch Decision → VP**: Final approval

### Audit Trail

All launch decisions must be documented:
- Who made the decision
- When it was made
- What evidence was considered
- What rationale guided the decision
