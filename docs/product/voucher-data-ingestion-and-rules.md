# Voucher Data Ingestion and Rules System

## Overview

This document describes the production-grade voucher data ingestion and rule authoring system for the Affiliate Automation System. The system provides a complete pipeline for ingesting voucher data from multiple sources, normalizing and storing them in a catalog, authoring and managing rules, and evaluating matching quality.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Voucher Data Layer                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │  Ingestion  │  │   Rules     │  │ Evaluation  │  │ Overrides   │      │
│  │   Service   │  │  Authoring  │  │   Service   │  │   Service   │      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │
│         │                 │                 │                 │               │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐      │
│  │  Normalizer │  │  Validator  │  │  Evaluator  │  │  Compiler   │      │
│  │             │  │             │  │             │  │             │      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │
│         │                 │                 │                 │               │
│  ┌──────▼────────────────▼─────────────────▼─────────────────▼──────┐      │
│  │                     Repositories Layer                             │      │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │      │
│  │  │Catalog │ │ Sources │ │  Rules  │ │Evaluations│ │Overrides│  │      │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                     │                                       │
│  ┌─────────────────────────────────▼─────────────────────────────────┐      │
│  │                    Database Layer (Supabase)                     │      │
│  │  voucher_catalog | voucher_catalog_sources | voucher_rule_sets  │      │
│  │  voucher_ingestion_runs | voucher_match_evaluations           │      │
│  └─────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Model

### A. Voucher Catalog Sources

Stores metadata about voucher data sources:

```sql
CREATE TABLE voucher_catalog_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    platform TEXT NOT NULL,
    source_config JSONB NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_synced_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Source Types:**
- `manual`: Hand-entered vouchers
- `import_file`: JSON/CSV file imports
- `api_sync`: External API synchronization
- `partner_feed`: Partner voucher feeds
- `internal`: Internal system vouchers

### B. Voucher Catalog

Main voucher storage table:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| external_id | TEXT | Source-specific ID |
| source_id | UUID | FK to sources |
| code | TEXT | Voucher code |
| title | TEXT | Display title |
| description | TEXT | Description |
| platform | TEXT | Platform (shopee/lazada/tiktok/general) |
| discount_type | TEXT | percentage/fixed_amount/free_shipping |
| discount_value | NUMERIC | Discount amount/percentage |
| min_spend | NUMERIC | Minimum spend requirement |
| max_discount | NUMERIC | Maximum discount cap |
| start_date | TIMESTAMPTZ | Validity start |
| end_date | TIMESTAMPTZ | Validity end |
| is_active | BOOLEAN | Active status |
| scope | TEXT | global/shop/category/product |
| freshness_status | TEXT | fresh/stale/expired/unknown |
| quality_score | NUMERIC | Matching quality score |

### C. Voucher Rule Sets

Standardized rule sets for eligibility and ranking:

```sql
CREATE TABLE voucher_rule_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES voucher_catalog(id),
    rule_version TEXT NOT NULL,
    rule_status TEXT NOT NULL, -- draft/active/archived/superseded
    rule_payload JSONB NOT NULL,
    validation_status TEXT NOT NULL, -- pending/valid/invalid/warning
    validation_errors JSONB NULL,
    created_by TEXT NULL,
    activated_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### D. Voucher Ingestion Runs

History of ingestion jobs:

```sql
CREATE TABLE voucher_ingestion_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES voucher_catalog_sources(id),
    run_status TEXT NOT NULL, -- running/completed/completed_with_errors/failed
    items_seen INTEGER NOT NULL DEFAULT 0,
    items_inserted INTEGER NOT NULL DEFAULT 0,
    items_updated INTEGER NOT NULL DEFAULT 0,
    items_skipped INTEGER NOT NULL DEFAULT 0,
    items_failed INTEGER NOT NULL DEFAULT 0,
    error_summary TEXT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ NULL
);
```

### E. Voucher Match Evaluations

Quality evaluations of matching:

