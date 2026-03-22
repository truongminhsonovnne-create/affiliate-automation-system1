# VoucherFinder — Deployment Guide

Production-ready checklist and step-by-step instructions for deploying VoucherFinder to any hosting platform.

---

## Pre-flight Checklist

Before deploying, confirm these are done:

- [ ] `NEXT_PUBLIC_SITE_URL` is set to your real domain (e.g. `https://voucherfinder.app`)
- [ ] `NEXT_PUBLIC_INTERNAL_API_URL` points to the backend service (or `http://localhost:3000` for standalone)
- [ ] `SESSION_SECRET` is a long random string (≥ 48 hex chars)
- [ ] `SESSION_VERSION` is set (increment after any incident to invalidate all sessions)
- [ ] `ADMIN_PASSWORD_HASH` is a bcrypt hash of your real admin password
- [ ] `NEXT_PUBLIC_GSC_VERIFY` is set if you need Google Search Console verification
- [ ] HTTPS is enabled on your hosting platform (required for cookies + modern browsers)
- [ ] `npm run build` completes without errors
- [ ] `npm start` locally in production mode works

---

## Step 1 — Domain Configuration

### Buy / point domain

1. Register `voucherfinder.app` (or your chosen domain) at any registrar (Porkbun, Namecheap, Cloudflare).
2. Add a DNS `A` record pointing to your server IP, or a `CNAME` pointing to your hosting platform's default domain.

### Subdomain for www

```
A record   @    → your-server-ip
CNAME      www  → @   (or your-platform default domain)
```

---

## Step 2 — Environment Variables

Copy `.env.example` → `.env.local` (local dev) or set as platform environment variables:

```bash
# Canonical base URL  (no trailing slash)
NEXT_PUBLIC_SITE_URL=https://voucherfinder.app

# Internal API rewrite target
#   Local standalone:  http://localhost:3000
#   Docker Compose:   http://backend:3001
#   VPS direct:       http://localhost:3000
NEXT_PUBLIC_INTERNAL_API_URL=http://localhost:3000

# Session signing  — generate with:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
SESSION_SECRET=<your-48-char-random-hex>

SESSION_VERSION=1

# Admin login password hash — generate with:
#   node -e "console.log(require('bcryptjs').hashSync('your_password', 10))"
ADMIN_PASSWORD_HASH=<your-bcrypt-hash>
```

**Never commit `.env.local` or `.env.production`.**

---

## Step 3 — Build

```bash
# Install dependencies (if not already done)
npm ci

# Production build
npm run build

# Verify the build artifact
ls .next/standalone   # should exist
```

---

## Step 4 — Deploy

Choose your platform below.

---

### Option A — Docker (recommended)

A complete `Dockerfile` and `docker-compose.yml` are included in this project.

```bash
# Build image
docker build -t voucherfinder:latest .

# Run container (port 3000)
docker run -d \
  --name voucherfinder \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SITE_URL=https://voucherfinder.app \
  -e NEXT_PUBLIC_INTERNAL_API_URL=http://localhost:3000 \
  -e SESSION_SECRET=<your-secret> \
  -e SESSION_VERSION=1 \
  -e ADMIN_PASSWORD_HASH=<your-hash> \
  --restart unless-stopped \
  voucherfinder:latest
```

Or with Docker Compose (recommended for local dev):

```bash
docker compose up -d
```

> **HTTPS note:** Docker serves plain HTTP. Put Nginx or Caddy in front for HTTPS termination, or enable HTTPS via your hosting platform's load balancer / Cloudflare.

---

### Option B — VPS (Ubuntu/Debian — systemd)

```bash
# 1. Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone / copy project
git clone https://github.com/your-org/voucherfinder.git
cd voucherfinder
npm ci

# 3. Set environment
cp .env.example .env.production
nano .env.production   # fill in real values

# 4. Build
npm run build

# 5. Install systemd service
sudo tee /etc/systemd/system/voucherfinder.service <<'EOF'
[Unit]
Description=VoucherFinder Next.js App
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/voucherfinder
ExecStart=/usr/bin/node .next/standalone/server.js
Environment=NODE_ENV=production
EnvironmentFile=/path/to/voucherfinder/.env.production
Restart=on-failure
RestartSec=5s
User=www-data

[Install]
WantedBy=multi-user.target
EOF

# 6. Enable and start
sudo systemctl daemon-reload
sudo systemctl enable voucherfinder
sudo systemctl start voucherfinder

# 7. Check status
sudo systemctl status voucherfinder
```

**Nginx reverse proxy (HTTPS):**

