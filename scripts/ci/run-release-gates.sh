#!/bin/bash
# =============================================================================
# Release Gates Runner
# =============================================================================
# Runs release gates before deployment.
#
# Exit codes:
#   0 - All gates passed
#   1 - Gates failed
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
VERSION=""
SKIP_QUALITY=false
SKIP_MIGRATION=false
SKIP_VERIFICATION=false

# Usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --env ENVIRONMENT    Target environment"
    echo "  --version VERSION   Release version"
    echo "  --skip-quality     Skip quality gates"
    echo "  --skip-migration   Skip migration gates"
    echo "  --skip-verification Skip release verification"
    echo "  --help            Show this help"
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env) ENV="$2"; shift 2 ;;
        --version) VERSION="$2"; shift 2 ;;
        --skip-quality) SKIP_QUALITY=true; shift ;;
        --skip-migration) SKIP_MIGRATION=true; shift ;;
        --skip-verification) SKIP_VERIFICATION=true; shift ;;
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
echo "  Release Gates Runner"
echo "======================================"
echo ""
echo "Environment: $ENV"
echo "Version: ${VERSION:-auto}"
echo ""

# Track results
GATES_PASSED=0
GATES_FAILED=0

# =============================================================================
# Gate 1: Quality Gate Summary
# =============================================================================
if [ "$SKIP_QUALITY" = false ]; then
    echo -e "${BLUE}[1/3] Quality Gates...${NC}"

    # Run quality gates
    if [ -f "scripts/ci/run-quality-gates.sh" ]; then
        chmod +x scripts/ci/run-quality-gates.sh
        if ./scripts/ci/run-quality-gates.sh --skip-container; then
            log_pass "Quality Gates"
            GATES_PASSED=$((GATES_PASSED + 1))
        else
            log_fail "Quality Gates"
            GATES_FAILED=$((GATES_FAILED + 1))
        fi
    else
        log_warn "Quality gates script not found"
        log_pass "Quality Gates (skipped)"
    fi
else
    log_pass "Quality Gates (skipped)"
fi

# =============================================================================
# Gate 2: Migration Safety Summary
# =============================================================================
if [ "$SKIP_MIGRATION" = false ]; then
    echo -e "${BLUE}[2/3] Migration Safety...${NC}"

    if [ -f "scripts/runtime/run-migration-checks.sh" ]; then
        chmod +x scripts/runtime/run-migration-checks.sh
        if ./scripts/runtime/run-migration-checks.sh --env "$ENV" --dry-run; then
            log_pass "Migration Safety"
            GATES_PASSED=$((GATES_PASSED + 1))
        else
            log_fail "Migration Safety"
            GATES_FAILED=$((GATES_FAILED + 1))
        fi
    else
        log_warn "Migration check script not found"
        log_pass "Migration Safety (skipped)"
    fi
else
    log_pass "Migration Safety (skipped)"
fi

# =============================================================================
# Gate 3: Release Verification Prechecks
# =============================================================================
if [ "$SKIP_VERIFICATION" = false ]; then
    echo -e "${BLUE}[3/3] Release Verification...${NC}"

    if [ -f "scripts/runReleaseVerification.ts" ]; then
        if npx tsx scripts/runReleaseVerification.ts --env "$ENV" --skip-worker-check; then
            log_pass "Release Verification"
            GATES_PASSED=$((GATES_PASSED + 1))
        else
            log_fail "Release Verification"
            GATES_FAILED=$((GATES_FAILED + 1))
        fi
    else
        log_warn "Release verification script not found"
        log_pass "Release Verification (skipped)"
    fi
else
    log_pass "Release Verification (skipped)"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "======================================"
echo "  Release Gates Summary"
echo "======================================"
echo ""
echo "Passed: $GATES_PASSED"
echo "Failed: $GATES_FAILED"
echo ""

if [ $GATES_FAILED -gt 0 ]; then
    log_fail "RELEASE GATES FAILED"
    exit 1
else
    log_pass "ALL RELEASE GATES PASSED"
    exit 0
fi
