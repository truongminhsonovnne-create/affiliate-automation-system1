# TikTok Shop Production Rollout Runbook

## Overview

This runbook guides the team through TikTok Shop production rollout execution.

## Prerequisites

Before starting rollout:
- [ ] Production candidate review completed
- [ ] Governance approval obtained
- [ ] Rollout plan created
- [ ] Team onboarded
- [ ] Monitoring configured
- [ ] Rollback plan documented

## Running Rollout

### 1. Build Rollout Plan

```bash
npx tsx src/scripts/runTikTokRolloutPlanBuild.ts tiktok_shop full_production
```

### 2. Start Rollout

```bash
# Start internal_only stage
curl -X POST /internal/platform-rollouts/tiktok_shop/start
```

## Understanding Rollout Stages

### Stage 1: Internal Only
- **Traffic**: 0%
- **Duration**: Minimum 3 days
- **Purpose**: Team testing, monitoring validation
- **Checkpoint**: Support state stable

### Stage 2: Limited Production Candidate
- **Traffic**: 1%
- **Duration**: Minimum 5 days
- **Purpose**: Early cohort testing
- **Checkpoint**: Resolution quality ≥75%

### Stage 3: Limited Production
- **Traffic**: 5%
- **Duration**: Minimum 7 days
- **Purpose**: Limited public exposure
- **Checkpoints**: All guardrails pass

### Stage 4: Controlled Ramp
- **Traffic**: 15%
- **Duration**: Minimum 7 days
- **Purpose**: Controlled growth
- **Checkpoints**: Monetization enabled

### Stage 5: Broader Ramp
- **Traffic**: 40%
- **Duration**: Minimum 7 days
- **Purpose**: Broader exposure

### Stage 6: Full Production
- **Traffic**: 100%
- **Duration**: Ongoing
- **Purpose**: Full production

## Checkpoint Evaluation

### Running Checkpoint Review

```bash
npx tsx src/scripts/runTikTokRolloutExecutionCycle.ts tiktok_shop limited_production
```

### Checkpoint Criteria

| Checkpoint | Threshold | Action if Fail |
|------------|-----------|----------------|
| Support State Stability | ≥85% | Rollback |
| Resolution Quality | ≥75% | Hold |
| No-Match Rate | <10% | Investigate |
| Latency P50 | <500ms | Investigate |
| Error Rate | <2% | Rollback |
| Governance | 0 blockers | Cannot proceed |

## Decision Criteria

### When to Proceed
- All critical checkpoints pass
- Guardrail score ≥75%
- No critical blockers

### When to Hold
- Checkpoint failures
- Guardrail score 50-74%
- Warnings accumulating

### When to Rollback
- Guardrail score <40%
- Multiple critical failures
- Governance withdrawn

## Rollback Procedures

### Rollback to Previous Stage

```bash
curl -X POST /internal/platform-rollouts/tiktok_shop/rollback/previous-stage
```

### Rollback to Preview Only

```bash
curl -X POST /internal/platform-rollouts/tiktok_shop/rollback/preview-only
```

### Rollback Monetization Only

```bash
curl -X POST /internal/platform-rollouts/tiktok_shop/rollback/monetization
```

## Post-Enablement Monitoring

### Daily Health Check

```bash
npx tsx src/scripts/runTikTokPostEnablementReview.ts tiktok_shop
```

### Health Score Thresholds

| Score | Status | Action |
|-------|--------|--------|
| ≥75% | Healthy | Continue |
| 60-74% | Warning | Monitor closely |
| 40-59% | Degraded | Consider hold |
| <40% | Critical | Initiate rollback |

### Drift Detection

Drift is detected when:
- Quality drops >15% from baseline
- Latency increases >25%
- Error rate increases >30%

## Troubleshooting

### High No-Match Rate
1. Check acquisition pipeline
2. Verify data freshness
3. Review platform changes

### Latency Increase
1. Check infrastructure
2. Review query performance
3. Scale resources if needed

### Error Rate Spike
1. Identify error patterns
2. Check platform status
3. Consider rollback if severe

## Escalation

### Notify
- Engineering Lead
- Product Manager
- Operations

### Document
- Timeline
- Actions taken
- Root cause
- Resolution

---

*Runbook Version: 1.0*
