# Platform Parity Runbook

## Overview

This runbook provides operational guidance for managing the Platform Parity Hardening Layer.

## Daily Operations

### Running the Parity Hardening Cycle

```bash
npm run platform:parity:hardening
```

This will:
1. Collect cross-platform metrics
2. Detect new parity gaps
3. Build unified surfaces
4. Generate decision support
5. Create/update parity backlog

### Running Unified Surface Build

```bash
npm run platform:surfaces:build
```

This will build all unified surfaces without gap detection.

## Reading Parity Summary

### Understanding Overall Parity Level

The overall parity level is one of:

| Level | Meaning | Action |
|-------|---------|--------|
| `full_parity` | Platforms are functionally equivalent | Continue monitoring |
| `operational_parity` | Minor differences exist | Monitor closely |
| `reporting_parity` | Metrics report differently | Align definitions |
| `governance_parity` | Governance processes differ | Review processes |
| `partial_parity` | Significant differences | Prioritize remediation |
| `hardening_required` | Critical gaps exist | Immediate action required |

### Understanding Gap Severity

| Severity | Description | SLA |
|----------|--------------|-----|
| `critical` | System down or major feature broken | 24 hours |
| `high` | Significant impact on operations | 3 days |
| `medium` | Moderate impact | 1 week |
| `low` | Minor impact | 2 weeks |
| `info` | Informational | Backlog |

## When to Act

### Gap Acceptance Criteria

A gap can be accepted as an exception when:

1. **Valid business reason**: Gap reflects intentional business decision
2. **Documented rationale**: Exception is registered with clear reason
3. **Time-bound**: Exception has review-by date
4. **Reviewed periodically**: Exception is re-evaluated regularly

### Gap Remediation Criteria

A gap must be remediated when:

1. **Critical severity**: Immediate impact on operations
2. **Growing drift**: Gap is widening between platforms
3. **Customer impact**: Gap affects user experience
4. **Governance violation**: Gap breaches compliance requirements

### Surface Unification Criteria

Unify a surface when:

1. **Common need**: Both platforms need same information
2. **Consistent metrics**: Metrics have same meaning
3. **Decision benefit**: Unification improves decision-making
4. **No information loss**: Abstraction doesn't hide important differences

## Maintaining Platform-Specific Behavior

Keep platform-specific behavior when:

1. **Semantic difference**: Behavior is genuinely different
2. **User expectation**: Users expect different experience
3. **Capability gap**: One platform lacks feature
4. **Business context**: Difference reflects business decision

## Managing the Parity Backlog

### Viewing Backlog

```bash
# Get all backlog items
npm run platform:backlog:list

# Get items by priority
npm run platform:backlog:list -- --priority=high

# Get items by platform
npm run platform:backlist:list -- --platform=tiktok_shop
```

### Updating Backlog Items

1. Update status: `PATCH /internal/platform-parity/gaps/:id/status`
2. Add assignee: Include in update payload
3. Set due date: Include in update payload

### Backlog Prioritization

Priority scores are calculated from:
- Gap severity (40%)
- Risk if ignored (30%)
- Effort to fix (15%)
- Impact across platforms (15%)

## Exception Management

### Registering an Exception

```bash
POST /internal/platform-parity/exceptions
{
  "platformKey": "tiktok_shop",
  "exceptionArea": "consumer_experience",
  "rationale": "TikTok users expect video-first experience",
  "exceptionPayload": {
    "originalReason": "platform_specific_behavior"
  }
}
```

### Reviewing Exceptions

Exceptions older than 90 days must be reviewed:
- Still applicable? Continue
- No longer applicable? Deprecate
- Needs change? Update and re-review

### Deprecating Exceptions

When an exception is no longer needed:
1. Mark as deprecated
2. Set resolved date
3. Exception becomes read-only

## Troubleshooting

### High Gap Count

**Symptom**: More than 10 open gaps

**Investigation**:
1. Check gap ages - are old gaps not being resolved?
2. Review backlog items - are they being worked on?
3. Check exception registry - are valid exceptions missing?

**Resolution**:
- Create backlog items for unassigned gaps
- Prioritize critical/high gaps
- Register valid exceptions

### Parity Level Dropped

**Symptom**: Overall parity level decreased

**Investigation**:
1. Compare current vs previous snapshot
2. Identify new gaps
3. Check if new platform features were added

**Resolution**:
- Address critical gaps immediately
- Register intentional differences as exceptions
- Plan remediation for other gaps

### Surface Discrepancies

**Symptom**: Unified surface doesn't match individual platform data

**Investigation**:
1. Verify data sources are correct
2. Check metric definitions
3. Review calculation logic

**Resolution**:
- Fix data source configuration
- Align metric definitions
- Update calculation logic if needed

## Escalation

### When to Escalate

Escalate to platform leadership when:
- Critical gap unresolved after 24 hours
- More than 3 critical gaps open
- Parity level is `hardening_required`
- Exception review overdue by more than 30 days

### Escalation Path

1. **Team Lead**: Operational issues
2. **Engineering Manager**: Technical decisions
3. **Director**: Strategic decisions
4. **VP**: Business decisions

## Metrics and Monitoring

### Key Metrics to Watch

| Metric | Target | Alert |
|--------|--------|-------|
| Open critical gaps | 0 | > 0 |
| Open high gaps | ≤ 2 | > 2 |
| Avg gap resolution time | ≤ 7 days | > 14 days |
| Exception review overdue | 0 | > 0 |
| Parity level | ≥ operational_parity | < reporting_parity |

### Dashboard Access

Access parity dashboards at:
- Ops: `/internal/unified-ops/overview`
- BI: `/internal/unified-bi/executive`
- Governance: `/internal/unified-governance/overview`

## Appendix: CLI Commands

```bash
# Run full hardening cycle
npm run platform:parity:hardening

# Build surfaces only
npm run platform:surfaces:build -- --ops

# Get parity summary
npm run platform:parity:summary

# List gaps
npm run platform:gaps:list -- --status=open

# List exceptions
npm run platform:exceptions:list
```

## Appendix: API Quick Reference

### Get Parity Summary
```
GET /internal/platform-parity/summary
```

### Get Gaps
```
GET /internal/platform-parity/gaps?status=open&severity=critical
```

### Run Hardening Cycle
```
POST /internal/platform-parity/hardening/run
{
  "shopeeMetrics": {...},
  "tiktokMetrics": {...}
}
```

### Update Gap Status
```
PATCH /internal/platform-parity/gaps/:id/status
{
  "status": "in_progress"
}
```
