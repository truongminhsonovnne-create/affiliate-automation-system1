# Deployment Architecture

## Overview

The Affiliate Automation System uses a multi-role runtime architecture with clear separation between web, control plane, and worker components. This document describes the production-grade deployment topology.

## Runtime Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RUNTIME TOPOLOGY                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │
│  │    WEB      │    │CONTROL PLANE│    │   WORKERS   │                   │
│  │  (Next.js)  │    │  (Express) │    │  (Multiple) │                   │
│  └─────────────┘    └─────────────┘    └─────────────┘                   │
│         │                   │                   │                             │
│         └───────────────────┼───────────────────┘                             │
│                             │                                                 │
│                    ┌────────▼────────┐                                      │
│                    │   SHARED LAYER  │                                      │
│                    │  • Database     │                                      │
│                    │  • Secrets      │                                      │
│                    │  • Queue        │                                      │
│                    │  • Object Store │                                      │
│                    └─────────────────┘                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Web Runtime (`web`)
- Serves admin dashboard (Next.js)
- Handles browser requests
- Client-side rendering
- API routes for dashboard data
- **Port**: 3000 (default)

### Control Plane Runtime (`control-plane`)
- Internal API for operators
- Admin mutation endpoints
- Authentication/authorization
- Operator action validation
- **Port**: 4000 (default)

### Worker Runtimes

#### Crawler Worker (`worker-crawler`)
- Executes product discovery crawls
- Manages Playwright browser contexts
- Handles session persistence
- Queue-based job processing

#### AI Enrichment Worker (`worker-ai`)
- Processes products through Gemini API
- Enriches product metadata
- Quality gate evaluation
- Batch processing

#### Publisher Worker (`worker-publisher`)
- Executes publish jobs
- Channel adapter management
- Content rendering
- Scheduling and execution

#### Ops Runner (`ops-runner`)
- Scheduled task execution
- Manual operational tasks
- Cleanup jobs
- Maintenance scripts

## Environment Matrix

| Component | Local | Development | Staging | Production |
|-----------|-------|--------------|----------|-------------|
| Web | ✅ | ✅ | ✅ | ✅ |
| Control Plane | ✅ | ✅ | ✅ | ✅ |
| Crawler Worker | ✅ | ✅ | ✅ | ✅ |
| AI Worker | ✅ | ✅ | ✅ | ✅ |
| Publisher Worker | ✅ | ✅ | ✅ | ✅ |
| Ops Runner | ✅ | ✅ | ✅ | ✅ |
| Database | Supabase | Supabase | Supabase | Supabase |

## Deployment Model

### Containerized Deployment

Each runtime role runs in its own container:

```yaml
# docker-compose production example
services:
  web:
    build: .
    role: web
    ports:
      - "3000:3000"

  control-plane:
    build: .
    role: control-plane
    ports:
      - "4000:4000"

  worker-crawler:
    build: .
    role: worker-crawler

  worker-ai:
    build: .
    role: worker-ai

  worker-publisher:
    build: .
    role: worker-publisher
```

### Scaling Strategy

- **Web/Control Plane**: Horizontal scaling with load balancer
- **Workers**: Queue-based with configurable concurrency
- **Database**: Managed Supabase (auto-scaling)

## Networking & Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                      TRUST BOUNDARIES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PUBLIC/UNTRUSTED                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Browser → Load Balancer → Web (Next.js)               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  INTERNAL/TRUSTED                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Web → Control Plane API (internal)                     │   │
│  │ Web → Database (via Supabase)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  WORKER ZONE                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Workers → Control Plane (internal)                     │   │
│  │ Workers → Database                                      │   │
│  │ Workers → External APIs (Shopee/Lazada/Gemini)          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Storage & Paths

### Crawler Session Data
- **Path**: `/app/data/sessions`
- **Type**: Persistent volume
- **Content**: Playwright browser contexts, cookies
- **Retention**: 7 days (configurable)

### Worker Logs
- **Path**: `/app/logs`
- **Type**: Ephemeral (stdout in container)
- **Retention**: Container logs

### Temporary Data
- **Path**: `/tmp`
- **Type**: Ephemeral
- **Cleanup**: On container restart

## Worker Separation

Each worker type runs independently:

```
worker-crawler    → Queue: crawler-jobs
worker-ai         → Queue: ai-enrichment-jobs
worker-publisher   → Queue: publish-jobs
ops-runner        → Cron/scheduled
```

Workers poll their respective queues and process jobs independently.

## Release Sequence

### Safe Release Order

1. **Build & Test**
   - Run unit tests
   - Run integration tests
   - Build container images

2. **Database Migration** (if needed)
   - Run migrations
   - Verify migration success

3. **Deploy Workers First**
   - Deploy worker-crawler
   - Deploy worker-ai
   - Deploy worker-publisher

4. **Deploy Control Plane**
   - Deploy control-plane
   - Verify health endpoints

5. **Deploy Web**
   - Deploy web
   - Verify dashboard loads

6. **Verification**
   - Run smoke checks
   - Monitor error rates

### Rollback Order

If issues detected:

1. **Revert Web**
2. **Revert Control Plane**
3. **Revert Workers** (if needed)
4. **Database Rollback** (if migration-related)

## Configuration Strategy

### Environment-Specific Config

```
local/           → .env.local, docker-compose.yml
development/     → .env.development
staging/        → .env.staging
production/     → Injected via secrets manager
```

### Config Priority

1. Environment variables (highest)
- Secrets (from Vault/1Password)
- Role-specific config
- Common config

## Health & Monitoring

### Health Checks

- **Liveness**: Process is running
- **Readiness**: Dependencies available
- **Startup**: Initialization complete

### Metrics

- Request latency (p50, p95, p99)
- Error rates
- Job throughput
- Queue depths

## Security Considerations

### Network Policies

- Workers cannot receive external traffic
- Control plane only accessible internally
- Web handles all external traffic

### Secrets Management

- Secrets injected at runtime
- Never baked into images
- Rotated via deployment pipeline

## Disaster Recovery

### Backup Strategy

- Supabase handles automatic backups
- Point-in-time recovery available
- Cross-region replication enabled

### Recovery Procedures

1. Database: Restore from Supabase
2. Workers: Redeploy
3. Control Plane: Redeploy
4. Web: Redeploy
