#!/usr/bin/env bash

# 🚀 Cookie Jar - Multi-Network Deployment Script
# Supports Celo, Ethereum, and Base Sepolia with optimized defaults

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default network if none specified
NETWORK=${1:-"celo-alfajores"}

echo -e "${BLUE}🚀 Cookie Jar Multi-Network Deployment${NC}"
echo -e "${BLUE}======================================${NC}"

# Function to get network configuration
get_network_config() {
    case $1 in
        "celo")
            echo "https://forno.celo.org,42220,Deploy.s.sol:Deploy,CELO_MAINNET"
            ;;
        "celo-alfajores")
            echo "https://alfajores-forno.celo-testnet.org,44787,Deploy.s.sol:Deploy,ALFAJORES_TESTNET"
            ;;
        "ethereum")
            echo "https://eth.drpc.org,1,Deploy.s.sol:Deploy,ETHEREUM_MAINNET"
            ;;
        "ethereum-sepolia")
            echo "https://sepolia.drpc.org,11155111,Deploy.s.sol:Deploy,SEPOLIA_TESTNET"
            ;;
        "base")
            echo "https://base.drpc.org,8453,Deploy.s.sol:Deploy,BASE_MAINNET"
            ;;
        "base-sepolia")
            echo "https://sepolia.base.org,84532,Deploy.s.sol:Deploy,BASE_SEPOLIA_TESTNET"
            ;;
        *)
            echo ""
            ;;
    esac
}

# Get network configuration
NETWORK_CONFIG=$(get_network_config "$NETWORK")

# Check if network is supported
if [ -z "$NETWORK_CONFIG" ]; then
    echo -e "${RED}❌ Unsupported network: $NETWORK${NC}"
    echo -e "${YELLOW}Supported networks:${NC}"
    echo -e "  • celo (Chain ID: 42220)"
    echo -e "  • celo-alfajores (Chain ID: 44787)"
    echo -e "  • ethereum (Chain ID: 1)"
    echo -e "  • ethereum-sepolia (Chain ID: 11155111)"
    echo -e "  • base (Chain ID: 8453)"
    echo -e "  • base-sepolia (Chain ID: 84532)"
    exit 1
fi

# Parse network configuration
IFS=',' read -r RPC_URL CHAIN_ID DEPLOYER_SCRIPT ENV_NAME <<< "$NETWORK_CONFIG"

echo -e "${GREEN}📋 Deployment Configuration:${NC}"
echo -e "  Network: $NETWORK"
echo -e "  Chain ID: $CHAIN_ID"
echo -e "  RPC URL: $RPC_URL"
echo -e "  Script: $DEPLOYER_SCRIPT"
echo ""

# Load environment variables
if [ -f ".env.local" ]; then
    source .env.local
    echo -e "${GREEN}✅ Loaded environment from .env.local${NC}"
else
    echo -e "${YELLOW}⚠️  No .env.local found, using environment variables${NC}"
fi

# Validate required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}❌ PRIVATE_KEY is not set${NC}"
    echo -e "${YELLOW}💡 Add your private key to .env.local:${NC}"
    echo -e "   PRIVATE_KEY=your_private_key_here"
    exit 1
fi

# Optional: Check for Etherscan API key for verification
case $NETWORK in
    "ethereum"|"ethereum-sepolia")
        if [ -z "$ETHERSCAN_API_KEY" ]; then
            echo -e "${YELLOW}⚠️  ETHERSCAN_API_KEY not set - contracts won't be verified${NC}"
        fi
        ;;
    "base"|"base-sepolia")
        if [ -z "$BASESCAN_API_KEY" ]; then
            echo -e "${YELLOW}⚠️  BASESCAN_API_KEY not set - contracts won't be verified${NC}"
        fi
        ;;
    "celo"|"celo-alfajores")
        if [ -z "$CELOSCAN_API_KEY" ]; then
            echo -e "${YELLOW}⚠️  CELOSCAN_API_KEY not set - contracts won't be verified${NC}"
        fi
        ;;
esac

echo -e "${GREEN}🔧 Starting deployment...${NC}"

# Change to contracts directory
cd contracts

# Build contracts first
echo -e "${BLUE}📦 Building contracts...${NC}"
forge build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Contract compilation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contracts compiled successfully${NC}"

# Deploy contracts
echo -e "${BLUE}🚀 Deploying to $NETWORK...${NC}"

# Base forge command
FORGE_CMD="forge script script/$DEPLOYER_SCRIPT \
    --via-ir \
    --rpc-url $RPC_URL \
    --broadcast \
    --private-key $PRIVATE_KEY \
    -vvvv"

# Add verification if API key is available
case $NETWORK in
    "ethereum"|"ethereum-sepolia")
        if [ -n "$ETHERSCAN_API_KEY" ]; then
            FORGE_CMD="$FORGE_CMD --verify --etherscan-api-key $ETHERSCAN_API_KEY"
        fi
        ;;
    "base"|"base-sepolia")
        if [ -n "$BASESCAN_API_KEY" ]; then
            FORGE_CMD="$FORGE_CMD --verify --etherscan-api-key $BASESCAN_API_KEY"
        fi
        ;;
    "celo"|"celo-alfajores")
        if [ -n "$CELOSCAN_API_KEY" ]; then
            FORGE_CMD="$FORGE_CMD --verify --etherscan-api-key $CELOSCAN_API_KEY"
        fi
        ;;
esac

# Execute deployment
eval $FORGE_CMD

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}Network: $NETWORK${NC}"
    echo -e "${GREEN}Chain ID: $CHAIN_ID${NC}"
    echo -e "${GREEN}RPC URL: $RPC_URL${NC}"
    
    # Copy deployment files for frontend
    echo -e "${BLUE}📄 Copying deployment files...${NC}"
    cd .. && ./scripts/copy-deployment.sh
    
    echo -e "${GREEN}✅ Deployment files copied${NC}"
    echo ""
    echo -e "${YELLOW}💡 Next steps:${NC}"
    echo -e "  1. Verify contracts on block explorer (if not auto-verified)"
    echo -e "  2. Update frontend configuration if needed"
    echo -e "  3. Test contract interactions"
    
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi