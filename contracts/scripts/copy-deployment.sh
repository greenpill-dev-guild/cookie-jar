#!/bin/bash

# 📄 Copy Contract Deployment Files to Frontend Public Directory
# This ensures the frontend can access contract addresses via HTTP

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}📄 Copying deployment files to frontend public directory...${NC}"

# Create public contracts directory if it doesn't exist
mkdir -p frontend/public/contracts

# Copy main deployment file
if [ -f "contracts/local-deployment.json" ]; then
    cp contracts/local-deployment.json frontend/public/contracts/local-deployment.json
    echo -e "${GREEN}✅ Copied local-deployment.json${NC}"
else
    echo -e "${YELLOW}⚠️  contracts/local-deployment.json not found${NC}"
fi

# Copy frontend contracts directory to public (for backwards compatibility)
if [ -d "frontend/contracts" ]; then
    cp -r frontend/contracts/* frontend/public/contracts/ 2>/dev/null || true
    echo -e "${GREEN}✅ Copied frontend/contracts/* to public/contracts/${NC}"
fi

# Copy seed data if it exists
if [ -f "contracts/seed-data.json" ]; then
    cp contracts/seed-data.json frontend/public/contracts/seed-data.json
    echo -e "${GREEN}✅ Copied seed-data.json${NC}"
fi

echo -e "${GREEN}📄 Deployment files ready for frontend access${NC}"
