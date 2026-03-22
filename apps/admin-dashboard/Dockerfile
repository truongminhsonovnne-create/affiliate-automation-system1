# ============================================================
# VoucherFinder — Production Dockerfile
# ============================================================
# Multi-stage build:
#   stage 1 (deps)    — install node_modules
#   stage 2 (builder) — run `next build`
#   stage 3 (runtime) — serve standalone output
#
# Build:
#   docker build -t voucherfinder:latest .
#
# Run:
#   docker run -d -p 3000:3000 voucherfinder:latest
#
# Or with compose (recommended):
#   docker compose up -d
# ============================================================

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy installed deps from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars — must be set here (not at runtime for standalone)
# Override with --build-arg or pass .env file
ARG NEXT_PUBLIC_SITE_URL=https://voucherfinder.app
ARG NEXT_PUBLIC_INTERNAL_API_URL=http://localhost:3000
ARG NEXT_PUBLIC_GSC_VERIFY=

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_INTERNAL_API_URL=$NEXT_PUBLIC_INTERNAL_API_URL
ENV NEXT_PUBLIC_GSC_VERIFY=$NEXT_PUBLIC_GSC_VERIFY
ENV NODE_ENV=production

RUN npm run build

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
# Copy static / public assets
COPY --from=builder /app/.next/static  ./.next/static
# Copy public directory
COPY --from=builder /app/public         ./public

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
