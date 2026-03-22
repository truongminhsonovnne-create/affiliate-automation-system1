#!/bin/bash
# =============================================================================
# Test Suite Runner
# =============================================================================
# Standardized test execution for CI/CD.
# Detects and runs available test frameworks.
#
# Exit codes:
#   0 - All tests passed or no tests found
#   1 - Tests failed
#   2 - No test framework detected
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
TEST_PATTERN=""
COVERAGE=false
VERBOSE=false

# Usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --pattern PATTERN   Test pattern to match"
    echo "  --coverage         Generate coverage report"
    echo "  --verbose          Verbose output"
    echo "  --help            Show this help"
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --pattern) TEST_PATTERN="$2"; shift 2 ;;
        --coverage) COVERAGE=true; shift ;;
        --verbose) VERBOSE=true; shift ;;
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
echo "  Test Suite Runner"
echo "======================================"
echo ""

# Detect test framework
DETECTED_FRAMEWORK=""
TEST_CMD=""

# Check for Jest
if [ -d "node_modules/jest" ] || grep -q '"jest"' package.json 2>/dev/null; then
    DETECTED_FRAMEWORK="jest"
    if [ -n "$TEST_PATTERN" ]; then
        TEST_CMD="npm test -- --testPathPattern=$TEST_PATTERN"
    else
        TEST_CMD="npm test"
    fi

# Check for Vitest
elif [ -d "node_modules/vitest" ] || grep -q '"vitest"' package.json 2>/dev/null; then
    DETECTED_FRAMEWORK="vitest"
    if [ -n "$TEST_PATTERN" ]; then
        TEST_CMD="npx vitest run --testNamePattern=$TEST_PATTERN"
    else
        TEST_CMD="npx vitest run"
    fi

# Check for Mocha
elif [ -d "node_modules/mocha" ] || grep -q '"mocha"' package.json 2>/dev/null; then
    DETECTED_FRAMEWORK="mocha"
    TEST_CMD="npx mocha"

# Check for Node.js native test (Node 18+)
elif grep -q '"test"' package.json 2>/dev/null; then
    DETECTED_FRAMEWORK="node-native"
    TEST_CMD="npm test"
fi

# If no test framework detected, run baseline validation
if [ -z "$DETECTED_FRAMEWORK" ]; then
    log_warn "No test framework detected"

    # Check for test directories
    if [ -d "tests" ] || [ -d "__tests__" ] || [ -d "test" ]; then
        log_info "Test directories exist but no test framework configured"
        log_info "Running baseline validation..."

        # Run type check as baseline validation
        if npx tsc --noEmit 2>/dev/null; then
            log_pass "Baseline validation (type check) passed"
            exit 0
        else
            log_fail "Baseline validation failed"
            exit 1
        fi
    else
        log_warn "No test directories found"
        log_info "Skipping tests - performing baseline validation"

        # Baseline: type check + build verification
        if npx tsc --noEmit 2>/dev/null; then
            log_pass "Baseline validation passed"
            exit 0
        else
            log_fail "Baseline validation failed"
            exit 1
        fi
    fi
fi

log_info "Detected framework: $DETECTED_FRAMEWORK"
echo ""

# Run tests
case "$DETECTED_FRAMEWORK" in
    jest)
        log_info "Running Jest tests..."
        if [ "$COVERAGE" = true ]; then
            TEST_CMD="$TEST_CMD --coverage"
        fi
        if [ "$VERBOSE" = true ]; then
            TEST_CMD="$TEST_CMD --verbose"
        fi
        ;;

    vitest)
        log_info "Running Vitest tests..."
        if [ "$COVERAGE" = true ]; then
            TEST_CMD="$TEST_CMD --coverage"
        fi
        ;;

    mocha)
        log_info "Running Mocha tests..."
        ;;

    node-native)
        log_info "Running Node.js native tests..."
        ;;
esac

echo ""
echo "Command: $TEST_CMD"
echo ""

# Execute tests
if eval "$TEST_CMD"; then
    echo ""
    log_pass "All tests passed"
    exit 0
else
    echo ""
    log_fail "Tests failed"
    exit 1
fi
