# Commercial Intelligence Architecture

## Overview

The Commercial Intelligence Layer is a production-grade system for measuring, analyzing, and governing commercial performance of the affiliate automation system. It provides:

- **Business Intelligence**: Comprehensive metrics and analytics
- **Revenue Attribution**: Clear, explainable attribution from surface to revenue
- **Commercial Governance**: Guardrails to prevent harmful optimization
- **Anomaly Detection**: Proactive identification of issues

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMMERCIAL INTELLIGENCE LAYER                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────┐ │
│  │   Events    │    │   Session    │    │ Attribution │    │ Funnel   │ │
│  │   Layer     │───▶│   Layer      │───▶│   Layer     │───▶│  Layer   │ │
│  └─────────────┘    └──────────────┘    └─────────────┘    └──────────┘ │
│        │                   │                   │                   │        │
│        ▼                   ▼                   ▼                   ▼        │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      AGGREGATION & METRICS                           │  │
│  │  ┌──────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │  │
│  │  │   Revenue    │  │  Funnel         │  │  Quality              │  │  │
│  │  │   Quality    │  │  Aggregation    │  │  Balance              │  │  │
│  │  │   Balance    │  │                 │  │  Evaluation           │  │  │
│  │  └──────────────┘  └─────────────────┘  └────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│        │                   │                   │                           │
│        ▼                   ▼                   ▼                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    ANOMALY & GOVERNANCE                             │  │
│  │  ┌──────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │  │
│  │  │   Anomaly   │  │  Governance     │  │  Guardrail             │  │  │
│  │  │   Detection │  │  Reviews        │  │  Evaluation            │  │  │
│  │  └──────────────┘  └─────────────────┘  └────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                       │
│                                    ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                         REPORTS & API                              │  │
│  │  ┌──────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │  │
│  │  │  Summary    │  │  Attribution    │  │  Governance            │  │  │
│  │  │  Builder    │  │  Reports        │  │  Reports               │  │  │
│  │  └──────────────┘  └─────────────────┘  └────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL INTEGRATIONS                               │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────────────────┐        │
│  │  Growth     │  │  Experimentation│  │  Product              │        │
│  │  Surfaces   │  │  Framework      │  │  Governance           │        │
│  └──────────────┘  └─────────────────┘  └────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Event Collection

```
User Action → Funnel Event → Session Resolution → Attribution
     │             │                │                │
     ▼             ▼                ▼                ▼
  Public      Affiliate       Commercial      Click
  Flow        Funnel         Session         Attribution
```

### 2. Attribution Pipeline

```
Click Data    Resolution    Conversion    Revenue
    │             │              │            │
    ▼             ▼              ▼            ▼
First-Touch ──▶ … ──▶ Last-Touch ──▶ Attribution
  Model         Multi-Touch      Model       Result
```

### 3. Analysis Pipeline

```
Raw Events ──▶ Aggregation ──▶ Scoring ──▶ Anomaly ──▶ Report
                            │          Detection
                            ▼
                     Quality & Balance
                        Evaluation
```

## Session & Event Lineage

### Commercial Session

A commercial session represents a user's journey through the commercial funnel:

```
Session Key: cs_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    │
    ├── Anonymous Subject Key (optional)
    ├── Platform (public/admin/api)
    ├── Entry Surface (type + id)
    ├── Attribution Context (UTM, experiments, etc.)
    ├── First Seen At
    └── Last Seen At
```

### Funnel Events

