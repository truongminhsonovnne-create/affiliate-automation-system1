# Platform Production Candidate Architecture

## Overview

This document describes the production-grade architecture for the Platform Production Candidate Review and Multi-Platform Production Enablement Decision System.

## Core Principles

### Evidence-First Decisioning

No production enablement decision is made without comprehensive evidence from multiple subsystems. The system collects evidence across:

- **Domain Maturity**: Platform identification, domain understanding, documentation
- **Data Foundation**: Data models, schema, storage, ETL pipelines
- **Acquisition**: Pipeline existence, health, error rates, throughput
- **Preview Quality**: Usefulness, stability, user feedback
- **Commercial Readiness**: Attribution, monetization, lineage confidence
- **Governance**: Compliance, security, privacy, legal clearance
- **Remediation**: Open blockers, backlog pressure
- **Operator Readiness**: Team onboarding, runbooks, monitoring

### Governance-First Safety

The system enforces strict governance gates:

- **No production without governance approval** - Governance safety score must be ≥80%
- **No production with critical blockers** - Zero critical blockers allowed
- **No production without evidence** - All dimensions must have evidence

### Condition-Aware Approvals

Platforms can proceed to production with explicit conditions:

- **Conditional production candidate**: When overall score ≥55% but <75%
- **Required conditions**: Governance approval, monitoring enabled
- **Expiry tracking**: Conditions auto-expire after configurable days

### Rollback Path Always Exists

Every enablement decision includes a clear rollback path:

- **production_candidate** → can rollback to **limited_public_preview**
- **production_enabled** → can rollback to **limited_public_preview**
- Emergency rollback triggers audit trail

## Architecture Components

### 1. Evidence Collection Layer

```
Evidence Collector
├── Domain Evidence Collector
├── Data Foundation Evidence Collector
├── Acquisition Evidence Collector
├── Preview Evidence Collector (TikTok-specific)
├── Commercial Evidence Collector
├── Governance Evidence Collector
├── Remediation Evidence Collector
└── Operator Evidence Collector
```

Each collector:
- Pulls from existing subsystem services
- Normalizes to common evidence model
- Includes confidence scoring
- Marks staleness

### 2. Evidence Normalization

The normalizer transforms raw evidence into scoring-ready format:

- Maps platform-specific metrics to common dimensions
- Applies weights per dimension
- Calculates confidence scores
- Identifies evidence gaps

### 3. Production Candidate Evaluator

Core evaluation engine:

```
Evaluator
├── Score Calculator (weighted dimensions)
├── Status Classifier (not_ready → hold → cautiously → candidate)
├── Blocker Detector
└── Warning Detector
```

Decision logic:
- **NOT_READY**: Score ≤39 OR governance not approved
- **HOLD**: Score <55 OR critical blockers present
- **PROCEED_CAUTIOUSLY**: Score ≥55 but <75
- **PRODUCTION_CANDIDATE**: Score ≥75 AND governance ≥80% AND no critical blockers
- **WITH_CONDITIONS**: Same as candidate, but explicit conditions required

### 4. Blocker & Condition Classification

**Blockers** - Issues that prevent production:
- Domain gaps
- Data foundation gaps
- Acquisition failures
- Resolution failures
- Preview instability
- Commercial incompleteness
- Governance risks
- Remediation overload

**Conditions** - Requirements for conditional approval:
- Domain maturity requirements
- Data quality requirements
- Stability thresholds
- Monitoring requirements
- Governance approvals

### 5. Decision Service

Manages enablement decisions:

- **not_ready** → Platform disabled
- **hold** → Maintain current stage
- **proceed_cautiously** → Limited rollout with monitoring
- **production_candidate** → Ready for production planning
- **production_candidate_with_conditions** → Ready with explicit conditions
- **rollback_to_preview_only** → Revert to preview-only

### 6. Repository Layer

Production-grade persistence:

