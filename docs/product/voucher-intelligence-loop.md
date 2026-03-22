# Voucher Intelligence Loop Architecture

## Overview

This document describes the voucher intelligence improvement loop - a system that learns from user outcomes to continuously improve voucher ranking and matching quality.

## Core Philosophy

**The goal is NOT to maximize metrics, but to maximize user usefulness.**

- ✅ Improve correct voucher delivery
- ✅ Reduce useless no-match cases
- ✅ Build trust through accurate matching
- ✅ Make the tool genuinely helpful

**We reject:**
- ❌ Optimizing for vanity metrics
- ❌ Dark patterns to increase clicks
- ❌ Spamming users with tracking
- ❌ Manipulating user behavior

## Architecture Layers

### 1. Event Collection Layer (`/events`)

```
src/voucherIntelligence/events/
├── publicOutcomeEventModel.ts    # Event type definitions & builders
└── publicOutcomeRecorder.ts       # Signal recording with buffering
```

**Purpose:** Capture user interaction signals from the public flow.

**Events Captured:**
- `resolution_viewed` - User saw resolution result
- `best_voucher_viewed` - User viewed best voucher
- `candidate_viewed` - User viewed candidate voucher
- `voucher_copied` - User copied voucher code
- `voucher_copy_failed` - Copy failed
- `open_shopee_clicked` - User opened Shopee
- `no_match_viewed` - User saw no-match result
- `fallback_clicked` - User used fallback option

**Privacy Principles:**
- No PII collection
- Session-based (not persistent IDs)
- Minimal data needed for quality improvement

### 2. Aggregation Layer (`/aggregation`)

```
src/voucherIntelligence/aggregation/
├── outcomeAggregationService.ts     # Signal aggregation
└── behaviorPatternAnalyzer.ts     # Pattern detection
```

**Purpose:** Transform raw signals into analyzable aggregates.

**Aggregations:**
- View counts
- Copy success/failure rates
- Open Shopee click rates
- Best vs candidate selection divergence
- No-match patterns
- Growth surface attribution

### 3. Ranking Feedback Layer (`/ranking`)

```
src/voucherIntelligence/ranking/
├── rankingFeedbackBuilder.ts           # Convert signals to feedback
├── rankingOptimizationAnalyzer.ts      # Analyze optimization needs
└── weightTuningAdvisor.ts             # Suggest weight adjustments
```

**Purpose:** Convert outcomes into ranking improvements.

**Feedback Types:**
- Positive: Voucher performs well (high copy success, user selects)
- Negative: Voucher underperforms (low copy, users avoid)
- Neutral: Mixed signals

**Key Insight:** Single events are NOT truth. We use:
- Weighted signals (copy > open > view)
- Confidence based on sample size
- Divergence detection

### 4. Insight Generation Layer (`/insights`)

```
src/voucherIntelligence/insights/
├── optimizationInsightBuilder.ts   # Build insights
└── insightPrioritizer.ts          # Rank by priority
```

**Purpose:** Generate actionable insights from feedback.

**Insight Types:**
- `best_voucher_underperformance` - Best not being selected
- `candidate_outperforming_best` - Candidates better than best
- `no_match_coverage_gap` - Coverage gaps
- `ranking_divergence` - Large position gaps
- `copy_failure_pattern` - High failure rates

### 5. No-Match Analysis (`/noMatch`)

```
src/voucherIntelligence/noMatch/
└── noMatchImprovementAnalyzer.ts
```

**Purpose:** Understand why no-match happens.

**Root Causes:**
- Invalid URL
- Parser weakness
- Context weakness (not enough product info)
- Catalog coverage (no vouchers available)
- Rules too strict
- Poor fallback ranking

### 6. Explainability (`/explainability`)

```
src/voucherIntelligence/explainability/
└── explainabilityOutcomeAnalyzer.ts
```

**Purpose:** Ensure explanations help conversion.

