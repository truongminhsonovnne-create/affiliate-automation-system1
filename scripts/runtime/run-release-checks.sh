#!/bin/bash
# =============================================================================
# Release Verification Script
# =============================================================================
# Runs smoke tests and verification checks

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
SKIP_TESTS=false

# Usage function
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --env ENVIRONMENT    Environment (local, development, staging, production)"
    echo "  --url URL           Base URL for testing"
    echo "  --skip-tests       Skip test execution"
    echo "  --help             Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 --env staging --url https://staging.affiliate.local"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENV="$2"
            shift 2
            ;;
        --url)
            URL="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Affiliate Release Verification${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "Environment: ${YELLOW}$ENV${NC}"
echo -e "URL: ${YELLOW}${URL:-none}${NC}"
echo ""

# Check Node.js
echo -e "${GREEN}[1/5] Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "Node.js version: $NODE_VERSION"
else
    echo -e "${RED}Error: Node.js not found${NC}"
    exit 1
fi

# Check TypeScript compilation
echo -e "${GREEN}[2/5] Checking TypeScript compilation...${NC}"
if npm run build &> /dev/null; then
    echo -e "Build successful"
else
    echo -e "${RED}Error: TypeScript compilation failed${NC}"
    exit 1
fi

# Run security checks
echo -e "${GREEN}[3/5] Running security checks...${NC}"
if npm run security:check &> /dev/null; then
    echo -e "Security checks passed"
else
    echo -e "${YELLOW}Warning: Some security checks failed${NC}"
fi

# Run type check
echo -e "${GREEN}[4/5] Running type check...${NC}"
if npm run type-check &> /dev/null; then
    echo -e "Type check passed"
else
    echo -e "${RED}Error: Type check failed${NC}"
    exit 1
fi

# Run smoke tests if not skipped
if [ "$SKIP_TESTS" = false ]; then
    echo -e "${GREEN}[5/5] Running smoke tests...${NC}"

    # Run the release verification
    if node dist/scripts/runReleaseVerification.js --env="$ENV" --url="$URL"; then
        echo -e "Smoke tests passed"
    else
        echo -e "${RED}Error: Smoke tests failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}[5/5] Skipping smoke tests${NC}"
fi

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Release Verification Complete${NC}"
echo -e "${GREEN}======================================${NC}"
