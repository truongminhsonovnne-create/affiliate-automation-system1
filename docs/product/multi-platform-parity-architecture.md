# Multi-Platform Parity Architecture

## Overview

This document describes the architecture of the Platform Parity Hardening Layer, which provides unified operational, BI, and governance surfaces for managing Shopee and TikTok Shop platforms.

## Core Principles

### Honest Parity

The system explicitly distinguishes between:

- **Full Parity**: Both platforms have identical capabilities
- **Operational Parity**: Both platforms are functional but may have minor differences
- **Reporting Parity**: Both platforms report metrics, but definitions may differ
- **Governance Parity**: Both platforms follow the same governance processes
- **Partial Parity**: Significant differences exist between platforms
- **Exception Allowed**: Differences are intentional and documented
- **Hardening Required**: Significant gaps that need remediation

### No Fake Parity

The system never hides real differences. When platforms differ, this is explicitly tracked through:

- Platform exception registry
- Gap detection and tracking
- Drift analysis
- Explicit parity level classification

## Architecture Components

### 1. Database Layer

The persistence layer consists of:

- `platform_parity_snapshots`: Periodic snapshots of parity state
- `platform_parity_gaps`: Tracked gaps between platforms
- `unified_ops_views`: Configuration for unified surfaces
- `platform_exception_registry`: Intentional platform differences
- `unified_surface_audits`: Audit trail for changes
- `parity_backlog_items`: Work items from gaps

### 2. Domain Model

The `platformParityModel` calculates parity levels based on:

- Platform capabilities
- Open gaps
- Active exceptions
- Cross-platform metrics

### 3. Gap Detection

The `platformParityGapDetector` identifies gaps in:

- Operational capabilities
- BI/reporting capabilities
- Governance processes
- Commercial tracking

### 4. Comparison Service

The `crossPlatformComparisonService` builds comparisons across:

- Quality metrics
- Commercial performance
- Operational load
- Governance risk

### 5. Unified Surfaces

Three unified surface builders create consistent views:

- **UnifiedOpsViewBuilder**: Product ops, commercial ops, growth ops, release ops
- **UnifiedBiSurfaceBuilder**: Executive, operator, founder surfaces
- **UnifiedGovernanceSurfaceBuilder**: Release readiness, enablement risk, backlog pressure

### 6. Decision Support

The `parityDecisionSupportService` provides:

- Hardening recommendations
- Gap prioritization
- Unification vs exception decisions

### 7. Backlog Management

The `parityBacklogService` manages work items from detected gaps:

- Automatic backlog creation
- Priority scoring
- Status tracking

## Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Data Sources   │────▶│  Gap Detection   │────▶│   Repositories  │
│  - Shopee       │     │  - Operational   │     │  - Gaps         │
│  - TikTok       │     │  - BI            │     │  - Exceptions   │
│                 │     │  - Governance    │     │  - Snapshots    │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                         │
                        ┌──────────────────┐              │
                        │  Decision Support │◀─────────────┤
                        │  - Recommendations│              │
                        │  - Gap Priorities │              │
                        └────────┬─────────┘              │
                                 │                       │
        ┌────────────────────────┼────────────────────────┤
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Unified Ops     │    │ Unified BI      │    │ Unified Gov     │
│ - Overview      │    │ - Executive     │    │ - Overview      │
│ - Product       │    │ - Operator      │    │ - Release       │
│ - Commercial    │    │ - Founder       │    │ - Risks         │
│ - Growth        │    │ - Comparison    │    │ - Backlog       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## API Endpoints

### Platform Parity

- `GET /internal/platform-parity/summary`
- `GET /internal/platform-parity/gaps`
- `GET /internal/platform-parity/comparisons`
- `POST /internal/platform-parity/hardening/run`

### Unified Ops

- `GET /internal/unified-ops/overview`
- `GET /internal/unified-ops/product`
- `GET /internal/unified-ops/commercial`
- `GET /internal/unified-ops/release`
- `GET /internal/unified-ops/growth`

### Unified BI

- `GET /internal/unified-bi/executive`
- `GET /internal/unified-bi/operator`
- `GET /internal/unified-bi/founder`
- `GET /internal/unified-bi/comparison`

### Unified Governance

- `GET /internal/unified-governance/overview`
- `GET /internal/unified-governance/release-readiness`
- `GET /internal/unified-governance/enablement-risks`
- `GET /internal/unified-governance/backlog-pressure`

## Extensibility

The architecture supports:

1. **Additional platforms**: Add new platform keys and capability definitions
2. **New scopes**: Extend `PlatformParityScope` enum
3. **Custom metrics**: Add to `CROSS_PLATFORM_METRICS` constants
4. **New surfaces**: Extend unified view builders
5. **Custom comparisons**: Add comparison service methods

## Observability

The system includes:

- Metrics counters for all major operations
- Structured events for auditing
- Correlation IDs for tracing
- Error tracking

## Security

- All endpoints require authentication (internal)
- Audit trail for all changes
- Role-based access considerations
- Input validation on all endpoints
