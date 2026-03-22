# Release Governance Runbook

## When to Block a Release

### Immediate Block (Critical Issues)
- **Critical Product Ops case** open and unresolved
- **Critical experiment guardrail breach** active
- **Critical QA regression** failing
- **Critical operational issue** (high error rate, severe latency)
- **Staging verification failure** on critical checks
- **Security vulnerability** identified

### Default Block (High Severity)
- **High severity stale case** (> 3 days)
- **Multiple high severity issues** (≥ 3)
- **Unresolved remediation** past due date

## When to Conditionally Approve

Conditional approval is appropriate when:
- No critical issues
- Some warnings exist but are acceptable
- Conditions can be documented and tracked
- Follow-ups can be assigned

**Example**: "Approve with conditions: Monitor error rate for 48 hours; assign follow-up to verify fix within 3 days"

## When to Recommend Rollback

Rollback should be recommended when:
- **Multiple critical issues** (> 3) post-release
- **Unrecoverable degradation** (data loss, incorrect behavior)
- **Safety/security critical issue** discovered
- **Customer impact** is severe and spreading

## How to Read a Review Pack

### Section 1: Summary
- **Status**: ready/conditionally_ready/blocked/needs_review
- **Score**: 0-100, higher is better
- **Issue Counts**: blocking vs warning

### Section 2: Blocking Issues
Critical items that prevent release:
- Each issue shows: title, source, severity, entity
- Review for accuracy and relevance

### Section 3: Warning Issues
Items that don't block but should be noted:
- Review for context
- Consider conditional approval

### Section 4: Decision Support
- **Can Approve**: No blocking issues, good score
- **Can Conditional Approve**: Some warnings
- **Can Block**: Has blocking issues
- **Can Defer**: Need more information

### Section 5: Recommended Actions
Priority-ordered actions from the system:
- Review in order
- Consider applying to your situation

## How to Handle Unresolved Follow-ups

### Step 1: Review Status
- Check why it wasn't completed
- Assess current relevance

### Step 2: Re-assign or Update
- Re-assign to correct owner
- Update due date if still relevant

### Step 3: Escalate if Needed
- No progress after 2 weeks → escalate to lead
- Blocker → escalate immediately

### Step 4: Close or Carry Forward
- If resolved → mark complete
- If still relevant → carry to next cycle

## Operating the Cadence

### Weekly Quality Review
1. Run: `npm run governance:weekly-review` or use UI
2. Review dashboard with team
3. Discuss signal trends
4. Assign new follow-ups
5. Update issue priorities

### Post-Release Review (within 24h)
1. Run: `npm run governance:post-release -- --release-key=v1.2.3`
2. Check health metrics
3. Verify conditional approval items
4. Create follow-ups for any issues
5. Decide: continue monitoring or rollback

### Monthly Governance Review
1. Run: `npm run governance:monthly`
2. Review effectiveness metrics
3. Identify systemic issues
4. Plan process improvements
5. Update thresholds/rules if needed

## Emergency Procedures

### Emergency Release (Bypass Governance)
**Only in critical situations with proper justification**

1. Document rationale (minimum 50 characters)
2. Get verbal approval from lead
3. Record bypass in audit log
4. Schedule post-release review within 24h
5. Create follow-up to address governance gap

### Rollback Decision
1. Confirm rollback criteria met
2. Notify release team immediately
3. Execute rollback
4. Create follow-up for root cause analysis
5. Schedule incident review within 48h

## Common Scenarios

### Scenario 1: Build Passes, Governance Blocks
> "Our CI passed but governance blocked the release. Why?"

**Answer**: CI only checks code quality. Governance checks:
- Product quality (cases, remediations)
- Experiment safety (guardrails)
- Operational health (errors, latency)
- QA status (regressions)

**Action**: Review blocking issues, address root cause, review re-run.

### Scenario 2: Conditionally Approved but Forgot Follow-up
> "We conditionally approved but didn't create follow-ups."

**Action**:
1. Review conditional approval conditions
2. Create follow-ups immediately
3. Set reminder for due date
4. Add to next week's review agenda

### Scenario 3: False Positive Signal
> "A signal triggered but it's not actually an issue."

**Action**:
1. Investigate signal source
2. If truly false positive: update signal rules
3. Mark signal as resolved
4. Document in team channel

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run governance:review -- --release-key=X` | Run review for release |
| `npm run governance:approve -- --release-key=X` | Approve release |
| `npm run governance:block -- --release-key=X --reason=Y` | Block release |
| `npm run governance:weekly` | Run weekly cadence |
| `npm run governance:ci-report` | Build CI report |
