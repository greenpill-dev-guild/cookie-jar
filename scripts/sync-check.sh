#!/bin/bash

# 🔍 Cookie Jar - Deployment Sync Checker
# Verifies that contract deployment files are synchronized between contracts/ and client/

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking deployment file synchronization..."

# Check if deployment files exist
CONTRACTS_FILE="contracts/local-deployment.json"
CLIENT_FILE="client/public/contracts/local-deployment.json"

if [ ! -f "$CONTRACTS_FILE" ]; then
    echo -e "${RED}❌ $CONTRACTS_FILE not found${NC}"
    exit 1
fi

if [ ! -f "$CLIENT_FILE" ]; then
    echo -e "${RED}❌ $CLIENT_FILE not found${NC}"
    echo -e "${YELLOW}💡 Run 'pnpm copy:deployment' to sync files${NC}"
    exit 1
fi

# Parse and compare factory addresses
CONTRACTS_FACTORY=$(node -e "
try {
    const data = JSON.parse(require('fs').readFileSync('$CONTRACTS_FILE', 'utf8'));
    console.log(data.CookieJarFactory || 'NOT_FOUND');
} catch(e) {
    console.log('PARSE_ERROR');
}")

CLIENT_FACTORY=$(node -e "
try {
    const data = JSON.parse(require('fs').readFileSync('$CLIENT_FILE', 'utf8'));
    console.log(data.CookieJarFactory || 'NOT_FOUND');
} catch(e) {
    console.log('PARSE_ERROR');
}")

# Check results
if [ "$CONTRACTS_FACTORY" = "PARSE_ERROR" ] || [ "$CLIENT_FACTORY" = "PARSE_ERROR" ]; then
    echo -e "${RED}❌ Failed to parse deployment files${NC}"
    exit 1
fi

if [ "$CONTRACTS_FACTORY" = "NOT_FOUND" ] || [ "$CLIENT_FACTORY" = "NOT_FOUND" ]; then
    echo -e "${RED}❌ CookieJarFactory address not found in deployment files${NC}"
    exit 1
fi

# Compare addresses
if [ "$CONTRACTS_FACTORY" = "$CLIENT_FACTORY" ]; then
    echo -e "${GREEN}✅ Factory addresses match: ✅${NC}"
    echo -e "${GREEN}🏭 Factory: $CONTRACTS_FACTORY${NC}"
    echo -e "${GREEN}📄 Deployment files are synchronized${NC}"
else
    echo -e "${RED}❌ Factory addresses DO NOT match${NC}"
    echo -e "${YELLOW}📄 Contracts: $CONTRACTS_FACTORY${NC}"
    echo -e "${YELLOW}📄 Client:    $CLIENT_FACTORY${NC}"
    echo -e "${YELLOW}💡 Run 'pnpm copy:deployment' to sync files${NC}"
    exit 1
fi
