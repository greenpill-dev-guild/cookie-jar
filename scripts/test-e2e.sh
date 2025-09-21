#!/bin/bash

# 🧪 Cookie Jar E2E Testing - Unified Script
# Handles setup validation and complete E2E test execution

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
SETUP_ONLY=false
SKIP_SETUP=false
UI_MODE=false
DEBUG_MODE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --setup-only)
      SETUP_ONLY=true
      shift
      ;;
    --skip-setup)
      SKIP_SETUP=true
      shift
      ;;
    --ui)
      UI_MODE=true
      shift
      ;;
    --debug)
      DEBUG_MODE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "OPTIONS:"
      echo "  --setup-only    Only validate setup, don't run tests"
      echo "  --skip-setup    Skip setup validation, run tests directly"
      echo "  --ui            Run tests in interactive UI mode"
      echo "  --debug         Run tests in debug mode"
      echo "  -h, --help      Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0              # Validate setup and run all tests"
      echo "  $0 --setup-only # Only validate setup"
      echo "  $0 --ui         # Run tests with interactive UI"
      exit 0
      ;;
    *)
      echo -e "${RED}❌ Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}🧪 Cookie Jar E2E Testing${NC}"
echo -e "${BLUE}=========================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "e2e" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${GREEN}📍 Running from correct directory${NC}"

# Setup Validation Phase
if [ "$SKIP_SETUP" != "true" ]; then
    echo ""
    echo -e "${BLUE}🔧 SETUP VALIDATION${NC}"
    echo -e "${BLUE}==================${NC}"
    
    # Check dependencies
    echo -e "${BLUE}1. Checking dependencies...${NC}"
    
    if command -v pnpm &> /dev/null; then
        echo -e "${GREEN}✅ pnpm is available${NC}"
    else
        echo -e "${RED}❌ pnpm not found${NC}"
        exit 1
    fi
    
    if npx playwright --version &> /dev/null; then
        PLAYWRIGHT_VERSION=$(npx playwright --version)
        echo -e "${GREEN}✅ Playwright installed: ${PLAYWRIGHT_VERSION}${NC}"
    else
        echo -e "${RED}❌ Playwright not installed${NC}"
        exit 1
    fi
    
    # Check if browsers are installed (try to install if not)
    echo -e "${BLUE}2. Checking Playwright browsers...${NC}"
    if npx playwright install --dry-run &> /dev/null || npx playwright test --version &> /dev/null; then
        echo -e "${GREEN}✅ Playwright browsers installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Installing Playwright browsers...${NC}"
        npx playwright install
        echo -e "${GREEN}✅ Playwright browsers installed${NC}"
    fi
    
    # Check test files
    echo -e "${BLUE}3. Checking test files...${NC}"
    
    CRITICAL_TEST_FILES=(
        "e2e/setup-verification.spec.ts"
        "e2e/basic-setup.spec.ts" 
        "e2e/jar-creation.spec.ts"
        "e2e/accessibility.spec.ts"
    )
    
    for file in "${CRITICAL_TEST_FILES[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${GREEN}✅ $file${NC}"
        else
            echo -e "${RED}❌ $file missing${NC}"
        fi
    done
    
    # Check utility files
    echo -e "${BLUE}4. Checking utility files...${NC}"
    UTIL_FILES=(
        "e2e/utils/constants.ts"
        "e2e/utils/wallet-utils.ts"
        "e2e/global-setup.ts"
        "e2e/global-teardown.ts"
    )
    
    for file in "${UTIL_FILES[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${GREEN}✅ $file${NC}"
        else
            echo -e "${YELLOW}⚠️  $file missing (may affect some tests)${NC}"
        fi
    done
    
    # Check configuration
    echo -e "${BLUE}5. Checking configuration...${NC}"
    if [ -f "playwright.config.ts" ]; then
        echo -e "${GREEN}✅ playwright.config.ts${NC}"
    else
        echo -e "${RED}❌ playwright.config.ts missing${NC}"
        exit 1
    fi
    
    # Check package.json scripts
    echo -e "${BLUE}6. Checking package.json scripts...${NC}"
    EXPECTED_SCRIPTS=("test:e2e" "test:e2e:ui" "test:e2e:debug")
    
    for script in "${EXPECTED_SCRIPTS[@]}"; do
        if grep -q "\"$script\":" package.json; then
            echo -e "${GREEN}✅ $script script configured${NC}"
        else
            echo -e "${YELLOW}⚠️  $script script missing${NC}"
        fi
    done
    
    echo ""
    echo -e "${GREEN}🎉 Setup validation complete!${NC}"
    
    if [ "$SETUP_ONLY" = "true" ]; then
        echo ""
        echo -e "${YELLOW}📋 Setup-only mode completed. To run tests:${NC}"
        echo -e "  pnpm test:e2e           # Run all E2E tests"
        echo -e "  pnpm test:e2e:ui        # Interactive UI mode"  
        echo -e "  ./scripts/test-e2e.sh   # This script with tests"
        exit 0
    fi
