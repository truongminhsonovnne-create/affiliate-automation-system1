#!/bin/bash
# =============================================================================
# Worker Runtime Bootstrap Script
# =============================================================================
# Starts a specific worker role

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default values
ROLE=""
ENV="local"

# Usage function
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --role WORKER_ROLE   Worker role (worker-crawler, worker-ai, worker-publisher, ops-runner)"
    echo "  --env ENVIRONMENT  Environment (local, development, staging, production)"
    echo "  --help             Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 --role worker-crawler --env local"
    echo "  $0 --role worker-ai --env staging"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --role)
            ROLE="$2"
            shift 2
            ;;
        --env)
            ENV="$2"
            shift 2
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

# Validate required arguments
if [ -z "$ROLE" ]; then
    echo -e "${RED}Error: --role is required${NC}"
    usage
    exit 1
fi

# Validate role
case $ROLE in
    worker-crawler|worker-ai|worker-publisher|ops-runner)
        ;;
    *)
        echo -e "${RED}Error: Invalid worker role: $ROLE${NC}"
        echo "Valid roles: worker-crawler, worker-ai, worker-publisher, ops-runner"
        exit 1
        ;;
esac

# Set environment
export RUNTIME_ROLE="$ROLE"
export RUNTIME_ENV="$ENV"
export NODE_ENV="$ENV"

# Print startup info
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Affiliate Worker Runtime${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Worker Role: ${YELLOW}$ROLE${NC}"
echo -e "Environment: ${YELLOW}$ENV${NC}"
echo ""

# Start the worker
echo -e "${GREEN}Starting worker...${NC}"

cd "$(dirname "$0")/.."

# Run the worker using node
node dist/scripts/runRuntime.js --role="$ROLE" --env="$ENV"
