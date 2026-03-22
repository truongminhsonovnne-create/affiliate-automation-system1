#!/bin/bash
# =============================================================================
# Local Runtime Bootstrap Script
# =============================================================================
# Starts the runtime with appropriate role and environment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ROLE=""
ENV="local"
PORT=""

# Usage function
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --role RUNTIME_ROLE    Runtime role (web, control-plane, worker-crawler, worker-ai, worker-publisher, ops-runner)"
    echo "  --env ENVIRONMENT     Environment (local, development, staging, production)"
    echo "  --port PORT         Port for HTTP servers (default varies by role)"
    echo "  --help              Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 --role web --env local"
    echo "  $0 --role control-plane --env development"
    echo "  $0 --role worker-crawler --env staging"
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
        --port)
            PORT="$2"
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

# Set environment
export RUNTIME_ROLE="$ROLE"
export RUNTIME_ENV="$ENV"
export NODE_ENV="$ENV"

# Validate role
case $ROLE in
    web|control-plane|worker-crawler|worker-ai|worker-publisher|ops-runner)
        ;;
    *)
        echo -e "${RED}Error: Invalid role: $ROLE${NC}"
        echo "Valid roles: web, control-plane, worker-crawler, worker-ai, worker-publisher, ops-runner"
        exit 1
        ;;
esac

# Validate environment
case $ENV in
    local|development|staging|production)
        ;;
    *)
        echo -e "${RED}Error: Invalid environment: $ENV${NC}"
        echo "Valid environments: local, development, staging, production"
        exit 1
        ;;
esac

# Print startup info
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Affiliate System Runtime${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Role: ${YELLOW}$ROLE${NC}"
echo -e "Environment: ${YELLOW}$ENV${NC}"
echo ""

# Load environment file if exists
ENV_FILE=".env.$ENV"
if [ -f "$ENV_FILE" ]; then
    echo -e "Loading environment from ${GREEN}$ENV_FILE${NC}"
    set -a && source "$ENV_FILE" && set +a
fi

# Validate required environment variables
echo -e "${GREEN}Validating environment...${NC}"

MISSING_VARS=""

# Check common required vars
if [ -z "$SUPABASE_URL" ]; then
    MISSING_VARS="$MISSING_VARS SUPABASE_URL"
fi

if [ "$ROLE" != "web" ] && [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    MISSING_VARS="$MISSING_VARS SUPABASE_SERVICE_ROLE_KEY"
fi

if [ ! -z "$MISSING_VARS" ]; then
    echo -e "${RED}Error: Missing required environment variables:$MISSING_VARS${NC}"
    echo "Please set these in $ENV_FILE or environment"
    exit 1
fi

# Start the runtime
echo -e "${GREEN}Starting runtime...${NC}"

# Run the runtime
cd "$(dirname "$0")/.."

# Execute based on role
case $ROLE in
    web)
        echo "Starting web runtime..."
        npm run dev
        ;;
    control-plane)
        echo "Starting control-plane runtime..."
        npm run dev
        ;;
    worker-crawler|worker-ai|worker-publisher|ops-runner)
        echo "Starting $ROLE..."
        node dist/scripts/runRuntime.js --role="$ROLE" --env="$ENV"
        ;;
    *)
        echo -e "${RED}Unknown role: $ROLE${NC}"
        exit 1
        ;;
esac