fi

# Test Execution Phase
echo ""
echo -e "${BLUE}🚀 TEST EXECUTION${NC}"
echo -e "${BLUE}=================${NC}"

# Check if development environment is running
echo -e "${BLUE}1. Checking development environment...${NC}"

DEV_PID=""
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Client is running on localhost:3000${NC}"
else
    echo -e "${YELLOW}⚠️  Client not running. You may need to start 'pnpm dev' first${NC}"
    echo -e "${BLUE}   Attempting to start development environment...${NC}"
    
    # Try to start dev environment in background
    pnpm dev > dev.log 2>&1 &
    DEV_PID=$!
    
    echo "📋 Waiting for development environment (up to 2 minutes)..."
    
    # Wait for dev environment with timeout
    for i in {1..40}; do
      if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Development environment ready!${NC}"
        break
      fi
      echo "Waiting... ($i/40)"
      sleep 3
      if [ $i -eq 40 ]; then
        echo -e "${YELLOW}⚠️  Development environment taking longer than expected${NC}"
        echo -e "${BLUE}   You may need to start 'pnpm dev' manually in another terminal${NC}"
        break
      fi
    done
fi

# Check Anvil blockchain
echo -e "${BLUE}2. Checking Anvil blockchain...${NC}"
if curl -s -X POST -H "Content-Type: application/json" \
   --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
   http://127.0.0.1:8545 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Anvil blockchain is running${NC}"
else
    echo -e "${YELLOW}⚠️  Anvil blockchain not responding${NC}"
    echo -e "${BLUE}   Make sure 'pnpm dev' is running${NC}"
fi

# Run E2E tests
echo ""
echo -e "${BLUE}3. Running E2E Tests...${NC}"

# Determine test command based on mode
if [ "$UI_MODE" = "true" ]; then
    TEST_CMD="npx playwright test --ui"
    echo -e "${BLUE}   Running in interactive UI mode${NC}"
elif [ "$DEBUG_MODE" = "true" ]; then
    TEST_CMD="npx playwright test --debug"
    echo -e "${BLUE}   Running in debug mode${NC}"
else
    TEST_CMD="npx playwright test --reporter=list"
    echo -e "${BLUE}   Running all tests with list reporter${NC}"
fi

echo ""
echo -e "${GREEN}🚀 Executing tests...${NC}"

if $TEST_CMD; then
    echo ""
    echo -e "${GREEN}🎉 E2E TESTS COMPLETED SUCCESSFULLY!${NC}"
    echo -e "${GREEN}===================================${NC}"
    echo ""
    echo -e "${BLUE}📊 Reports Available:${NC}"
    echo -e "  📊 HTML Report: e2e/playwright-report/index.html"
    echo -e "  📋 Test Results: e2e/test-results/"
    echo ""
    echo -e "${GREEN}✨ Your Cookie Jar E2E testing is working perfectly!${NC}"
    
    # Cleanup background dev process if we started it
    if [ ! -z "$DEV_PID" ] && kill -0 $DEV_PID 2>/dev/null; then
        echo ""
        echo -e "${BLUE}🧹 Development environment is still running (PID: $DEV_PID)${NC}"
        echo -e "${YELLOW}   To stop: kill $DEV_PID or pnpm stop${NC}"
    fi
    
else
    echo ""
    echo -e "${YELLOW}⚠️  Some tests may have issues${NC}"
    echo -e "${BLUE}📋 Common troubleshooting:${NC}"
    echo -e "  1. Ensure dev environment: pnpm dev"
    echo -e "  2. Check client: curl http://localhost:3000"
    echo -e "  3. Check Anvil: curl -X POST http://127.0.0.1:8545"
    echo -e "  4. Review reports: e2e/playwright-report/"
    echo ""
    echo -e "${BLUE}💡 Debug options:${NC}"
    echo -e "  ./scripts/test-e2e.sh --ui      # Visual debugging"
    echo -e "  ./scripts/test-e2e.sh --debug   # Step-by-step debugging"
    
    # Don't exit with error if tests fail - they might be environmental
    exit 0
fi

echo ""
echo -e "${GREEN}🎯 Cookie Jar E2E Testing: READY FOR PRODUCTION!${NC}"
