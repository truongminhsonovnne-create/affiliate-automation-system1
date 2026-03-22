# Runtime Environments

## Environment Overview

| Environment | Purpose | URL | Database |
|-------------|---------|-----|----------|
| Local | Development | localhost:3000 | Supabase (dev) |
| Development | Integration testing | dev.affiliate.local | Supabase (dev) |
| Staging | Pre-production validation | staging.affiliate.local | Supabase (staging) |
| Production | Live system | affiliate.local | Supabase (production) |

## Environment Configuration

### Required Environment Variables

#### Common Variables (All Roles)

| Variable | Description | Required | Local | Dev | Staging | Prod |
|----------|-------------|----------|-------|-----|---------|------|
| `NODE_ENV` | Environment name | ✅ | local | development | staging | production |
| `LOG_LEVEL` | Logging verbosity | ✅ | debug | debug | info | warn |
| `RUNTIME_ROLE` | Runtime role | ✅ | - | - | - | - |
| `RUNTIME_ENV` | Runtime environment | ✅ | local | development | staging | production |

#### Database

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Supabase project URL | ✅ | - |
| `SUPABASE_ANON_KEY` | Supabase anon key | ✅ | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅* | - |

*Only required for control-plane and workers

#### Authentication

| Variable | Description | Required | Local | Dev | Staging | Prod |
|----------|-------------|----------|-------|-----|---------|------|
| `INTERNAL_AUTH_SECRET` | Internal auth secret | ✅* | dev-secret | dev-secret | staging-secret | prod-secret |
| `SESSION_SECRET` | Session encryption secret | ✅* | dev-secret | dev-secret | staging-secret | prod-secret |

*Required for control-plane and web

#### External Services

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | ✅* |
| `SHOPEE_API_KEY` | Shopee API key | ✅* |
| `LAZADA_API_KEY` | Lazada API key | ✅* |
| `TIKI_API_KEY` | Tiki API key | ✅* |

*Required for respective workers

### Role-Specific Environment Variables

#### Web Role

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | 3000 |
| `NEXT_PUBLIC_APP_URL` | Application URL | http://localhost:3000 |
| `NEXT_PUBLIC_API_URL` | API URL | http://localhost:4000 |

#### Control Plane Role

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | 4000 |
| `ADMIN_API_SECRET` | Admin API secret | - |

#### Worker Roles

| Variable | Description | Default | Worker |
|----------|-------------|---------|--------|
| `WORKER_CONCURRENCY` | Job concurrency | 1 | All workers |
| `QUEUE_POLL_INTERVAL` | Queue poll interval (ms) | 5000 | All workers |
| `CRAWLER_MAX_SESSIONS` | Max browser sessions | 5 | Crawler |
| `AI_BATCH_SIZE` | AI processing batch size | 10 | AI |
| `PUBLISHER_BATCH_SIZE` | Publish batch size | 20 | Publisher |

## Secret Boundaries

### Local
- Secrets in `.env.local` (gitignored)
- All secrets allowed
- Relaxed security

### Development
- Secrets in `.env.development`
- Limited access
- Debug logging enabled

### Staging
- Secrets from secrets manager
- Restricted access
- Warning-level logging
- Dry-run enabled for sensitive operations

### Production
- Secrets from Vault/1Password
- Strict access control
- Error-level logging
- No dry-run for sensitive operations
- MFA required for admin access

## Feature Flags

| Feature | Local | Dev | Staging | Prod |
|---------|-------|-----|---------|------|
| `ENABLE_DEBUG_MODE` | true | true | false | false |
| `ENABLE_VERBOSE_LOGGING` | true | true | false | false |
| `ENABLE_DRY_RUN` | true | true | true | false |
| `ENABLE_METRICS` | false | true | true | true |
| `ENABLE_DEV_UI` | true | false | false | false |

## Safety Defaults by Environment

### Local
- `DRY_RUN=true` - All operations are dry runs
- `MUTATION_ENABLED=true` - Mutations allowed
- `RATE_LIMIT_MULTIPLIER=10` - Relaxed rate limits

### Development
- `DRY_RUN=true` - All operations are dry runs
- `MUTATION_ENABLED=true` - Mutations allowed
- `RATE_LIMIT_MULTIPLIER=5` - Moderate rate limits

### Staging
- `DRY_RUN=false` - Real operations
- `MUTATION_ENABLED=true` - Mutations allowed with warning
- `RATE_LIMIT_MULTIPLIER=2` - Stricter rate limits
- Migration allowed

### Production
- `DRY_RUN=false` - Real operations
- `MUTATION_ENABLED=true` - Mutations allowed with additional checks
- `RATE_LIMIT_MULTIPLIER=1` - Full rate limits
- Migration requires approval

## Storage & Paths

### Crawler Session Data
- **Local**: `./sessions`
- **Development**: `/app/data/sessions`
- **Staging**: `/app/data/sessions`
- **Production**: `/app/data/sessions` (persistent volume)

### Logs
- **Local**: stdout
- **Development**: stdout + file
- **Staging**: stdout + file
- **Production**: stdout (container logs)

### Temporary Data
- **All**: `/tmp`
- **Cleanup**: On container restart

## Scheduler Behavior

### Local
- Jobs run immediately
- No scheduling delays
- Debug output enabled

### Development
- Jobs run immediately
- Reduced delays
- Debug output enabled

### Staging
- Jobs run with normal delays
- Full logging
- Monitoring active

### Production
- Jobs run on schedule
- Minimal logging
- Full monitoring
- Alerting active

## Worker Concurrency

| Worker | Local | Dev | Staging | Production |
|-------|-------|-----|---------|------------|
| Crawler | 1 | 2 | 3 | 5 |
| AI | 1 | 2 | 5 | 10 |
| Publisher | 1 | 2 | 10 | 20 |
| Ops | 1 | 1 | 1 | 1 |

## Database Connection

### Local
- Uses Supabase development project
- No connection pooling
- Debug queries enabled

### Development
- Uses Supabase development project
- Connection pooling enabled
- Query logging

### Staging
- Uses Supabase staging project
- Connection pooling enabled
- Query logging disabled

### Production
- Uses Supabase production project
- Connection pooling enabled
- Query logging disabled
- Read replicas if available

## Health Check Behavior

### Local
- Fast failures (1s timeout)
- Verbose health output

### Development
- Normal failures (5s timeout)
- Standard health output

### Staging
- Normal failures (5s timeout)
- Detailed health output

### Production
- Slow failures (10s timeout)
- Minimal health output

## Startup Behavior

### Local
- Wait for dependencies: 5s
- Retry attempts: 3
- Startup timeout: 30s

### Development
- Wait for dependencies: 10s
- Retry attempts: 5
- Startup timeout: 60s

### Staging
- Wait for dependencies: 15s
- Retry attempts: 5
- Startup timeout: 120s

### Production
- Wait for dependencies: 30s
- Retry attempts: 10
- Startup timeout: 180s
