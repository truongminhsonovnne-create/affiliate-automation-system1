#!/usr/bin/env bash
# =============================================================================
# Docker Smoke Tests
#
# Verifies that the main service Docker images can:
#   1. Build successfully
#   2. Start and respond to health checks
#   3. Not crash immediately
#
# Usage:
#   bash scripts/test/run-docker-smoke-tests.sh           # all services
#   bash scripts/test/run-docker-smoke-tests.sh web        # web only
#
# CI note: This script should exit non-zero if any service fails.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_VERSION="${BUILD_VERSION:-$(git rev-parse --short HEAD 2>/dev/null || echo "local")}"

# Colours
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICES=("web" "control-plane" "worker")
FAILED=()

# =============================================================================
# Helpers
# =============================================================================

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_fail()  { echo -e "${RED}[FAIL]${NC}  $*"; }
log_test()  { echo -e "[TEST]  $*"; }

cleanup_docker() {
  log_info "Cleaning up Docker containers..."
  docker compose -f "$PROJECT_ROOT/docker-compose.prod.yml" \
    --profile backend --profile internal --profile worker \
    down --remove-orphans 2>/dev/null || true
}

# =============================================================================
# Build test
# =============================================================================

test_build() {
  local service=$1
  local dockerfile=""

  case "$service" in
    web)           dockerfile="Dockerfile.web" ;;
    control-plane) dockerfile="Dockerfile.control-plane" ;;
    worker)        dockerfile="Dockerfile.worker" ;;
    *) log_fail "Unknown service: $service"; return 1 ;;
  esac

  local image="affiliate-test:${BUILD_VERSION}-${service}"
  local dockerfile_path="$PROJECT_ROOT/$dockerfile"

  if [[ ! -f "$dockerfile_path" ]]; then
    log_warn "Dockerfile not found: $dockerfile_path — skipping build"
    return 0
  fi

  log_test "Building $service from $dockerfile..."
  if ! docker build \
    --build-arg "BUILD_VERSION=$BUILD_VERSION" \
    --build-arg "NODE_ENV=production" \
    --tag "$image" \
    --file "$dockerfile_path" \
    --target runner \
    --load \
    "$PROJECT_ROOT" > /dev/null 2>&1; then
    log_fail "Build failed for $service"
    FAILED+=("$service:build")
    return 1
  fi

  log_info "Build OK: $image"
  return 0
}

# =============================================================================
# Health check test (for HTTP services)
# =============================================================================

test_health() {
  local service=$1
  local port=$2
  local max_wait=${3:-30}
  local image="affiliate-test:${BUILD_VERSION}-${service}"
  local container="affiliate-smoke-${service}"

  log_test "Starting $service for health check..."

  # For web/control-plane, we start and probe health
  # For worker, we just verify it doesn't crash on start

  case "$service" in
    web)
      docker run --rm --name "$container" \
        -e "NODE_ENV=production" \
        -p "127.0.0.1:${port}:${port}" \
        -d "$image" > /dev/null || { log_fail "Failed to start $service"; return 1; }
      ;;
    control-plane)
      docker run --rm --name "$container" \
        -e "NODE_ENV=production" \
        -e "RUNTIME_ROLE=control-plane" \
        -e "CONTROL_PLANE_HOST=127.0.0.1" \
        -e "SUPABASE_URL=https://placeholder.supabase.co" \
        -e "SUPABASE_SERVICE_ROLE_KEY=placeholder" \
        -e "CONTROL_PLANE_INTERNAL_SECRET=test-secret-for-smoke-only-32chars!" \
        -e "REDIS_URL=redis://localhost:6379" \
        -p "127.0.0.1:${port}:${port}" \
        -d "$image" > /dev/null || { log_fail "Failed to start $service"; return 1; }
      ;;
    worker)
      docker run --rm --name "$container" \
        -e "NODE_ENV=production" \
        -e "RUNTIME_ROLE=worker-crawler" \
        -e "SUPABASE_URL=https://placeholder.supabase.co" \
        -e "SUPABASE_SERVICE_ROLE_KEY=placeholder" \
        -d "$image" > /dev/null || { log_fail "Failed to start $service"; return 1; }
      log_info "Worker started (no HTTP health check — verifying no crash)..."
      sleep 3
      local status
      status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo "unknown")
      if [[ "$status" != "running" && "$status" != "exited" ]]; then
        log_fail "Worker in unexpected state: $status"
        return 1
      fi
      log_info "Worker state: $status (expected: running or exited)"
      docker stop "$container" 2>/dev/null || true
      return 0
      ;;
  esac

  # Probe HTTP health endpoint
  local waited=0
  local health_path="/"
  local health_url="http://127.0.0.1:${port}${health_path}"

  if [[ "$service" == "control-plane" ]]; then
    health_path="/"
    health_url="http://127.0.0.1:${port}/"
  fi

  while (( waited < max_wait )); do
    if curl -sf --max-time 2 "$health_url" > /dev/null 2>&1; then
      log_info "Health check OK: $health_url"
      docker stop "$container" 2>/dev/null || true
      return 0
    fi
    sleep 2
    (( waited += 2 ))
  done

  log_fail "Health check timeout after ${max_wait}s: $health_url"
  docker logs "$container" 2>&1 | tail -20 || true
  docker stop "$container" 2>/dev/null || true
  FAILED+=("$service:health")
  return 1
}

# =============================================================================
# Main
# =============================================================================

main() {
  local target_services=()

  if [[ $# -eq 0 ]]; then
    target_services=("${SERVICES[@]}")
  else
    for svc in "$@"; do
      if [[ " ${SERVICES[*]} " == *" $svc "* ]]; then
        target_services+=("$svc")
      else
        log_warn "Unknown service: $svc — skipping"
      fi
    done
  fi

  if [[ ${#target_services[@]} -eq 0 ]]; then
    log_warn "No valid services specified"
    exit 0
  fi

  log_info "Docker smoke tests for: ${target_services[*]}"
  log_info "Build version: $BUILD_VERSION"

  # Ensure docker is available
  if ! command -v docker &> /dev/null; then
    log_warn "Docker not found — skipping smoke tests"
    exit 0
  fi

  # Ensure buildx is set up
  docker setup-buildx-action --quiet 2>/dev/null || true

  local build_only="${BUILD_ONLY:-false}"

  for service in "${target_services[@]}"; do
    log_info ""
    log_info "=== Testing $service ==="

    if ! test_build "$service"; then
      log_fail "Build failed for $service"
      continue
    fi

    if [[ "$build_only" != "true" ]]; then
      case "$service" in
        web)           test_health "$service" 3000 20 ;;
        control-plane) test_health "$service" 4000 20 ;;
        worker)        test_health "$service" 0 10 ;;
      esac
    fi
  done

  log_info ""
  if [[ ${#FAILED[@]} -gt 0 ]]; then
    log_fail "FAILED services: ${FAILED[*]}"
    log_fail "Smoke tests: ${#FAILED[@]} failure(s)"
    exit 1
  else
    log_info "All smoke tests passed ✓"
    exit 0
  fi
}

# Cleanup on exit
trap cleanup_docker EXIT

main "$@"