| Event Type | Stage | Description |
|------------|-------|-------------|
| `public_page_view` | Entry | User viewed public page |
| `growth_surface_view` | Entry | User arrived via growth surface |
| `paste_link_submit` | Engagement | User submitted link for resolution |
| `resolution_request` | Resolution | System requested voucher resolution |
| `resolution_success` | Resolution | Voucher found and displayed |
| `resolution_no_match` | Resolution | No matching voucher found |
| `best_voucher_view` | Presentation | User viewed best voucher |
| `candidate_voucher_view` | Presentation | User viewed candidate vouchers |
| `voucher_copy_success` | Conversion | User copied voucher |
| `voucher_copy_failure` | Conversion | Voucher copy failed |
| `open_shopee_click` | Downstream | User clicked to open Shopee |
| `affiliate_link_click` | Downstream | User clicked affiliate link |
| `downstream_conversion_reported` | Revenue | Conversion reported by network |
| `downstream_commission_reported` | Revenue | Commission reported by network |

### Click Attribution

Click-level attribution tracks the journey from click to conversion:

```
Click Key: ck_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    │
    ├── Session ID (optional)
    ├── Voucher ID (optional)
    ├── Source Surface (type + id)
    ├── Resolution Request ID (optional)
    ├── Attribution Payload (UTM, etc.)
    └── Clicked At
```

### Conversion Reporting

Downstream conversion data from affiliate networks:

```
Conversion ID: (external)
    │
    ├── Platform (shopee/lazada/etc.)
    ├── Click Attribution ID (linked)
    ├── Voucher ID (optional)
    ├── Reported Revenue
    ├── Reported Commission
    ├── Conversion Status (pending/confirmed/cancelled)
    └── Conversion Time
```

## Attribution Model

### Supported Models

1. **First Touch**: Attributes to first interaction
2. **Last Touch**: Attributes to last interaction before conversion
3. **Linear**: Equal attribution across all touchpoints
4. **Time Decay**: More weight to recent touchpoints
5. **Position Based**: 40% first, 40% last, 20% middle

### Attribution Confidence

| Confidence | Criteria |
|------------|----------|
| **High** | Direct click + voucher match + external ID + within window |
| **Medium** | Click or voucher match present |
| **Low** | External ID only |
| **Unknown** | No attribution data |

## Revenue-Quality Balance

### Balance Dimensions

1. **Revenue Score**: Based on revenue per session
2. **Usefulness Score**: Inverse of no-match rate + engagement
3. **Quality Score**: Based on copy-to-open rate
4. **Balance Score**: Weighted combination (30% revenue, 40% usefulness, 30% quality)

### Risk Levels

| Risk Level | Balance Score | Action |
|------------|---------------|--------|
| Critical | < 0.6 | Block/Remove |
| High | < 0.7 | Review Required |
| Medium | < 0.8 | Monitor |
| Low | >= 0.8 | Healthy |

## Anomaly Detection

### Signal Types

| Signal | Description |
|--------|-------------|
| `revenue_usefulness_divergence` | Revenue up but quality down |
| `no_match_spike` | No-match rate increased significantly |
| `low_value_surface` | Surface generating low commercial value |
| `voucher_underperformance` | Voucher not converting well |
| `click_inflation_suspect` | Suspicious click rate increase |
| `quality_degradation` | Overall quality metrics declining |
| `experiment_regression` | Experiment causing negative impact |
| `anomalous_conversion_rate` | Unusual conversion patterns |
| `suspicious_traffic_pattern` | Bot-like or fraudulent traffic |

### Severity Levels

| Severity | Z-Score Range | Action |
|----------|---------------|--------|
| Info | 1.5 - 2.0 | Log & Monitor |
| Warning | 2.0 - 3.0 | Alert & Investigate |
| Critical | > 3.0 | Immediate Action |

## Governance Model

### Review Types

| Type | Description |
|------|-------------|
| `voucher_performance` | Review voucher commercial performance |
| `surface_performance` | Review growth surface performance |
| `experiment_impact` | Review experiment business impact |
| `revenue_quality_balance` | Review revenue-quality balance |
| `anomaly_review` | Review detected anomalies |
| `release_readiness` | Pre-release commercial review |

### Decision Support

