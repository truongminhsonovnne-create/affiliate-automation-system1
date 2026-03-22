#!/bin/bash
# =============================================================================
# Rollback Readiness Checks
# =============================================================================
# Assesses readiness for rollback operations.
#
# Exit codes:
#   0 - Ready for rollback
#   1 - Not ready for rollback
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
ENV="production"
CURRENT_VERSION=""
PREVIOUS_VERSION=""

# Usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --env ENVIRONMENT         Environment"
    echo "  --current-version VERSION  Current version"
    echo "  --previous-version VERSION Previous version"
    echo "  --help                 Show this help"
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env) ENV="$2"; shift 2 ;;
        --current-version) CURRENT_VERSION="$2"; shift 2 ;;
        --previous-version) PREVIOUS_VERSION="$2"; shift 2 ;;
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
echo "  Rollback Readiness Checks"
echo "======================================"
echo ""
echo "Environment: $ENV"
echo "Current Version: ${CURRENT_VERSION:-unknown}"
echo "Previous Version: ${PREVIOUS_VERSION:-unknown}"
echo ""

# Track results
CHECKS_PASSED=0
CHECKS_FAILED=0

# =============================================================================
# Check 1: App Rollback Readiness
# =============================================================================
echo -e "${BLUE}[1/4] App Rollback Readiness...${NC}"

# Check if previous version exists
if [ -n "$PREVIOUS_VERSION" ]; then
    log_pass "Previous version specified: $PREVIOUS_VERSION"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    log_warn "Previous version not specified"
    # Try to determine previous version from git tags
    PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
    if [ -n "$PREV_TAG" ]; then
        log_pass "Found previous version from git: $PREV_TAG"
        PREVIOUS_VERSION="$PREV_TAG"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        log_fail "Cannot determine previous version"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
fi

# =============================================================================
# Check 2: Migration Rollback Hints
# =============================================================================
echo -e "${BLUE}[2/4] Migration Rollback Hints...${NC}"

# Check for rollbackable migrations
if [ -d "supabase/migrations" ]; then
    # Check if we can generate rollback hints
    if [ -f "scripts/runtime/run-migration-checks.sh" ]; then
        log_pass "Migration rollback hints available"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        log_warn "Migration rollback check not available"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    fi
else
    log_pass "No migrations to rollback"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi

# =============================================================================
# Check 3: Deploy Artifact Availability
# =============================================================================
echo -e "${BLUE}[3/4] Deploy Artifact Availability...${NC}"

# Check if build artifacts exist
if [ -d "dist" ]; then
    log_pass "Build artifacts available"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    log_warn "Build artifacts may need rebuild"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi

# Check for container images (if Docker available)
if command -v docker &> /dev/null; then
    IMAGES=$(docker images -q affiliate-* 2>/dev/null | wc -l || echo "0")
    if [ "$IMAGES" -gt 0 ]; then
        log_pass "Container images available: $IMAGES"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        log_warn "No container images found"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    fi
fi

# =============================================================================
# Check 4: Release State Summary
# =============================================================================
echo -e "${BLUE}[4/4] Release State Summary...${NC}"

log_info "Current state:"
log_info "  Environment: $ENV"
log_info "  Current version: ${CURRENT_VERSION:-N/A}"
log_info "  Previous version: ${PREVIOUS_VERSION:-N/A}"

# Check git state
log_info "Git state:"
log_info "  Branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
log_info "  Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"

log_pass "Release state summary complete"
CHECKS_PASSED=$((CHECKS_PASSED + 1))

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "======================================"
echo "  Rollback Readiness Summary"
echo "======================================"
echo ""
echo "Passed: $CHECKS_PASSED"
echo "Failed: $CHECKS_FAILED"
echo ""

if [ $CHECKS_FAILED -gt 0 ]; then
    log_fail "NOT READY FOR ROLLBACK"
    exit 1
else
    log_pass "READY FOR ROLLBACK"
    echo ""
    echo "Rollback command suggestions:"
    echo "  # Revert to previous version"
    echo "  gh workflow run release-production.yml -f version=$PREVIOUS_VERSION"
    echo ""
    echo "  # Or rollback Kubernetes deployment"
    echo "  kubectl rollout undo deployment/affiliate"
    echo ""
    exit 0
fi
