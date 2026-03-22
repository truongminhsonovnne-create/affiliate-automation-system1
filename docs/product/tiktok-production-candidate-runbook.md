# TikTok Shop Production Candidate Runbook

## Overview

This runbook guides product, engineering, and leadership through the TikTok Shop production candidate review process.

## Prerequisites

Before running a production candidate review, ensure:
- TikTok Shop preview intelligence is collecting data
- TikTok Shop acquisition pipeline is operational
- TikTok Shop domain documentation is complete
- Governance review has been initiated

## Running the Review

### CLI Command

```bash
npx tsx src/scripts/runTikTokProductionCandidateReview.ts tiktok_shop
```

### Programmatic

```typescript
import { runPlatformProductionCandidateReview } from './platform/enablement/service/platformEnablementService';

const result = await runPlatformProductionCandidateReview({
  platformKey: 'tiktok_shop',
  from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  to: new Date(),
  createdBy: 'your-user-id',
});
```

## Understanding the Output

### Status Meanings

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `not_ready` | Platform not ready for production | Address fundamentals |
| `hold` | Platform should pause | Resolve high-severity issues |
| `proceed_cautiously` | Can proceed with monitoring | Set up enhanced monitoring |
| `production_candidate` | Ready for production planning | Plan production rollout |
| `production_candidate_with_conditions` | Ready with caveats | Satisfy conditions |
| `rollback_to_preview_only` | Must revert to preview | Immediate action required |

### Score Interpretation

| Score Range | Interpretation |
|-------------|----------------|
| 75-100% | Production candidate ready |
| 55-74% | Can proceed with conditions |
| 40-54% | Hold and address issues |
| 0-39% | Not ready |

### Dimension Scores

| Dimension | Threshold | Weight |
|----------|-----------|--------|
| Domain Maturity | ≥70% | 10% |
| Data Foundation | ≥65% | 15% |
| Acquisition Stability | ≥60% | 15% |
| Sandbox Quality | ≥60% | 10% |
| Preview Usefulness | ≥65% | 12% |
| Preview Stability | ≥65% | 10% |
| Commercial Readiness | ≥60% | 10% |
| Governance Safety | ≥80% | 10% |
| Remediation Load | ≤50% (inverted) | 5% |
| Operator Readiness | ≥60% | 3% |

## Decision Criteria

### When to Mark NOT READY

Mark TikTok Shop as `not_ready` when:
- Overall score <40%
- Governance safety score <80%
- Critical blockers present
- Data foundation not ready

### When to Mark HOLD

Mark TikTok Shop as `hold` when:
- Overall score 40-54%
- High-severity blockers present
- Preview stability <65%
- Preview usefulness <65%

### When to Mark PROCEED CAUTIOUSLY

Mark TikTok Shop as `proceed_cautiously` when:
- Overall score 55-74%
- No critical blockers
- Governance approved
- Enhanced monitoring planned

### When to Mark PRODUCTION CANDIDATE

Mark TikTok Shop as `production_candidate` when:
- Overall score ≥75%
- Governance safety ≥80%
- Preview stability ≥65%
- Preview usefulness ≥65%
- No critical blockers

## Reading Blockers

### Critical Blockers

Critical blockers MUST be resolved before any production decision:

**Examples:**
- "Insufficient Data Foundation" - Data models not ready
- "Governance Not Approved" - Compliance not cleared
- "Critical Preview Instability" - Preview crashes often

**Resolution:** Address immediately, then re-run review.

### High Blockers

High blockers SHOULD be resolved before production candidate:

**Examples:**
- "Preview Not Stable" - Stability below threshold
- "Preview Not Useful" - Users can't benefit
- "Operator Team Not Ready" - Support not prepared

**Resolution:** Address before production, monitor closely.

### Medium/Low Blockers

These are recommendations, not blockers:

**Examples:**
- "Domain Knowledge Could Be Improved" - More documentation helpful
- "Commercial Readiness Partial" - Monetization can improve

**Resolution:** Address in production planning phase.

## Reading Conditions

### Required Conditions

Conditions marked with `required: true` must be satisfied:

**Examples:**
- "Obtain Explicit Governance Approval" - Governance must sign off
- "Enable Enhanced Monitoring" - Dashboards must exist

**Satisfaction:** Mark as satisfied in the system after completion.

### Optional Conditions

Conditions without `required: true` are recommendations:

**Examples:**
- "Improve Preview Stability" - Would help but not blocking

**Satisfaction:** Can be satisfied or waived.

## Decision Support

The system provides decision support including:

1. **Summary**: One-line recommendation
2. **Tradeoffs**: What you gain vs. what you lose
3. **Evidence**: What data supports the decision
4. **Next Steps**: Actionable items

## Integration Points

### Release Readiness

The decision feeds into release gates:
- Approved → Release can proceed
- Conditional → Release with conditions
- Rejected → Release blocked

### Product Ops

The system generates follow-up tasks:
- Blocker resolution assignments
- Condition satisfaction tracking
- Due date management

### Founder Cockpit

Strategic decision inputs:
- Risk assessment
- Timeline recommendations
- Resource requirements

## Rollback Procedure

If TikTok Shop needs to rollback:

1. Run: `proceed_cautiously` or `rollback_to_preview_only`
2. Document rationale in decision
3. Update stage history
4. Notify stakeholders
5. Monitor for issues

## Re-Review Schedule

| Scenario | When to Re-Review |
|----------|-------------------|
| After blocker resolution | Immediately |
| After significant changes | Within 7 days |
| Quarterly baseline | Every 90 days |
| Post-production issues | Immediately |

## Troubleshooting

### No Evidence Available

If evidence collection fails:
1. Check service logs
2. Verify database connectivity
3. Ensure required tables exist
4. Run data collection manually

### Conflicting Scores

If dimensions conflict:
1. Review each dimension individually
2. Weight by criticality
3. Prioritize governance/safety
4. Make judgment call if needed

### Decision Disagreement

If team disagrees with system:
1. Review evidence quality
2. Check thresholds alignment
3. Discuss edge cases
4. Override with documented rationale

---

*Runbook Version: 1.0*
*Last Updated: 2024*
