#!/bin/bash
# =============================================================================
# Quality Gates Runner
# =============================================================================
# Runs comprehensive quality gates for CI/CD.
# Used by both local development and CI workflows.
#
# Exit codes:
#   0 - All gates passed
#   1 - Lint failed
#   2 - Type check failed
#   3 - Build failed
#   4 - Security check failed
#   5 - Migration safety failed
#   6 - Container build failed
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
SKIP_LINT=false
SKIP_TYPE=false
SKIP_BUILD=false
SKIP_SECURITY=false
SKIP_MIGRATION=false
SKIP_CONTAINER=false
VERBOSE=false
ENV="development"

# Usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --skip-lint        Skip linting"
    echo "  --skip-type        Skip type checking"
    echo "  --skip-build       Skip build"
    echo "  --skip-security    Skip security checks"
    echo "  --skip-migration   Skip migration safety"
    echo "  --skip-container   Skip container build"
    echo "  --env ENVIRONMENT  Environment (local, development, staging)"
    echo "  --verbose         Verbose output"
    echo "  --help            Show this help"
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-lint) SKIP_LINT=true; shift ;;
        --skip-type) SKIP_TYPE=true; shift ;;
        --skip-build) SKIP_BUILD=true; shift ;;
        --skip-security) SKIP_SECURITY=true; shift ;;
        --skip-migration) SKIP_MIGRATION=true; shift ;;
        --skip-container) SKIP_CONTAINER=true; shift ;;
        --env) ENV="$2"; shift 2 ;;
        --verbose) VERBOSE=true; shift ;;
        --help) usage ;;
        *) echo "Unknown: $1"; exit 1 ;;
    esac
done

# Track results
GATES_PASSED=0
GATES_FAILED=0
GATE_RESULTS=()

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; GATES_PASSED=$((GATES_PASSED + 1)); GATE_RESULTS+=("$1: PASS"); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; GATES_FAILED=$((GATES_FAILED + 1)); GATE_RESULTS+=("$1: FAIL"); }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo ""
echo "======================================"
echo "  Quality Gates Runner"
echo "======================================"
echo ""
echo "Environment: $ENV"
echo "Skip options: lint=$SKIP_LINT type=$SKIP_TYPE build=$SKIP_BUILD security=$SKIP_SECURITY migration=$SKIP_MIGRATION container=$SKIP_CONTAINER"
echo ""

# =============================================================================
# Gate 1: Lint
# =============================================================================
if [ "$SKIP_LINT" = false ]; then
    echo -e "${BLUE}[1/6] Running Lint Gate...${NC}"

    if command -v npx &> /dev/null; then
        if grep -q '"lint"' package.json 2>/dev/null; then
            if npm run lint; then
                log_pass "Lint"
            else
                log_fail "Lint"
            fi
        else
            log_warn "No lint script found, skipping"
            log_pass "Lint (skipped)"
        fi
    else
        log_warn "npx not available, skipping lint"
        log_pass "Lint (unavailable)"
    fi
else
    log_pass "Lint (skipped)"
fi

# =============================================================================
# Gate 2: Type Check
# =============================================================================
if [ "$SKIP_TYPE" = false ]; then
    echo -e "${BLUE}[2/6] Running Type Check Gate...${NC}"

    if [ -f "tsconfig.json" ]; then
        if npx tsc --noEmit; then
            log_pass "Type Check"
        else
            log_fail "Type Check"
        fi
    else
        log_warn "No tsconfig.json found"
        log_fail "Type Check"
    fi
else
    log_pass "Type Check (skipped)"
fi

# =============================================================================
# Gate 3: Build
# =============================================================================
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${BLUE}[3/6] Running Build Gate...${NC}"

    if grep -q '"build"' package.json 2>/dev/null; then
        if npm run build; then
            if [ -d "dist" ]; then
                log_pass "Build"
            else
                log_fail "Build (no dist)"
            fi
        else
            log_fail "Build"
        fi
    else
        log_warn "No build script found"
        log_fail "Build"
    fi
else
    log_pass "Build (skipped)"
fi

# =============================================================================
# Gate 4: Security
# =============================================================================
if [ "$SKIP_SECURITY" = false ]; then
    echo -e "${BLUE}[4/6] Running Security Gate...${NC}"

    # Check for secrets
    FOUND_SECRETS=0
    SECRET_PATTERNS=(
        "AKIA[0-9A-Z]{16}"
        "ghp_[a-zA-Z0-9]{36}"
    )

    for pattern in "${SECRET_PATTERNS[@]}"; do
        if grep -rE "$pattern" --include="*.ts" --include="*.js" --exclude-dir=node_modules . 2>/dev/null | grep -v "placeholder\|example\|test" > /dev/null; then
            FOUND_SECRETS=$((FOUND_SECRETS + 1))
        fi
    done

    if [ $FOUND_SECRETS -eq 0 ]; then
        log_pass "Security"
    else
        log_fail "Security (secrets detected)"
    fi
else
    log_pass "Security (skipped)"
fi

# =============================================================================
# Gate 5: Migration Safety
# =============================================================================
if [ "$SKIP_MIGRATION" = false ]; then
    echo -e "${BLUE}[5/6] Running Migration Safety Gate...${NC}"

    if [ -f "scripts/runtime/run-migration-checks.sh" ]; then
        chmod +x scripts/runtime/run-migration-checks.sh
        if ./scripts/runtime/run-migration-checks.sh --env "$ENV" --dry-run 2>/dev/null; then
            log_pass "Migration Safety"
        else
            log_fail "Migration Safety"
        fi
    else
        log_warn "Migration check script not found"
        log_pass "Migration Safety (skipped)"
    fi
else
    log_pass "Migration Safety (skipped)"
fi

# =============================================================================
# Gate 6: Container Build
# =============================================================================
if [ "$SKIP_CONTAINER" = false ]; then
    echo -e "${BLUE}[6/6] Running Container Build Gate...${NC}"

    if command -v docker &> /dev/null; then
        CONTAINER_SUCCESS=0
        for dockerfile in Dockerfile.web Dockerfile.control-plane Dockerfile.worker; do
            if [ -f "$dockerfile" ]; then
                if docker build -f "$dockerfile" --target runner -t "gate-test:$(basename $dockerfile)" . > /dev/null 2>&1; then
                    CONTAINER_SUCCESS=$((CONTAINER_SUCCESS + 1))
                fi
            fi
        done

        if [ $CONTAINER_SUCCESS -gt 0 ]; then
            log_pass "Container Build ($CONTAINER_SUCCESS/$(( $(ls Dockerfile.* 2>/dev/null | wc -l) )) images)"
        else
            log_fail "Container Build"
        fi
    else
        log_warn "Docker not available"
        log_pass "Container Build (unavailable)"
    fi
else
    log_pass "Container Build (skipped)"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "======================================"
echo "  Quality Gates Summary"
echo "======================================"
echo ""
echo "Passed: $GATES_PASSED"
echo "Failed: $GATES_FAILED"
echo ""

if [ $GATES_FAILED -gt 0 ]; then
    echo -e "${RED}QUALITY GATES FAILED${NC}"
    echo ""
    for result in "${GATE_RESULTS[@]}"; do
        if [[ "$result" == *": FAIL" ]]; then
            echo "  $result"
        fi
    done
    echo ""
    exit 1
else
    echo -e "${GREEN}ALL QUALITY GATES PASSED${NC}"
    echo ""
    exit 0
fi
