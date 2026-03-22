# Final Launch Runbook

## Overview

This runbook provides operational guidance for executing the final launch closure and managing post-launch operations.

## Pre-Launch Checklist

### 1. Run Launch Readiness Closure

```bash
npm run launch:closure
```

This will:
- Collect all risks from subsystems
- Evaluate hardening checklists
- Calculate readiness score
- Generate go/no-go decision
- Create watch plan

### 2. Review Closure Report

The closure report shows:
- **Decision**: GO / CONDITIONAL_GO / NO-GO
- **Readiness Score**: 0-100%
- **Blockers**: Issues blocking launch
- **Warnings**: Issues to watch
- **Signoffs**: Approval status

### 3. Address Blockers

If blockers exist:
1. Review blocker details
2. Assign owner
3. Set due date
4. Track to resolution

### 4. Obtain Sign-offs

Required sign-offs:
- Product Quality
- Release/Runtime
- Commercial Safety
- Multi-Platform Support
- Governance/Ops

## Making Go/No-Go Decision

### Decision Criteria

| Status | Score | Blockers | Signoffs |
|--------|-------|----------|----------|
| GO | ≥85% | 0 | All approved |
| CONDITIONAL_GO | ≥70% | ≤2 | All obtained |
| NO-GO | <70% | >2 | Missing |

### Go Decision Process

1. Review closure report
2. Verify all critical items resolved
3. Confirm sign-offs obtained
4. Approve launch
5. Activate watch plan

### Conditional Go Process

1. Review warnings
2. Define conditions to monitor
3. Enhance watch plan
4. Approve with conditions
5. Document conditions

### No-Go Process

1. Review blockers
2. Assign remediation owners
3. Set remediation timeline
4. Reschedule launch
5. Re-run closure when ready

## Missing Sign-offs

### If Sign-off is Missing

1. **Identify missing area**
2. **Contact responsible party**
3. **Provide evidence**
4. **Obtain approval**
5. **Document decision**

### Escalation for Missing Sign-offs

- 24 hours overdue → Escalate to manager
- 48 hours overdue → Escalate to director

## Reading Unresolved Risk Registry

### Risk Severity

| Severity | Action Required |
|----------|-----------------|
| Critical | Must resolve before launch |
| High | Must mitigate or accept |
| Medium | Monitor during launch |
| Low | Track post-launch |

### Risk Status

| Status | Meaning |
|--------|---------|
| Open | Not yet addressed |
| Mitigated | Action taken, monitoring |
| Accepted | Risk acknowledged, launching |
| Resolved | No longer a risk |
| Won't Fix | Acknowledged, not addressing |

## Post-Launch Operations

### Watch Window (7 days)

**Critical signals to monitor:**
- Error rates
- Latency
- Conversion rates
- Revenue impact
- Public flow health

### Review Schedule

| Time | Focus |
|------|-------|
| +4 hours | Initial stabilization |
| +24 hours | First review |
| +72 hours | Stability assessment |
| Daily | Operational metrics |
| Weekly | Trend analysis |

### Escalation During Watch

| Issue | Response Time | Escalate To |
|-------|---------------|-------------|
| Critical error rate | 15 min | Director |
| High error rate | 1 hour | Manager |
| Conversion drop | 30 min | Director |
| Revenue drop | 30 min | Director |
| Public flow outage | 15 min | Director |

## Handling Post-Launch Breach

### If Guardrail Breached

1. **Assess severity**
   - Critical: Immediate escalation
   - High: Urgent attention
   - Medium: Monitor closely

2. **Execute response**
   - Review logs
   - Identify root cause
   - Implement fix or rollback

3. **Communicate**
   - Notify stakeholders
   - Update status
   - Document incident

### Rollback Decision

Consider rollback if:
- Error rate >10%
- Critical functionality broken
- Revenue impact >30%
- Security issue discovered

## Commands Reference

```bash
# Run launch closure
npm run launch:closure

# Build watch plan
npm run launch:watch-plan

# Check go/no-go status
npm run launch:go-no-go

# Review closure report
npm run launch:report
```

## Appendix: API Quick Reference

### Run Closure
```
POST /internal/launch/readiness/run
{
  "launchKey": "launch-20240320",
  "createdBy": "platform-team"
}
```

### Get Decision
```
GET /internal/launch/decision
```

### Create Sign-off
```
POST /internal/launch/signoffs
{
  "signoffArea": "product_quality",
  "actorId": "john",
  "actorRole": "product-lead"
}
```

### Complete Sign-off
```
POST /internal/launch/signoffs/:id/complete
{
  "status": "approved"
}
```

### Build Watch Plan
```
POST /internal/launch/watch-plan/build
{
  "launchKey": "launch-20240320",
  "watchWindowHours": 168
}
```
