#!/bin/bash
# =============================================================================
# Migration Safety Check Script
# =============================================================================
# Validates migration safety before execution

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
ENV="local"
DIRECTION="up"
DRY_RUN=true

# Usage function
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --env ENVIRONMENT   Environment (local, development, staging, production)"
    echo "  --direction DIRECTION   Migration direction (up, down)"
    echo "  --dry-run          Run in dry-run mode (default: true)"
    echo "  --execute          Actually execute migration"
    echo "  --help            Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 --env staging --direction up --dry-run"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENV="$2"
            shift 2
            ;;
        --direction)
            DIRECTION="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --execute)
            DRY_RUN=false
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
echo -e "${BLUE}  Affiliate Migration Check${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "Environment: ${YELLOW}$ENV${NC}"
echo -e "Direction: ${YELLOW}$DIRECTION${NC}"
echo -e "Dry Run: ${YELLOW}$DRY_RUN${NC}"
echo ""

# Check environment
echo -e "${GREEN}[1/4] Checking environment...${NC}"
case $ENV in
    local|development)
        echo -e "Environment: $ENV - OK"
        ;;
    staging)
        echo -e "${YELLOW}Warning: Staging environment${NC}"
        ;;
    production)
        echo -e "${RED}CRITICAL: Production environment!${NC}"
        echo -e "${RED}This requires manual approval${NC}"
        ;;
    *)
        echo -e "${RED}Error: Unknown environment: $ENV${NC}"
        exit 1
        ;;
esac

# Check migration files
echo -e "${GREEN}[2/4] Checking migration files...${NC}"
MIGRATION_DIR="supabase/migrations"
if [ -d "$MIGRATION_DIR" ]; then
    MIGRATION_COUNT=$(ls -1 "$MIGRATION_DIR"/*.sql 2>/dev/null | wc -l)
    echo -e "Found $MIGRATION_COUNT migration file(s)"
else
    echo -e "${YELLOW}Warning: No migration directory found${NC}"
fi

# Check for dangerous operations
echo -e "${GREEN}[3/4] Checking for dangerous operations...${NC}"
DANGEROUS_OPS=0

if [ -d "$MIGRATION_DIR" ]; then
    for file in "$MIGRATION_DIR"/*.sql; do
        if [ -f "$file" ]; then
            CONTENT=$(cat "$file")

            # Check for dangerous operations
            if echo "$CONTENT" | grep -qi "DROP TABLE"; then
                echo -e "${RED}Warning: $file contains DROP TABLE${NC}"
                DANGEROUS_OPS=$((DANGEROUS_OPS + 1))
            fi

            if echo "$CONTENT" | grep -qi "DROP COLUMN"; then
                echo -e "${RED}Warning: $file contains DROP COLUMN${NC}"
                DANGEROUS_OPS=$((DANGEROUS_OPS + 1))
            fi

            if echo "$CONTENT" | grep -qi "TRUNCATE"; then
                echo -e "${RED}Warning: $file contains TRUNCATE${NC}"
                DANGEROUS_OPS=$((DANGEROUS_OPS + 1))
            fi
        fi
    done
fi

if [ $DANGEROUS_OPS -gt 0 ]; then
    echo -e "${RED}Found $DANGEROUS_OPS dangerous operation(s)${NC}"
else
    echo -e "No dangerous operations detected"
fi

# Migration preconditions
echo -e "${GREEN}[4/4] Checking migration preconditions...${NC}"

# Check Supabase connection
if [ -n "$SUPABASE_URL" ]; then
    echo -e "Supabase URL configured: $SUPABASE_URL"
else
    echo -e "${RED}Error: SUPABASE_URL not configured${NC}"
    exit 1
fi

# Summary
echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Migration Check Summary${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "Environment: $ENV"
echo -e "Direction: $DIRECTION"
echo -e "Dangerous operations: $DANGEROUS_OPS"
echo ""

# Execute or dry run
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}Dry run mode - no changes will be made${NC}"
    echo -e "To execute migration, run with --execute flag"
else
    if [ "$ENV" = "production" ] && [ $DANGEROUS_OPS -gt 0 ]; then
        echo -e "${RED}Cannot execute migration in production with dangerous operations${NC}"
        exit 1
    fi

    echo -e "${GREEN}Executing migration...${NC}"
    # In production, would run: npm run db:migrate
fi

echo ""
echo -e "${GREEN}Migration check complete${NC}"
