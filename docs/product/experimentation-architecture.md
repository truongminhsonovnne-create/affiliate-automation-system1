# Experimentation Architecture

## Overview

Production-grade experimentation framework for safe A/B testing and tuning controls.

## Core Components

### 1. Experiment Model
- **Definition**: Experiments define variants, targeting, rollout %
- **Types**: ranking, presentation, copy, fallback, CTA, hybrid
- **Surfaces**: paste_link, voucher_hero, no_match_fallback, growth_shop, growth_category

### 2. Assignment System
- **Deterministic**: Hash-based, stable assignments
- **Rollout %**: Gradual rollout support
- **Targeting**: Environment, surface, platform rules

### 3. Exposure/Outcome Tracking
- **Exposures**: Render, action, click, copy
- **Outcomes**: copy_success, copy_failure, open_shopee, no_match, resolution_error

### 4. Tuning Controls
- **No-code tuning**: Ranking weights, thresholds, counts
- **Validation**: Range, enum, schema validation
- **Environment rules**: Different values per environment

### 5. Rollout Safety
- **Guardrails**: Error rate, no-match rate, latency, conversion
- **Kill switches**: Fast disable capability
- **Audit trail**: All changes logged

## Data Flow

```
User Request → Subject Resolution → Targeting Check → Variant Assignment
    ↓
Experiment Context → Ranking/Presentation → Response
    ↓
Exposure Recording ← Outcomes Recording
    ↓
Analysis → Decision Support → Human Review
```

## Integration Points

### Public Flow
- Experiment context resolved per-request
- Variants applied to ranking/presentation
- Outcomes recorded post-action

### Voucher Engine
- Ranking experiments affect scoring
- Tuning controls modify weights
- Fallback experiments modify no-match handling

## Safe Rollout Principles

1. **Never auto-promote**: All changes require human approval
2. **Guardrails first**: Metrics must stay within bounds
3. **Gradual rollout**: Start small, scale up
4. **Fast rollback**: Kill switches available
5. **Full audit**: Every change logged