**Checks:**
- No engagement despite views → confusing explanation
- High copy failure → misleading terms
- Many opens but few copies → not compelling explanation

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                  User Interaction                        │
│  (view, copy, open, no-match)                        │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Event Recording                            │
│  - Buffer & batch                                     │
│  - Privacy-safe                                       │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│               Signal Aggregation                        │
│  - Per-voucher metrics                                │
│  - Time windows                                       │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Ranking Feedback                           │
│  - Quality scoring                                    │
│  - Weight adjustments                                 │
│  - Divergence detection                               │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Insight Generation                         │
│  - Pattern detection                                  │
│  - Prioritization                                    │
│  - Recommendations                                    │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Human Review (Safe Loop)                  │
│  - Operators review insights                           │
│  - Approve/reject changes                            │
│  - Never auto-apply                                   │
└─────────────────────────────────────────────────────────┘
```

## Safe Feedback Loop Principles

### What Happens Automatically
- ✅ Signal collection
- ✅ Aggregation
- ✅ Insight generation
- ✅ Report creation

### What Requires Human Review
- ❌ Weight changes (must be approved)
- ❌ Rule modifications (must be approved)
- ❌ Catalog updates (must be approved)

### Why This Matters

We don't auto-apply because:
1. User behavior has noise - one user ≠ truth
2. Correlation ≠ causation
3. Short-term metrics can mislead
4. System changes need audit trails

## Database Schema

### Main Tables

1. **voucher_resolution_outcomes** - Each resolution request
2. **voucher_user_signal_events** - Individual interactions
3. **voucher_ranking_feedback** - Aggregated feedback
4. **voucher_ranking_snapshots** - Policy history
5. **voucher_optimization_insights** - Generated insights

See migration `007_create_voucher_intelligence_system.sql` for full schema.

## Analysis Windows

| Window | Use Case |
|--------|----------|
| 24 hours | Real-time monitoring |
| 7 days | Trend analysis |
| 30 days | Historical patterns |
| 90 days | Strategic planning |

## Quality Signals

### Signal Weights (for quality scoring)

| Signal | Weight | Rationale |
|--------|--------|-----------|
| Voucher copied | 1.0 | Direct intent |
| Copy failed | 0.8 | Negative signal |
| Open Shopee | 0.5 | Interest, not commitment |
| Viewed | 0.1-0.15 | Minimal signal |
| Exact match confirmed | 1.5 | Strong positive |

### Confidence Levels

| Sample Size | Confidence |
|-------------|------------|
| < 10 | Low |
| 10-30 | Medium |
| > 30 | High |

## Integration Points

### Public Flow Integration

```typescript
// After resolution
const outcomeId = await recordVoucherResolutionOutcome({
  platform: Platform.SHOPEE,
  normalizedUrl: url,
  bestVoucherId: bestVoucher?.id,
  shownVoucherIds: shown.map(v => v.id),
  growthSurfaceType: 'shop',
  attributionContext: {...}
});

// After user action
await recordVoucherCopied(outcomeId, voucherId, sessionId);
await recordOpenShopeeClicked(outcomeId, voucherId, sessionId);
```

### Analysis Scheduling

Run intelligence analysis periodically:
```bash
# Every 6 hours
npm run voucher:intelligence:analyze -- --hours 24
```

## Extensibility

The system is designed to support future:

1. **A/B Testing Infrastructure** - Experiments tracked via snapshots
2. **Rule Tuning Dashboard** - UI for reviewing insights
3. **Quality Review Workflows** - Approval workflows
4. **ML Ranking Models** - Signals ready for model training
5. **Recommendation Engines** - Behavior patterns

## Summary

This system learns from user outcomes WITHOUT manipulating users.

- Signals tell us what users do
- Analysis finds patterns
- Insights suggest improvements
- Humans decide what to change
- Snapshots ensure auditability

The loop is closed through human oversight, not automation.
