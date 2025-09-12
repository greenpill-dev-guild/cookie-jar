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
cd contracts
pkill -f anvil || true

# Check if fork mode is requested
if [ "$1" = "--fork" ] || [ "$ANVIL_FORK" = "true" ]; then
    FORK_URL=${ANVIL_FORK_URL:-"https://eth.drpc.org"}
    echo "🔧 Starting Anvil (Ethereum mainnet fork: $FORK_URL)..."
    anvil \
      --host 0.0.0.0 \
      --port 8545 \
      --fork-url $FORK_URL \
      --chain-id 31337 \
      --accounts 10 \
      --balance 1000 \
      > anvil.log 2>&1 &
else
    echo "🔧 Starting Anvil (local development mode)..."
    anvil \
      --host 0.0.0.0 \
      --port 8545 \
      --chain-id 31337 \
      --accounts 10 \
      --balance 1000 \
      > anvil.log 2>&1 &
fi

ANVIL_PID=$!
echo "Anvil started with PID: $ANVIL_PID"

# Wait for Anvil to be ready
echo "⏳ Waiting for Anvil to be ready..."
for i in {1..30}; do
  if curl -s -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     http://127.0.0.1:8545 > /dev/null 2>&1; then
    echo "✅ Anvil is ready!"
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 1
  if [ $i -eq 30 ]; then
    echo "❌ Anvil failed to start after 30 seconds"
    kill $ANVIL_PID
    exit 1
  fi
done

# Deploy contracts
echo "🚀 Deploying contracts to local Anvil..."
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

# Copy deployment files to frontend
echo "📄 Copying deployment files..."
cd .. && ./scripts/copy-deployment.sh
cd contracts

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
    echo "📄 Copying seed data..."
    cd .. && ./scripts/copy-deployment.sh
    cd contracts
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
if [ "$1" = "--fork" ] || [ "$ANVIL_FORK" = "true" ]; then
    echo "  ⛓️  Local Blockchain: http://127.0.0.1:8545 (Chain ID: 31337) [FORKED]"
else
    echo "  ⛓️  Local Blockchain: http://127.0.0.1:8545 (Chain ID: 31337) [LOCAL]"
fi
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