```sql
CREATE TABLE voucher_match_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,
    request_input JSONB NOT NULL,
    expected_voucher_ids UUID[] NULL,
    resolved_voucher_ids UUID[] NULL,
    best_resolved_voucher_id UUID NULL,
    evaluation_status TEXT NOT NULL, -- pending/success/partial/failed
    quality_score NUMERIC(5,2) NULL,
    quality_metrics JSONB NULL,
    error_summary TEXT NULL,
    ranking_trace JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### F. Voucher Rule Overrides

Local overrides for rules:

```sql
CREATE TABLE voucher_rule_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES voucher_catalog(id),
    override_type TEXT NOT NULL, -- eligibility/ranking/visibility/exclusion/priority
    override_payload JSONB NOT NULL,
    override_status TEXT NOT NULL, -- active/expired/cancelled
    created_by TEXT NULL,
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Ingestion Model

### Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Load Source │───▶│   Validate   │───▶│  Normalize   │───▶│    Upsert    │
│    Config     │    │    Raw Data   │    │    Records   │    │   Catalog    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                            │                   │                   │
                            ▼                   ▼                   ▼
                     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                     │   Errors?    │    │  Warnings?   │    │  Versioning  │
                     │  Abort Flow  │    │   Continue   │    │   If Needed  │
                     └──────────────┘    └──────────────┘    └──────────────┘
```

### Source Adapters

The system uses an adapter pattern to support multiple source types:

```typescript
interface VoucherSourceAdapter {
  readonly sourceType: VoucherSourceType;

  loadRawVoucherData(options?: {
    since?: Date;
    limit?: number;
    filters?: Record<string, unknown>;
  }): Promise<VoucherRawInput[]>;

  validateRawSourcePayload(rawItems: VoucherRawInput[]): Promise<{
    valid: boolean;
    errors: VoucherValidationError[];
    warnings: VoucherValidationWarning[];
  }>;

  normalizeSourcePayload(rawItems: VoucherRawInput[]): VoucherRawInput[];

  healthCheck(): Promise<{
    healthy: boolean;
    message?: string;
    latencyMs?: number;
  }>;
}
```

### Normalization

The normalizer converts raw voucher data from various sources into a canonical format:

- **Code normalization**: Uppercase, trimmed
- **Date normalization**: ISO 8601 format
- **Discount normalization**: Numeric values
- **Scope detection**: Auto-detect from applicable IDs
- **Constraint extraction**: Parse from various formats

## Rule Authoring

### Rule Structure

Rules are defined as JSON payloads:

```typescript
interface VoucherRulePayload {
  version: string;           // Semver format
  name: string;              // Human-readable name
  description?: string;

  conditions: VoucherRuleCondition[];  // Matching conditions

  ranking: {
    priority: number;        // 1-100
    boostFactors: BoostFactor[];
    decayFactors: DecayFactor[];
    scoreWeights: {
      discountValue: number; // 0-1
      relevance: number;     // 0-1
      recency: number;       // 0-1
      confidence: number;    // 0-1
    };
  };

  constraints: VoucherRuleConstraint[];

  compatibility: {
    canCombine: boolean;
    compatibleWith: string[];
    incompatibleWith: string[];
  };

  activeWindows: TimeWindow[];
}
```

### Rule Lifecycle

```
Draft → Validated → Active → Superseded/Archived
                    ↑
                    └── Can revert to Draft
