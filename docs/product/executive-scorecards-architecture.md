# Executive Scorecards Architecture

## Overview

The Executive Scorecards layer provides consolidated, high-level views of business performance across multiple dimensions. It serves as the primary interface for executive decision-making and strategic planning.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   EXECUTIVE LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Growth   │  │  Quality   │  │ Commercial │     │
│  │ Scorecard  │  │  Scorecard │  │  Scorecard │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Release  │  │Product Health│  │ Experiment │     │
│  │ Scorecard │  │   Scorecard │  │  Scorecard │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                        │                                  │
│                        ▼                                  │
│              ┌───────────────────┐                        │
│              │   OVERALL CARD   │                        │
│              └───────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   INTEGRATION LAYER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Growth   │  │Commercial  │  │   Product   │     │
│  │   Engine   │  │Intelligence│  │ Governance  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Scorecard Types

### 1. Growth Scorecard
- **Metrics**: Sessions, Submit Rate, Surface Diversity, Traffic Quality
- **Key KPIs**:
  - Total Sessions
  - Submit Rate (paste/submit)
  - Surface Count
  - Traffic Quality Score
- **Health Indicators**: Sessions trend, submit rate trend

### 2. Quality Scorecard
- **Metrics**: No-Match Rate, Copy Rate, Open Rate, Balance Score
- **Key KPIs**:
  - No-Match Rate (lower is better)
  - Copy Rate (voucher copies/resolution)
  - Open Rate (Shopee opens/copies)
  - Balance Score (revenue-quality)
- **Thresholds**: Warning at 30%, Critical at 50%

### 3. Commercial Scorecard
- **Metrics**: Revenue, Commission, Conversions, Revenue/Session
- **Key KPIs**:
  - Total Revenue
  - Total Commission
  - Total Conversions
  - Revenue per Session
- **Trends**: Revenue trend, commission trend

### 4. Release Scorecard
- **Metrics**: Readiness Score, Blockers, Anomalies, Governance Status
- **Key KPIs**:
  - Release Readiness Score (0-1)
  - Active Blockers
  - Active Anomalies
  - Governance Score

### 5. Product Health Scorecard
- **Purpose**: Combined view of quality + commercial + release
- **Score Calculation**:
  - Quality: 40%
  - Commercial: 30%
  - Release: 30%

### 6. Experiment Scorecard
- **Metrics**: Active Experiments, Significant Results
- **Key KPIs**:
  - Active Experiments
  - Significant Results
  - Promoted/rolled back counts

## KPI Groups

### Growth KPIs
- `growth.sessions` - Total sessions
- `growth.submit_rate` - Submit rate
- `growth.surface_diversity` - Surface diversity
- `growth.traffic_quality` - Traffic quality

### Quality KPIs
- `quality.no_match_rate` - No-match rate
- `quality.copy_rate` - Copy rate
- `quality.open_rate` - Open rate
- `quality.balance_score` - Balance score

### Commercial KPIs
- `commercial.revenue` - Total revenue
- `commercial.commission` - Total commission
- `commercial.conversions` - Total conversions
- `commercial.revenue_per_session` - Revenue per session

### Release KPIs
- `release.readiness_score` - Readiness score
- `release.blockers` - Active blockers
- `release.anomalies` - Active anomalies

## Metric Lineage

Every KPI has documented lineage:

```json
{
  "metric_key": "quality.no_match_rate",
  "lineage": {
    "source": "funnel_events",
    "calculation": "no_match / total_resolution",
    "dependencies": ["voucher_engine", "resolution_api"]
  }
}
```

## Health Classification

| Score Range | Classification | Color |
|-------------|---------------|-------|
| 0.8 - 1.0 | Healthy | Green |
| 0.6 - 0.79 | Warning | Yellow |
| 0.0 - 0.59 | Critical | Red |

## Trend Analysis

Trends are calculated comparing current period to previous period:

- **Improving**: More positive metrics than negative
- **Stable**: Equal positive and negative
- **Declining**: More negative metrics than positive

## Risk Identification

Each scorecard identifies risks:

- **Type**: What kind of risk
- **Severity**: Low, Medium, High, Critical
- **Description**: Human-readable description
- **Affected Entities**: What areas are impacted

## Decision Hints

Each scorecard provides actionable hints:

- Scale investment areas
- Review underperforming surfaces
- Investigate quality issues
- Resolve blockers before release

## Integration Points

### Growth Engine
- Session data
- Surface performance
- Traffic quality metrics

### Commercial Intelligence
- Revenue attribution
- Conversion data
- Voucher performance

### Product Governance
- Release readiness
- Blockers and issues
- Governance reviews

### Product Ops
- Remediation backlog
- Human loop metrics
- Quality reviews

## API Endpoints

### GET /internal/bi/executive/scorecards
Returns all executive scorecards for a period.

**Parameters**:
- `startDate`: Start of period (ISO date)
- `endDate`: End of period (ISO date)
- `types`: Optional comma-separated list of scorecard types

**Response**:
```json
{
  "overall": { "score": 0.78, "status": "healthy" },
  "scorecards": [
    { "type": "growth", "headline": { "score": 0.8 } },
    { "type": "quality", "headline": { "score": 0.75 } }
  ]
}
```

## Scorecard Generation

Scorecards are generated on-demand or scheduled:

- **Hourly**: For critical metrics
- **Daily**: For operational dashboards
- **Weekly**: For executive reviews
- **Monthly**: For strategic planning

## Data Freshness

| Scorecard Type | Freshness Threshold |
|---------------|---------------------|
| Hourly | 2 hours |
| Daily | 26 hours |
| Weekly | 8 days |

Alerts are generated when scorecards become stale.

## Future Enhancements

1. **Real-time streaming**: Update scorecards in real-time
2. **Custom scorecards**: Allow custom KPI combinations
3. **Drill-down**: Click-through to detailed views
4. **Forecasting**: Predict future scores
5. **Anomaly highlighting**: Automatic anomaly detection