- `platform_production_candidate_reviews` - Review records
- `platform_enablement_decisions` - Decision history
- `platform_enablement_conditions` - Active conditions
- `platform_enablement_blockers` - Active blockers
- `platform_enablement_audits` - Full audit trail
- `platform_enablement_stage_history` - Stage transitions

### 7. Integration Layer

Connects to existing systems:

- **TikTok Preview Intelligence** - Pulls usefulness/stability scores
- **Commercial Readiness** - Pulls attribution/monetization status
- **Governance** - Pulls compliance status
- **Release Readiness** - Outputs release gate decisions
- **Product Ops** - Outputs follow-up tasks
- **Founder Cockpit** - Outputs strategic decision inputs

## Database Schema

### Platform Production Candidate Reviews

```sql
platform_production_candidate_reviews
├── id (UUID)
├── platform_key (TEXT)
├── review_status (pending|in_progress|completed|cancelled)
├── candidate_status (not_ready|hold|proceed_cautiously|production_candidate|...)
├── readiness_score (NUMERIC)
├── domain_maturity_score (NUMERIC)
├── data_foundational_score (NUMERIC)
├── acquisition_stability_score (NUMERIC)
├── preview_usefulness_score (NUMERIC)
├── preview_stability_score (NUMERIC)
├── commercial_readiness_score (NUMERIC)
├── governance_safety_score (NUMERIC)
├── blocker_count (INTEGER)
├── warning_count (INTEGER)
├── review_payload (JSONB)
└── created_at (TIMESTAMPTZ)
```

### Platform Enablement Decisions

```sql
platform_enablement_decisions
├── id (UUID)
├── platform_key (TEXT)
├── decision_type (not_ready|hold|proceed_cautiously|...)
├── decision_status (pending|approved|executed|...)
├── target_stage (disabled|preview|production_candidate|...)
├── rationale (TEXT)
├── actor_id (TEXT)
├── review_id (UUID, FK)
└── created_at (TIMESTAMPTZ)
```

## Decision Flow

```
1. Collect Evidence
   └─> Pull from all subsystems

2. Normalize Evidence
   └─> Convert to scoring model

3. Calculate Scores
   └─> Apply dimension weights
   └─> Calculate overall score

4. Classify Status
   └─> not_ready / hold / cautiously / candidate

5. Identify Blockers
   └─> Critical / High / Medium / Low

6. Identify Conditions
   └─> Required / Optional

7. Build Review Pack
   └─> Human-readable summary
   └─> Decision support
   └─> Next steps

8. Persist
   └─> Create review record
   └─> Create blocker records
   └─> Create condition records
   └─> Create audit trail

9. Integrate
   └─> Send to release gates
   └─> Send to Product Ops
   └─> Send to Founder Cockpit
```

## Why This Prevents Unsafe Platform Enablement

### Multiple Evidence Sources

Single points of failure are eliminated by requiring evidence from **8+ subsystems**. A platform can't hide behind one good metric.

### Weighted Scoring

No single dimension dominates. Governance (10%) balances Commercial (10%). Preview quality (22% combined) balances domain maturity (10%).

### Explicit Blockers

Critical and high-severity blockers **must** be resolved before production. The system won't allow "looks good enough" decisions.

### Governance Gate

Governance safety at ≥80% is **required** for production candidate status. No commercial pressure can override safety.

### Condition Tracking

Conditional approvals aren't hand-wavy. Conditions are tracked, expire, and require explicit sign-off.

### Audit Trail

Every decision, blocker resolution, and condition satisfaction is audited. No "who approved this?" moments.

### Rollback Always Available

The system treats production as a **reversible state**, not a point of no return. Rollback paths exist at every stage.

## Shopee Safety

This system **protects** existing Shopee production:

- Shopee remains at `production_enabled` - no re-evaluation
- New platforms start at `disabled` or `not_ready`
- No cross-platform score contamination
- Shopee governance status preserved

---

*Architecture Version: 1.0*
*Last Updated: 2024*