```nginx
# /etc/nginx/sites-available/voucherfinder
server {
    listen 80;
    server_name voucherfinder.app www.voucherfinder.app;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name voucherfinder.app www.voucherfinder.app;

    ssl_certificate     /etc/ssl/voucherfinder.crt;
    ssl_certificate_key /etc/ssl/voucherfinder.key;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Next.js static assets (from .next/static)
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Next.js image optimization
    location /_next/image {
        proxy_pass http://127.0.0.1:3000;
    }

    # Everything else → Next.js
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
}
```

```bash
sudo ln -s /etc/nginx/sites-available/voucherfinder /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Option C — Railway

1. Connect your GitHub repo at [railway.app](https://railway.app)
2. Set environment variables in Railway dashboard:
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_INTERNAL_API_URL`
   - `SESSION_SECRET`
   - `SESSION_VERSION`
   - `ADMIN_PASSWORD_HASH`
3. Railway auto-detects Next.js → builds and deploys.
4. Add custom domain in Settings → Networking → Domains.

---

### Option D — Vercel

**Note:** The admin dashboard (Next.js) can be deployed to Vercel, but the MasOffer sync requires the **Control Plane Express server** to be deployed separately (Railway, Render, or VPS). MasOffer uses HTTP/1.1 `https.request` which is not available in Vercel serverless functions.

**Architecture:**
```
Browser → Vercel (Next.js) → Railway (Control Plane / Express) → MasOffer API + Supabase
```

**Step 1 — Deploy Control Plane to Railway (first):**
1. Push code to GitHub
2. Connect to Railway: https://railway.app
3. Add environment variables (see below)
4. Railway auto-detects Node.js → builds and starts on port `3001`
5. Note your Railway deployment URL (e.g. `https://my-app.up.railway.app`)

**Step 2 — Deploy Admin Dashboard to Vercel:**
1. Push code to GitHub
2. Import project at https://vercel.com
3. Select the `apps/admin-dashboard` directory as root
4. Vercel auto-detects Next.js via `vercel.json`
5. Set environment variables (see below)
6. Deploy

**Required environment variables:**

**Railway (Control Plane):**
| Variable | Value |
|---|---|
| `PORT` | `3001` |
| `MASOFFER_API_TOKEN` | **Set your real MasOffer API token** |
| `MASOFFER_PUBLISHER_ID` | **Set your real MasOffer Publisher ID** |
| `ACCESSTRADE_API_KEY` | **Set your real AccessTrade API key** |
| `SUPABASE_URL` | **Set your real Supabase project URL** |
| `SUPABASE_SERVICE_ROLE_KEY` | **Set your real Supabase service role key** |
| `CONTROL_PLANE_INTERNAL_SECRET` | **Generate: `openssl rand -hex 24`** |
| `SYNC_SHARED_SECRET` | **Generate: `openssl rand -hex 32`** (must match GitHub Secret `SYNC_SHARED_SECRET`) |

**Vercel (Admin Dashboard):**
| Variable | Scope | Value |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | All | `https://your-production-domain.com` |
| `INTERNAL_API_URL` | Production only | `https://your-railway-app.up.railway.app` |
| `SESSION_SECRET` | Production only | **Generate: `openssl rand -hex 48`** |
| `SESSION_VERSION` | All | `1` |
| `ADMIN_PASSWORD_HASH` | Production only | **Generate: `node -e "console.log(require('bcryptjs').hashSync('pass',10))"`** |
| `CONTROL_PLANE_INTERNAL_SECRET` | Production only | **Same value as Railway** |
| `SUPABASE_URL` | Production only | **Set your real Supabase URL** |
| `SUPABASE_SERVICE_ROLE_KEY` | Production only | **Set your real Supabase service role key** |
| `ACCESSTRADE_API_KEY` | Production only | **Set your real AccessTrade API key** |
| `MASOFFER_PUBLISHER_ID` | Production only | **Set your real MasOffer Publisher ID** |
| `MASOFFER_API_TOKEN` | Production only | **Set your real MasOffer API token** |
| `SYNC_SHARED_SECRET` | Production only | **Same value as GitHub Secret `SYNC_SHARED_SECRET`** |

> `INTERNAL_API_URL` is server-side only (not exposed to browser) — use a private environment variable in Vercel.

---

### Option E — Render

