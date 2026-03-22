# Release Readiness Review Principles

## Core Principles

### 1. Build Pass Is Not Enough

A release cannot proceed based solely on:
- ✅ Build succeeds
- ✅ Tests pass
- ✅ Deployment succeeds

The release must also meet:
- ✅ No unresolved critical Product Ops cases
- ✅ No active experiment guardrail breaches
- ✅ No unresolved QA regressions
- ✅ No critical operational issues

### 2. Product Quality Matters

Product quality signals are equally important as technical quality:
- Voucher matching quality
- Ranking quality degradation
- No-match spike detection
- Experiment guardrail compliance
- User experience metrics

### 3. Unresolved Severe Issues Block Rollout

**Critical Issues (Block Always):**
- Any critical severity Product Ops case
- Any critical guardrail breach
- Any critical QA regression
- Any critical operational issue
- Any staging failure

**High Severity Issues (Block by Default):**
- High severity stale Product Ops case
- Multiple high severity issues
- Issues older than threshold

### 4. Conditional Approvals Require Mitigation

When approving with conditions:
- Document specific conditions
- Assign follow-up actions
- Set verification timeline
- Monitor post-release

### 5. Rollback Recommendation Must Be Explainable

Before recommending rollback:
- Document specific failures
- Quantify impact
- Propose rollback scope
- Define recovery steps

### 6. Human Review Is Part of Safe Release

- Automated evaluation provides data
- Human reviewers make final decision
- Decision must include rationale
- All decisions are audited

## Decision Criteria

### Approve ✅
- No blocking issues
- Readiness score ≥ 75
- No critical warnings

### Conditional Approve ⚠️
- No critical blocking issues
- Has warnings that are acceptable
- Conditions are documented
- Follow-ups assigned

### Block ⛔
- Has critical issues
- Has unresolved high-severity issues
- Readiness score < 40

### Defer ⏸
- Missing information
- Need additional review
- Awaiting dependency resolution

### Rollback Recommended 🔄
- Multiple critical issues post-release
- Unrecoverable degradation
- Safety/security issue

## Review Pack Contents

A complete review pack includes:
1. Readiness score and status
2. Blocking issues (with details)
3. Warning issues (with details)
4. Signal summary by source
5. Decision support (can approve/block/defer)
6. Recommended actions
7. Risk assessment
8. Open follow-ups from previous releases
