#!/bin/bash

# 🍪 Cookie Jar - Unified Local Development Environment
echo "🚀 Starting Cookie Jar Full Stack Development Environment..."

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down development environment..."
    pkill -f anvil || true
    pkill -f "forge script.*watch" || true
    pkill -f "next dev" || true
    pkill -f "npm run dev" || true
    exit 0
}

# Setup cleanup trap
trap cleanup INT TERM

# Check for required tools
echo "🔍 Checking prerequisites..."
command -v anvil >/dev/null 2>&1 || { echo "❌ anvil not found. Install Foundry: https://getfoundry.sh"; exit 1; }
command -v forge >/dev/null 2>&1 || { echo "❌ forge not found. Install Foundry: https://getfoundry.sh"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ node not found. Install Node.js"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm not found. Install pnpm: npm install -g pnpm"; exit 1; }

echo "✅ All prerequisites found!"

# Start Anvil in background
echo "🔧 Starting Anvil (Ethereum mainnet fork)..."
cd contracts
pkill -f anvil || true
anvil \
  --host 0.0.0.0 \
  --port 8545 \
  --fork-url https://eth.drpc.org \
  --chain-id 31337 \
  --accounts 10 \
  --balance 1000 \
  > anvil.log 2>&1 &

ANVIL_PID=$!
echo "Anvil started with PID: $ANVIL_PID"

# Wait for Anvil to initialize
echo "⏳ Waiting for Anvil to start..."
sleep 3

# Deploy contracts  
echo "🚀 Deploying contracts to local Anvil..."
# No environment setup needed - using hardcoded Anvil Account #0
forge script script/DeployLocal.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

if [ $? -ne 0 ]; then
    echo "❌ Initial contract deployment failed"
    kill $ANVIL_PID
    exit 1
fi

echo "✅ Contracts deployed successfully!"

# Seed demo environment with Cookie Monster NFTs and demo jars
echo "🌱 Seeding demo environment with Cookie Monster NFTs..."
forge script script/SeedLocal.s.sol \
  --tc SeedLocalScript \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

if [ $? -eq 0 ]; then
    echo "✅ Demo jars and Cookie Monster NFTs created!"
    # Copy seed data to frontend
    if [ -f "contracts/seed-data.json" ]; then
        cp contracts/seed-data.json frontend/contracts/
        echo "📄 Seed data copied to frontend"
    fi
else
    echo "⚠️  Seeding failed, but contracts are deployed"
fi

# Start contract watcher in background
echo "👀 Starting contract file watcher..."
./scripts/watch-deploy.sh > watch-deploy.log 2>&1 &
WATCHER_PID=$!

# Generate frontend types
echo "⚙️  Generating frontend types..."
cd ../frontend
pnpm generate

if [ $? -ne 0 ]; then
    echo "❌ Frontend type generation failed"
    kill $ANVIL_PID $WATCHER_PID
    exit 1
fi

# Start frontend dev server
echo "🌐 Starting frontend development server..."
NODE_ENV=development pnpm dev > frontend-dev.log 2>&1 &
FRONTEND_PID=$!

# Wait a moment and show status
sleep 5

echo ""
echo "🎉 Development environment is ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 DEVELOPMENT ENDPOINTS:"
echo "  🌐 Frontend:        http://localhost:3000"  
echo "  ⛓️  Local Blockchain: http://127.0.0.1:8545 (Chain ID: 31337)"
echo "  📄 Logs:"
echo "    - Anvil:          contracts/anvil.log"
echo "    - Contract Watch: contracts/watch-deploy.log" 
echo "    - Frontend:       frontend/frontend-dev.log"
echo ""
echo "🛠️  WORKFLOW:"
echo "  • Edit contracts in contracts/src/"
echo "  • Contracts auto-recompile and redeploy on changes"
echo "  • Frontend types auto-regenerate"
echo "  • Frontend hot-reloads automatically"
echo ""
echo "🔗 TEST ACCOUNTS:"
echo "  • Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo "  • Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep script running
wait $FRONTEND_PID