```

### Rule Validation

Rules are validated before activation:

1. **Structural validation**: Zod schema validation
2. **Logic validation**: Condition conflict detection
3. **Completeness validation**: Required fields check
4. **Constraint validation**: Business rule enforcement

### Rule Compilation

Rules are compiled to runtime-friendly format:

```typescript
interface CompiledVoucherRule {
  voucherId: string;
  version: string;
  conditions: CompiledCondition[];  // With evaluator functions
  ranking: CompiledRanking;         // With score functions
  constraints: CompiledConstraint[]; // With validators
  isActive: boolean;
}
```

## Matching Quality Evaluation

### Evaluation Metrics

| Metric | Description |
|--------|-------------|
| Best Match Accuracy | Is the #1 result correct? |
| Top-K Recall | Expected vouchers in top K |
| Top-K Precision | Correct vouchers in top K |
| Ranking Discount | Ranking position difference |
| Ranking Correlation | Ranking order similarity |

### Quality Thresholds

| Threshold | Value |
|-----------|-------|
| Excellent | ≥ 0.9 |
| Good | ≥ 0.75 |
| Acceptable | ≥ 0.6 |
| Poor | ≥ 0.4 |
| Fail | < 0.4 |

### Feedback Loop

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Matching   │───▶│  Evaluation  │───▶│   Feedback   │
│   Process    │    │   Service    │    │    Report    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                                      │
        │                                      ▼
        │                              ┌──────────────┐
        │                              │    Rule      │
        └─────────────────────────────▶│  Adjustment │
                                       │  Suggestions│
                                       └──────────────┘
```

## API Endpoints

### Catalog

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /internal/vouchers/catalog | List vouchers |
| GET | /internal/vouchers/catalog/:id | Get voucher |
| POST | /internal/vouchers/catalog/ingest | Trigger ingestion |
| POST | /internal/vouchers/catalog/:id/refresh | Refresh voucher |

### Rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /internal/vouchers/rules | List rules |
| POST | /internal/vouchers/rules | Create rule |
| PATCH | /internal/vouchers/rules/:id | Update rule |
| POST | /internal/vouchers/rules/:id/activate | Activate rule |
| POST | /internal/vouchers/rules/:id/archive | Archive rule |

### Evaluation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /internal/vouchers/evaluate | Evaluate resolution |
| GET | /internal/vouchers/evaluations | List evaluations |
| GET | /internal/vouchers/quality | Get quality summary |

## CLI Commands

### Run Ingestion

```bash
# Ingest from specific source
npm run voucher:ingest -- --source-id <uuid>

# Ingest from all active sources
npm run voucher:ingest -- --all

# With options
npm run voucher:ingest -- --all --limit 100 --triggered-by "cron"
```

### Run Evaluation

```bash
# Default (100 evaluations)
npm run voucher:evaluate

# With platform filter
npm run voucher:evaluate -- --platform shopee

# Custom sample size
npm run voucher:evaluate -- --limit 50 --sample-size 20
```

## Best Practices

### Ingestion

1. **Idempotent upserts**: Use external_id + source_id for deduplication
2. **Version on change**: Create version snapshots on important field changes
3. **Batch processing**: Process in batches of 100 for memory efficiency
4. **Error handling**: Mark individual items as failed, don't abort entire run

### Rule Authoring

1. **Validate before activate**: Never activate invalid rules
2. **Version management**: Use semver for rule versions
3. **Test in draft**: Validate rules thoroughly before activation
4. **Document changes**: Use change_reason for audit trail

### Evaluation

1. **Baseline expectations**: Provide expected voucher IDs when possible
2. **Regular monitoring**: Run evaluations regularly to catch regressions
3. **Track quality trends**: Monitor quality score over time
4. **Feedback loop**: Use quality issues to improve rules

## Security Considerations

- All endpoints require internal authentication
- Source configurations can contain secrets (encrypted at rest)
- Override creation requires authorization
- Audit logging for all rule changes

## Monitoring

Key metrics to track:

- `voucher.ingestion.items.seen` - Items processed
- `voucher.ingestion.items.inserted` - New items
- `voucher.ingestion.items.failed` - Failed items
- `voucher.rule.validations.failed` - Validation failures
- `voucher.evaluation.quality_score` - Average quality
- `voucher.stale.count` - Stale voucher count

## Future Enhancements

- AI-generated voucher rules
- User-specific personalization
- Multi-platform aggregation
- Real-time quality dashboards
- Automated rule optimization