1. Create Web Service at [render.com](https://render.com)
2. Connect GitHub repo
3. Build command: `npm run build`
4. Start command: `node .next/standalone/server.js`
5. Set environment variables in dashboard
6. Add custom domain in Settings

---

## Step 5 — HTTPS

| Platform | HTTPS |
|---|---|
| Vercel | Automatic (free) |
| Railway | Automatic via Railway Domains |
| Render | Automatic with paid plan, or bring your own cert |
| VPS + Nginx | Bring your own cert (Let's Encrypt, Cloudflare) |
| Docker behind Cloudflare | Edge HTTPS via Cloudflare, HTTP to container |

### Let's Encrypt (Nginx / VPS)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d voucherfinder.app -d www.voucherfinder.app
```

Certs auto-renew via `certbot renew`.

---

## Step 6 — Post-Deploy Verification

Run through this checklist after going live:

### Functional checks

```bash
# 1. Site loads at your domain
curl -sI https://voucherfinder.app/home | grep HTTP

# 2. Healthcheck endpoint
curl https://voucherfinder.app/api/health

# 3. sitemap.xml exists and contains correct domain
curl -s https://voucherfinder.app/sitemap.xml | grep url

# 4. robots.txt reflects correct domain
curl -s https://voucherfinder.app/robots.txt | grep Sitemap

# 5. OG image accessible
curl -sI https://voucherfinder.app/og-default.png | grep HTTP

# 6. Favicon accessible
curl -sI https://voucherfinder.app/favicon.svg | grep HTTP

# 7. Admin login page loads (should redirect unauthenticated users)
curl -sI https://voucherfinder.app/admin/login | grep HTTP
```

### SEO checks

- [ ] `https://voucherfinder.app/sitemap.xml` → submitted to Google Search Console
- [ ] `https://voucherfinder.app/robots.txt` → visible to Googlebot
- [ ] `https://voucherfinder.app/home` → `<link rel="canonical">` correct
- [ ] OG image renders correctly when shared on Facebook/Discord
- [ ] Twitter Card shows preview when link is posted on X (Twitter)
- [ ] Run `npx lighthouse https://voucherfinder.app/home --only-categories=seo` — score ≥ 90

### Security checks

- [ ] `/admin/` routes return `noindex` header
- [ ] `/api/` routes do not expose internal data to anonymous users
- [ ] Session cookie has `Secure; HttpOnly; SameSite=Strict` flags
- [ ] No `localhost` URLs in page source of the production build

---

## Environment Variable Reference

| Variable | Public? | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | ✅ Browser | **Yes** | Canonical base URL |
| `NEXT_PUBLIC_INTERNAL_API_URL` | ✅ Browser | **Yes** | Internal API rewrite target |
| `NEXT_PUBLIC_GSC_VERIFY` | ✅ Browser | No | GSC meta tag content |
| `SESSION_SECRET` | ❌ Server only | **Yes** | HMAC signing key (min 48 hex chars) |
| `SESSION_VERSION` | ❌ Server only | **Yes** | Session version (increment to revoke all) |
| `ADMIN_PASSWORD_HASH` | ❌ Server only | **Yes** | bcrypt hash of admin password |
| `UPSTASH_REDIS_URL` | ❌ Server only | No | Redis for async job queue |
| `UPSTASH_RATE_LIMIT_TOKEN` | ❌ Server only | No | Upstash rate limiting |

---

## Troubleshooting

### "Cannot find module" errors after build

```bash
npm ci
npm run build
```

Do NOT use `npm install` — use `npm ci` to install exact versions from lockfile.

### Metadata / sitemap points to wrong domain

Ensure `NEXT_PUBLIC_SITE_URL` is set **at build time** (not just runtime), or set it in your hosting platform's environment variables and redeploy. Next.js reads env vars at build time for `output: 'standalone'`.

### CORS errors with internal API

All internal API calls go through `/api/internal/` rewrites defined in `next.config.js`. Never call the internal URL directly from the browser. The `NEXT_PUBLIC_INTERNAL_API_URL` only controls the rewrite destination on the server side.

### Admin login not working

1. Check `SESSION_SECRET` matches between deployments
2. Check `ADMIN_PASSWORD_HASH` is a valid bcrypt hash (starts with `$2a$` or `$2b$`)
3. Check browser allows cookies from your domain
4. Increment `SESSION_VERSION` to invalidate old sessions after password changes

### Lighthouse score < 90

Run: `npx lighthouse https://your-domain.com/home --output=json --only-categories=performance,seo,accessibility,best-practices`

### Image 500 errors

Next.js Image Optimization (`/_next/image`) requires the `images.domains` config in `next.config.js` if you're using external image URLs. Currently no external images are used, so this should not occur.

---

## Updating the Site

```bash
# Pull latest code
git pull origin main

# Rebuild (env vars persist via platform or .env.production)
npm ci
npm run build

# Restart service
# Docker
docker compose up -d --build

# systemd
sudo systemctl restart voucherfinder

# PM2 (if using PM2)
pm2 restart voucherfinder
```
