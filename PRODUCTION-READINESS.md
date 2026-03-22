# Production Readiness Checklist

## Overview
This document validates production readiness for the Affiliate Shopee project.

---

## 1. Deployment Architecture

### Service Separation
| Service | Public Access | Internal Only | Port | Notes |
|---------|--------------|--------------|------|-------|
| Web (Next.js) | ✅ Yes | - | 3000 | Via reverse proxy |
| Control Plane | ❌ No | ✅ Yes | 4000 | Internal network only |
| Workers | ❌ No | ✅ Yes | - | No HTTP |
| Redis | ❌ No | ✅ Yes | 6379 | Internal network |

### Network Security
- **Web**: Bind to `127.0.0.1:3000` (localhost), expose via reverse proxy
- **Control Plane**: Bind to `127.0.0.1:4000`, NOT exposed to host
- **Workers**: No HTTP ports exposed

---

## 2. Environment Configuration

### Required Variables (Production)

```bash
# Core
NODE_ENV=production
RUNTIME_ENV=production
RUNTIME_ROLE=web|control-plane

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=***
SUPABASE_ANON_KEY=***

# Security - Internal Auth (CRITICAL)
CONTROL_PLANE_INTERNAL_SECRET=***min-32-chars***

# Security - Admin (CRITICAL)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=***min-12-chars***
SESSION_SECRET=***min-32-chars***

# Rate Limiting (CRITICAL for production)
USE_REDIS_RATE_LIMIT=true
REDIS_URL=redis://redis:6379

# Trust Proxy (behind load balancer)
TRUST_PROXY=true
TRUSTED_PROXY_IPS=10.0.0.0/8,172.16.0.0/12

# Network
CONTROL_PLANE_HOST=127.0.0.1
CONTROL_PLANE_ENABLE_CORS=false

# Public URLs
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

---

## 3. Health Endpoints

### Public Endpoints (Minimal)
- `GET /health` - Basic liveness (role, status, timestamp)
- `GET /api/health` - API health (if needed)

### Internal Endpoints (Protected)
- `GET /health/ready` - Readiness probe (checks dependencies)
- `GET /health/startup` - Startup probe
- `GET /internal/health` - Full health with checks

### Kubernetes Probe Config Example
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
```

---

## 4. Security Posture

### Authentication
- **Control Plane**: `x-internal-secret` header with `CONTROL_PLANE_INTERNAL_SECRET`
- **Dashboard**: Via control plane (internal API)
- **No default actor**: Production fails-closed

### Rate Limiting
- **Production**: Redis-backed (REQUIRED)
- **Dev**: In-memory fallback (acceptable)

### Trust Proxy
- Enable `TRUST_PROXY=true` behind load balancer
- Configure `TRUSTED_PROXY_IPS` with your proxy ranges

---

## 5. Pre-Deployment Validation

### Run Preflight Check
```bash
# Set environment to production
export NODE_ENV=production

# Run validation
npx tsx scripts/runProductionPreflight.ts
```

### Expected Output
- All critical checks pass
- No missing required variables
- Security posture: "secure" or "warning" (not "critical")

---

## 6. Docker Production Deployment

### Quick Start
```bash
# 1. Copy environment template
cp .env.production.example .env
# Edit .env with actual values

# 2. Validate
npx tsx scripts/runProductionPreflight.ts

# 3. Build and start
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d web
```

### Recommended: Use Reverse Proxy
```yaml
# nginx.conf example
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 7. Known Limitations

| Item | Status | Recommendation |
|------|--------|----------------|
| Cookie Session | Header-based auth | Consider httpOnly cookies if dashboard is public |
| TLS Termination | At reverse proxy | Configure at load balancer level |
| Session Management | Token via headers | Add server-side sessions for production dashboard |

---

## 8. Monitoring Checklist

### Key Metrics
- `rate_limit_exceeded` - Rate limit hits
- `rate_limit_blocked` - Hard blocks
- `auth_failures` - Authentication failures

### Logs to Watch
- `Authentication failed - invalid credentials`
- `Rate limit exceeded`
- `CORS rejected origin`

---

Last Updated: 2026-03-18
