# TikTok Shop Discovery & Detail Extraction Architecture

## Overview

The TikTok Shop Discovery & Detail Extraction Pipeline provides production-grade infrastructure for acquiring product data from TikTok Shop. This layer implements safe acquisition discipline with failure isolation, quality evaluation, and governance-aware scaling.

## Architecture Components

### 1. Runtime Layer
**Location**: `src/platform/tiktokShop/acquisition/runtime/`

- **Runtime Profile**: Defines acquisition profiles (discovery, detail, mixed)
- **Safe Acquisition Runtime**: Manages session lifecycle, concurrency, health
- **Navigation Safety**: Handles page navigation with retry/backoff
- **Session Policy**: Manages session hygiene and recycling

### 2. Discovery Layer
**Location**: `src/platform/tiktokShop/acquisition/discovery/`

- **Seed Resolver**: Resolves discovery seeds (URLs, categories, keywords)
- **Discovery Orchestrator**: Orchestrates the discovery pipeline
- **Candidate Extractor**: Extracts product references from surfaces
- **Candidate Normalizer**: Normalizes raw references to canonical form
- **Candidate Deduper**: Removes duplicate candidates

### 3. Detail Extraction Layer
**Location**: `src/platform/tiktokShop/acquisition/detail/`

- **Detail Orchestrator**: Orchestrates detail extraction pipeline
- **Detail Extractor**: Extracts raw fields (title, seller, price, etc.)
- **Evidence Builder**: Builds extraction evidence for quality scoring
- **Detail Normalizer**: Normalizes raw fields to standard format

### 4. Quality Layer
**Location**: `src/platform/tiktokShop/acquisition/quality/`

- **Extraction Quality Evaluator**: Evaluates extraction quality scores
- **Selector Fragility Analyzer**: Analyzes selector stability

### 5. Failure Handling Layer
**Location**: `src/platform/tiktokShop/acquisition/failures/`

- **Failure Classifier**: Classifies failures (timeout, anti-bot, etc.)
- **Retry Policy**: Implements retry/backoff decisions

### 6. Health & Governance
**Location**: `src/platform/tiktokShop/acquisition/`

- **Health Service**: Evaluates runtime health
- **Governance**: Makes pause/throttle decisions

## Data Flow

```
┌─────────────────┐
│  Seed Resolver │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Discovery       │──── Candidates
│ Orchestrator   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌────────┐
│Normalize│ │Dedup  │
└───┬───┘ └───┬────┘
    │         │
    └────┬────┘
         ▼
┌─────────────────┐
│ Detail         │──── Raw Detail Records
│ Orchestrator   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Quality         │──── Quality Scores
│ Evaluator       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Governance     │──── Pause/Throttle
│ Decisions      │
└─────────────────┘
```

## Support States

| State | Meaning | Action |
|-------|---------|--------|
| Supported | Full extraction capability | Proceed |
| Partial | Some capability with gaps | Proceed with caution |
| Fragile | May break easily | Use carefully |
| Unsupported | Not implemented | Don't use |

## Quality Thresholds

- **Excellent**: ≥90%
- **Good**: ≥70%
- **Acceptable**: ≥50%
- **Poor**: ≥30%
- **Failed**: <30%

## Current Status

This layer provides the **infrastructure foundation** for TikTok Shop acquisition. Actual scraping/extraction requires:

1. Browser automation setup (Playwright/Puppeteer)
2. Selector implementation
3. Anti-bot handling
4. Real URL patterns

The code is structured for safe, controlled rollout with proper failure isolation and governance.

## Integration Points

- TikTok Shop Domain Layer
- TikTok Shop Data Foundation
- Multi-Platform Foundation
- Governance & Strategy Layers
