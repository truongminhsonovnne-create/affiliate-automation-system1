# TikTok Shop Preview Intelligence Architecture

## Overview

This document describes the architecture for TikTok Shop Preview Intelligence layer, which provides comprehensive evaluation of preview quality, commercial readiness, and monetization governance.

## Architecture Components

### 1. Data Layer

#### Database Tables
- `tiktok_shop_preview_sessions` - Session tracking
- `tiktok_shop_preview_events` - Event funnel tracking
- `tiktok_shop_preview_quality_reviews` - Quality evaluations
- `tiktok_shop_commercial_readiness_reviews` - Commercial readiness
- `tiktok_shop_preview_click_lineage` - Click attribution lineage
- `tiktok_shop_monetization_governance_actions` - Governance actions
- `tiktok_shop_preview_backlog` - Capability gaps
- `tiktok_shop_preview_funnel_snapshots` - Aggregated snapshots

### 2. Type System

#### Preview Event Types
- `preview_surface_viewed` - User sees preview surface
- `preview_input_submitted` - User submits input
- `preview_resolution_attempted` - Resolution attempted
- `preview_resolution_supported` - Full support outcome
- `preview_resolution_partial` - Partial support outcome
- `preview_resolution_unavailable` - No support outcome
- `preview_candidate_viewed` - User views candidates
- `preview_copy_attempted` - User copies content
- `preview_open_attempted` - User opens external link
- `preview_blocked_by_gate` - Blocked by gate
- `preview_abandoned` - User abandons

### 3. Preview Funnel Model

```
Surface Viewed
    ↓
Input Submitted
    ↓
Resolution Attempted
    ↓
[Supported | Partial | Unavailable]
    ↓
[Candidate Viewed | Copy | Open | Abandon]
```

### 4. Usefulness Model

#### Dimensions
- **Clarity** (25%): How clear is the preview interface?
- **Honest Representation** (30%): Does preview honestly represent support?
- **Outcome Quality** (25%): Are resolution outcomes useful?
- **User Actionability** (20%): Can users take meaningful actions?

#### Thresholds
- Useful: ≥60%
- Needs Improvement: 40-59%
- Poor: <40%

### 5. Stability Model

#### Dimensions
- **Support State Stability**: Consistency of support states
- **Outcome Consistency**: Consistency of resolution outcomes
- **Error Rate**: Rate of errors/unavailable
- **Drift Risk**: Risk of changing support

#### Thresholds
- Stable: ≥70%
- Unstable: 40-69%
- Critical: <40%

### 6. Commercial Readiness Model

#### Dimensions
- Support State Stability (15%)
- Preview Usefulness (20%)
- Click Lineage Completeness (20%)
- Product Context Completeness (15%)
- Governance Readiness (15%)
- Operator Readiness (10%)
- BI Integration Readiness (5%)

#### Status Levels
- `not_ready` - Not ready for any monetization
- `insufficient_evidence` - Need more data
- `proceed_cautiously` - Can proceed with caution
- `ready_for_preview_monetization` - Can enable limited monetization
- `ready_for_production` - Ready for full production

### 7. Monetization Governance

#### Stages
1. `disabled` - No monetization
2. `internal_validation_only` - Internal testing
3. `preview_signal_collection` - Collecting signals
4. `limited_monetization_preview` - Limited public monetization
5. `production_candidate` - Ready for production
6. `production_enabled` - Full production enabled

#### Guardrails
- Preview quality threshold: ≥50%
- Unsupported rate: ≤30%
- Usefulness threshold: ≥50%
- Stability threshold: ≥60%
- Lineage confidence: ≥50%
- Governance score: ≥60%
- Honest representation: ≥60%

### 8. Integration Points

#### Public Flow Integration
- Records preview surface views
- Tracks resolution outcomes
- Captures user interactions (copy/open)

#### Commercial Intelligence Integration
- Provides commercial signals
- Revenue readiness assessment
- Attribution confidence

#### Product Governance Integration
- Release readiness signals
- Risk summary
- Governance integration

#### Founder Cockpit Integration
- Health status
- Expansion signals
- Decision inputs

## Data Flow

```
1. User interacts with preview
        ↓
2. Events recorded in tiktok_shop_preview_events
        ↓
3. Session updated in tiktok_shop_preview_sessions
        ↓
4. Funnel aggregated in tiktokPreviewFunnelAggregator
        ↓
5. Usefulness evaluated in tiktokPreviewUsefulnessEvaluator
        ↓
6. Stability evaluated in tiktokPreviewStabilityEvaluator
        ↓
7. Commercial readiness evaluated
        ↓
8. Guardrails evaluated
        ↓
9. Governance actions created if needed
        ↓
10. BI/Governance/Founder signals emitted
```

## Key Principles

### 1. Preview First
Preview quality always takes precedence over monetization readiness.

### 2. Attribution Readiness First
Never claim full commercial attribution without sufficient lineage confidence.

### 3. Governance First
All monetization enablement must go through governance review.

### 4. Honest UX
Never compromise honest preview semantics for click/conversion optimization.

### 5. Shopee Safe
Never degrade existing Shopee production flow.

## API Endpoints

### Preview Intelligence
- `GET /internal/platforms/tiktok-shop/preview/summary`
- `GET /internal/platforms/tiktok-shop/preview/performance`
- `GET /internal/platforms/tiktok-shop/preview/quality`
- `GET /internal/platforms/tiktok-shop/preview/decision-support`
- `GET /internal/platforms/tiktok-shop/preview/backlog`

### Commercial Readiness
- `GET /internal/platforms/tiktok-shop/commercial-readiness`
- `POST /internal/platforms/tiktok-shop/commercial-readiness/review`
- `GET /internal/platforms/tiktok-shop/preview/click-lineage`

### Monetization Governance
- `GET /internal/platforms/tiktok-shop/monetization/governance`
- `POST /internal/platforms/tiktok-shop/monetization/approve`
- `POST /internal/platforms/tiktok-shop/monetization/hold`
- `POST /internal/platforms/tiktok-shop/monetization/rollback`

## CLI Commands

```bash
# Run preview intelligence cycle
npm run tiktok:preview:intelligence

# Run commercial readiness review
npm run tiktok:preview:commercial-review

# Run monetization governance
npm run tiktok:preview:governance status
npm run tiktok:preview:governance hold "reason"
npm run tiktok:preview:governance approve <stage>
```

## Decision Framework

### When to Hold Monetization
- Blockers exist
- Usefulness score <40%
- Stability score <40%
- Unsupported rate >50%
- Critical governance issues

### When to Proceed Cautiously
- Score 60-79%
- Some warnings
- Limited monetization enabled
- Enhanced monitoring

### When to Proceed to Production
- Score ≥80%
- No blockers
- Stable metrics
- Governance approval
