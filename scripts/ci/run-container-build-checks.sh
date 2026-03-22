#!/bin/bash
# =============================================================================
# Container Build Checks
# =============================================================================
# Validates container builds for all runtime roles.
#
# Exit codes:
#   0 - All containers built successfully
#   1 - One or more containers failed
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
REGISTRY=""
TAG="latest"
VERBOSE=false

# Usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --registry REGISTRY    Container registry"
    echo "  --tag TAG             Image tag"
    echo "  --verbose            Verbose output"
    echo "  --help              Show this help"
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --registry) REGISTRY="$2"; shift 2 ;;
        --tag) TAG="$2"; shift 2 ;;
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
echo "  Container Build Checks"
echo "======================================"
echo ""

# Check Docker availability
if ! command -v docker &> /dev/null; then
    log_fail "Docker not available"
    exit 1
fi

# Check for Dockerfiles
DOCKERFILES=$(ls Dockerfile.* 2>/dev/null || echo "")
if [ -z "$DOCKERFILES" ]; then
    log_fail "No Dockerfiles found"
    exit 1
fi

log_info "Found Dockerfiles: $DOCKERFILES"
echo ""

# Build each Dockerfile
SUCCESS=0
FAILED=0

for dockerfile in $DOCKERFILES; do
    ROLE=$(basename "$dockerfile" | sed 's/Dockerfile\.//')
    IMAGE_NAME="affiliate-check:${ROLE}"

    echo -e "${BLUE}[Building]${NC} $ROLE..."

    if [ "$VERBOSE" = true ]; then
        if docker build -f "$dockerfile" --target runner -t "$IMAGE_NAME" .; then
            log_pass "$ROLE built successfully"
            SUCCESS=$((SUCCESS + 1))
        else
            log_fail "$ROLE build failed"
            FAILED=$((FAILED + 1))
        fi
    else
        if docker build -f "$dockerfile" --target runner -t "$IMAGE_NAME" . > /dev/null 2>&1; then
            log_pass "$ROLE built successfully"
            SUCCESS=$((SUCCESS + 1))
        else
            log_fail "$ROLE build failed"
            FAILED=$((FAILED + 1))
        fi
    fi
done

echo ""
echo "======================================"
echo "  Container Build Summary"
echo "======================================"
echo ""
echo "Successful: $SUCCESS"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
    log_fail "Container build checks failed"
    exit 1
else
    log_pass "All container builds successful"
    exit 0
fi
