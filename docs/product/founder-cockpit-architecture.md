# Founder Cockpit Architecture

## Overview

The Founder Cockpit provides a unified, founder-level view of the entire affiliate automation system. It synthesizes insights from Commercial Intelligence, BI Scorecards, and operational data to deliver a concise, actionable dashboard for strategic decision-making.

## Core Components

### 1. Cockpit Summary (`founderCockpit/summary/`)

The cockpit summary is the main output - a concise executive view containing:

- **Growth Health**: Sessions, submit rates, acquisition trends
- **Product Health**: No-match rates, copy detection, quality signals
- **Commercial Health**: Revenue, commission, ROI metrics
- **Release Health**: Readiness scores, blockers, velocity

Each section includes:
- Current period metrics
- Trend indicators (up/down/stable)
- Health status (healthy/neutral/at-risk)
- Key insights (2-3 bullet points)

### 2. Weekly Operating Rhythm (`founderCockpit/reviews/`)

The weekly operating rhythm provides a structured cadence for operational review:

- **Summary**: Overall health, score, key changes
- **Issues**: Blockers, risks, concerns requiring attention
- **Decisions**: Items requiring founder decision
- **Follow-ups**: Trackable action items from previous cycles

### 3. Strategic Review Automation (`founderCockpit/reviews/strategicReviewPackBuilder.ts`)

Automated strategic review packs for different timeframes:

- **Weekly**: Operational pulse check
- **Monthly**: Full strategic review with trends
- **Quarterly**: Comprehensive quarterly business review

### 4. Decision Queue (`founderCockpit/decisions/`)

Centralized decision tracking:

- Decision items with priority, impact, effort
- Status tracking (pending/resolved/deferred)
- Resolution history
- Action item linkage

### 5. Follow-up Backlog (`founderCockpit/followups/`)

Trackable action items:

- Source linkage (from decisions, issues, risks)
- Priority and due dates
- Assignment tracking
- Completion status
- Stale detection (7+ days pending)

## Data Flow

```
Commercial Intelligence
         │
         ▼
   BI Scorecards
         │
         ▼
  Founder Cockpit ──────► Weekly Reviews
         │                    │
         ▼                    ▼
   Snapshots ◄───────── Decision Queue
         │                    │
         ▼                    ▼
   Follow-up Backlog ◄──────┘
```

## Integration Points

### External Integrations

- **BI Layer**: Imports executive scorecards, operator views
- **Commercial Intelligence**: Revenue attribution, funnel metrics
- **Growth Systems**: Session data, submit rates
- **Governance**: Risk signals, compliance status

### Internal Services

- `founderCockpitService`: Main orchestrator
- `founderSummaryBuilder`: Cockpit synthesis
- `weeklyChangeAnalyzer`: Period-over-period analysis
- `founderHealthEvaluator`: Health scoring

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/founder-cockpit/current` | GET | Current cockpit snapshot |
| `/api/founder-cockpit/snapshots` | GET | List historical snapshots |
| `/api/founder-cockpit/weekly-reviews` | GET | List weekly reviews |
| `/api/founder-cockpit/weekly-reviews/current` | GET | Current week's review |
| `/api/founder-cockpit/strategic-packs` | GET/POST | Strategic review packs |
| `/api/founder-cockpit/decisions` | GET | Decision queue |
| `/api/founder-cockpit/decisions/:id/resolve` | POST | Resolve decision |
| `/api/founder-cockpit/cycle/run` | POST | Run full operating cycle |
| `/api/founder-cockpit/health` | GET | Health check |

## Health Scoring

The cockpit uses a weighted health score (0-1):

| Component | Weight | Metrics |
|-----------|--------|---------|
| Growth | 25% | Sessions, submit rate trends |
| Quality | 25% | No-match rate, copy rate |
| Commercial | 30% | Revenue, commission, ROI |
| Release | 20% | Readiness, blockers |

Health statuses:
- **Healthy**: Score >= 0.7
- **Neutral**: Score 0.5-0.7
- **At-Risk**: Score < 0.5

## Database Schema

### Tables

- `founder_cockpit_snapshots`: Historical cockpit data
- `weekly_operating_reviews`: Weekly review records
- `strategic_review_packs`: Strategic review packages
- `founder_decision_queue`: Decision items
- `operating_followup_backlog`: Action items
- `founder_cockpit_audit`: Audit trail

## Observability

### Metrics
- Build duration (cockpit, review, pack)
- Success/failure rates
- Records created
- Health scores

### Events
- Build started/completed/failed
- Decision created/resolved
- Follow-up created/completed
- Health status changes

## CLI Scripts

- `npm run founder:cycle`: Run full operating cycle
- `npm run founder:governance`: Run governance review

## Design Principles

1. **Concise**: Maximum 5-7 key metrics per section
2. **Actionable**: Every insight has a clear action path
3. **Historical**: Context through trend comparison
4. **Trackable**: Decisions and follow-ups are tracked to completion
5. **Automated**: Minimal manual data entry required