| Recommendation | Criteria |
|----------------|----------|
| **Approve** | No critical risks, healthy metrics |
| **Review** | High risks present |
| **Reject** | Critical risks detected |
| **Investigate** | Medium risks need analysis |

## Guardrails

### Active Guardrails

1. **No-Match Rate**: Maximum 40% no-match
2. **Quality Score**: Minimum 0.5
3. **Revenue Drop**: Maximum 20% drop from baseline
4. **Quality Drop**: Maximum 15% drop from baseline
5. **Conversion Rate**: Minimum 30% copy-to-open

### Guardrail Actions

| Guardrail | Breach Action |
|-----------|---------------|
| Critical | Stop & Alert |
| Warning | Review & Monitor |
| Info | Log & Continue |

## Integration Points

### Growth Surfaces

The system tracks commercial performance by growth surface:

- SEO Articles
- SEO Product Pages
- Social (Facebook, TikTok, Instagram)
- Email Campaigns
- Paid Search/Social
- Referrals
- Direct

### Experiments

Commercial impact analysis for experiments:

- Revenue delta
- Quality delta
- Statistical significance
- Recommendation (approve/reject/continue)

### Product Governance

Commercial signals integrated into product governance:

- Release readiness signals
- Improvement opportunities
- Risk indicators

## Database Schema

### Core Tables

- `affiliate_commercial_sessions`: Session tracking
- `affiliate_funnel_events`: Funnel event log
- `affiliate_click_attributions`: Click-level attribution
- `affiliate_conversion_reports`: Downstream conversion data
- `commercial_metric_snapshots`: Aggregated metrics
- `commercial_governance_reviews`: Governance reviews
- `commercial_anomaly_signals`: Detected anomalies
- `commercial_revenue_quality_scores`: Quality scores

### Views

- `commercial_funnel_rates`: Funnel conversion rates
- `commercial_attribution_summary`: Attribution summaries
- `commercial_revenue_quality_trend`: Quality trends

## API Endpoints

### Summary

- `GET /internal/commercial/summary`
- `GET /internal/commercial/trends`
- `GET /internal/commercial/vouchers/:voucherId`
- `GET /internal/commercial/growth-surfaces/:type/:id`

### Attribution

- `GET /internal/commercial/attribution/revenue`
- `GET /internal/commercial/attribution/vouchers/:voucherId`
- `GET /internal/commercial/attribution/surfaces/:type/:id`
- `GET /internal/commercial/attribution/experiments/:experimentId`

### Governance

- `GET /internal/commercial/governance/reviews`
- `POST /internal/commercial/governance/run-review`
- `GET /internal/commercial/anomalies`
- `POST /internal/commercial/anomalies/detect`

## Observability

### Metrics

- Attribution success/failure
- Attribution confidence distribution
- Funnel event counts
- Revenue/commission totals
- Anomaly counts
- Governance review counts
- Quality gate results

### Events

- Attribution cycle start/complete/error
- Governance review start/complete/error
- Anomaly detection start/complete
- Session created/updated/expired
- Guardrail evaluated/breached

## Security & Privacy

### Privacy Principles

1. **Minimal Collection**: Only data needed for commercial analysis
2. **No Sensitive Data**: No PII in commercial intelligence
3. **Session Anonymization**: Use anonymous subject keys
4. **Data Retention**: Configurable retention periods

### Access Control

- Internal APIs only (not public-facing)
- Admin-only for governance actions
- Audit logging on all operations

## Scalability Considerations

1. **Batch Processing**: Funnel events can be batched
2. **Aggregation**: Pre-aggregated snapshots for reports
3. **Indexing**: Optimized indexes for common queries
4. **Retention Policies**: Automatic cleanup of old data

## Future Enhancements

1. **Multi-Touch Attribution**: More sophisticated models
2. **Real-Time Analytics**: Live dashboards
3. **Predictive Models**: Revenue forecasting
4. **External BI Integration**: Data warehouse exports
5. **Partner Performance**: Affiliate network analysis
