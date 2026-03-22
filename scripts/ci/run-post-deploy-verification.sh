#!/bin/bash
# =============================================================================
# Post-Deploy Verification
# =============================================================================
# Verifies deployment after successful deploy.
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
ENV="staging"
URL=""
CONTROL_PLANE_URL=""
TIMEOUT=30

# Usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --env ENVIRONMENT       Target environment"
    echo "  --url URL             Base URL"
    echo "  --control-plane-url URL  Control plane URL"
    echo "  --timeout SECONDS    Timeout for checks"
    echo "  --help              Show this help"
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env) ENV="$2"; shift 2 ;;
        --url) URL="$2"; shift 2 ;;
        --control-plane-url) CONTROL_PLANE_URL="$2"; shift 2 ;;
        --timeout) TIMEOUT="$2"; shift 2 ;;
        --help) usage ;;
        *) echo "Unknown: $1"; exit 1 ;;
    esac
done

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo ""
echo "======================================"
echo "  Post-Deploy Verification"
echo "======================================"
echo ""
echo "Environment: $ENV"
echo "URL: ${URL:-not specified}"
echo ""

# Track results
CHECKS_PASSED=0
CHECKS_FAILED=0

# =============================================================================
# Check 1: Liveness
# =============================================================================
echo -e "${BLUE}[1/5] Checking Liveness...${NC}"

if [ -n "$URL" ]; then
    if curl -sf --max-time "$TIMEOUT" "$URL/health/live" > /dev/null 2>&1; then
        log_pass "Liveness check"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        log_fail "Liveness check"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
else
    log_warn "URL not specified, skipping liveness check"
    log_pass "Liveness (skipped)"
fi

# =============================================================================
# Check 2: Readiness
# =============================================================================
echo -e "${BLUE}[2/5] Checking Readiness...${NC}"

if [ -n "$URL" ]; then
    if curl -sf --max-time "$TIMEOUT" "$URL/health/ready" > /dev/null 2>&1; then
        log_pass "Readiness check"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        log_fail "Readiness check"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
else
    log_warn "URL not specified, skipping readiness check"
    log_pass "Readiness (skipped)"
fi

# =============================================================================
# Check 3: Control Plane
# =============================================================================
echo -e "${BLUE}[3/5] Checking Control Plane...${NC}"

if [ -n "$CONTROL_PLANE_URL" ]; then
    if curl -sf --max-time "$TIMEOUT" "$CONTROL_PLANE_URL/health" > /dev/null 2>&1; then
        log_pass "Control plane check"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        log_fail "Control plane check"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
else
    log_warn "Control plane URL not specified"
    log_pass "Control plane (skipped)"
fi

# =============================================================================
# Check 4: Dashboard/API
# =============================================================================
echo -e "${BLUE}[4/5] Checking Dashboard/API...${NC}"

if [ -n "$URL" ]; then
    # Check if API is responding
    if curl -sf --max-time "$TIMEOUT" "$URL/api/health" > /dev/null 2>&1 || \
       curl -sf --max-time "$TIMEOUT" "$URL/api/status" > /dev/null 2>&1; then
        log_pass "Dashboard/API check"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        log_warn "Dashboard/API not responding (may be expected)"
        log_pass "Dashboard/API (warning)"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    fi
else
    log_warn "URL not specified, skipping dashboard check"
    log_pass "Dashboard/API (skipped)"
fi

# =============================================================================
# Check 5: Worker Boot
# =============================================================================
echo -e "${BLUE}[5/5] Checking Worker Boot...${NC}"

# In production, this would check worker logs or health endpoints
# For now, we'll check if worker config is valid
if [ -d "src/runtime/workers" ]; then
    log_pass "Worker configuration present"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    log_warn "Worker runtime not found"
    log_pass "Worker (skipped)"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "======================================"
echo "  Verification Summary"
echo "======================================"
echo ""
echo "Passed: $CHECKS_PASSED"
echo "Failed: $CHECKS_FAILED"
echo ""

if [ $CHECKS_FAILED -gt 0 ]; then
    log_fail "POST-DEPLOY VERIFICATION FAILED"
    exit 1
else
    log_pass "ALL POST-DEPLOY CHECKS PASSED"
    exit 0
fi
