# Growth Engine

Production-grade Growth Engine + Programmatic SEO Governance for the Affiliate Automation System.

## Overview

The Growth Engine is a comprehensive system for managing programmatic SEO surfaces with built-in governance guardrails to prevent drift to coupon farm/spam patterns while preserving the tool-first UX.

## Features

### Surface Types
- **Shop Pages**: Product/category listings
- **Category Pages**: Topic categorization
- **Intent Pages**: User intent matching
- **Tool Entries**: Interactive tools (paste-link tool at center)
- **Discovery Pages**: Content discovery
- **Ranking Pages**: Comparison rankings
- **Guide Pages**: Educational content

### Core Capabilities
- **Surface Inventory Management**: Register, update, list surfaces
- **Eligibility Evaluation**: Determine generation/indexing readiness
- **Generation Planning**: Batch generation with governance checks
- **SEO Governance**: Indexability, canonicals, robots directives
- **Content Policy**: Thin content, clutter, duplicate detection
- **Tool Alignment**: CTA discipline, wander risk assessment
- **Internal Link Governance**: Controlled linking with priority weights
- **Quality Evaluation**: Multi-dimensional quality scoring
- **Usefulness Analysis**: Engagement and conversion tracking
- **Freshness Management**: Content refresh scheduling
- **Governance Actions**: Block, deindex, refresh, archive

## Architecture

```
src/growthEngine/
├── types.ts           # Core type definitions
├── constants.ts       # Configuration thresholds
├── inventory/        # Surface inventory management
├── eligibility/      # Eligibility evaluation
├── generation/       # Generation planning & execution
├── seo/              # SEO governance
├── governance/       # Content & tool policies
├── quality/          # Quality evaluation
├── freshness/        # Freshness management
├── analytics/        # Measurement & conversion
├── repositories/     # Data access layer
├── routes/           # HTTP API routes
├── middleware/       # Express middleware
├── integrations/     # External service integrations
├── observability/    # Health & tracing
└── scripts/         # CLI scripts
```

## Quick Start

### Start Server
```bash
npx tsx src/growthEngine/scripts/runServer.ts
```

### Run Portfolio Analysis
```bash
npx tsx src/growthEngine/scripts/portfolioAnalysis.ts
```

### API Endpoints
- `GET /api/growth/health` - Health check
- `GET /api/growth/surfaces` - List surfaces
- `POST /api/growth/surfaces` - Register surface
- `POST /api/growth/governance/check` - Run governance check
- `GET /api/growth/analytics/dashboard` - Dashboard metrics

## Configuration

Key thresholds in `constants.ts`:
- Quality score thresholds (60-90)
- Usefulness thresholds (30-70)
- Thin content limits (300-1000 chars)
- Freshness windows (7-30 days)
- Link limits (3-10 per surface)

## Governance Principles

1. **Tool-First UX**: CTAs and tools remain central
2. **Quality Before Quantity**: Block low-quality surfaces
3. **Clean Scaling**: No coupon farm patterns
4. **Continuous Monitoring**: Freshness and usefulness tracking
5. **Fail-Safe**: Auto-block critical issues
