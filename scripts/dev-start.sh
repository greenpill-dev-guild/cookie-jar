#!/bin/bash

# 🍪 Cookie Jar - Unified Local Development Environment (Fixed Version)
echo "🚀 Starting Cookie Jar Full Stack Development Environment..."

# Get the project root directory (where this script's parent directory is)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📁 Project root: $PROJECT_ROOT"

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down development environment..."
    pkill -f anvil || true
    pkill -f "forge script.*watch" || true
    pkill -f "next dev" || true
    pkill -f "npm run dev" || true
    pkill -f "pnpm.*dev" || true
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

# Change to project root
cd "$PROJECT_ROOT"

# Start Anvil in background
echo "🔧 Starting Anvil..."
cd contracts
pkill -f anvil || true

# Fork mode is now the default (use --local to disable)
if [ "$1" = "--local" ] || [ "$ANVIL_FORK" = "false" ]; then
    echo "🔧 Starting Anvil (local development mode)..."
    anvil \
      --host 0.0.0.0 \
      --port 8545 \
      --chain-id 31337 \
      --accounts 10 \
      --balance 1000 \
      > anvil.log 2>&1 &
else
    FORK_URL=${ANVIL_FORK_URL:-"https://eth.drpc.org"}
    echo "🔧 Starting Anvil (Ethereum mainnet fork: $FORK_URL)..."
    echo "💡 Tip: Use './scripts/dev-start.sh --local' for pure local development"
    anvil \
      --host 0.0.0.0 \
      --port 8545 \
      --fork-url $FORK_URL \
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
    kill $ANVIL_PID 2>/dev/null
    exit 1
  fi
done

# Deploy contracts (from contracts directory)
echo "🚀 Deploying contracts to local Anvil..."
forge script script/DeployLocal.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

if [ $? -ne 0 ]; then
    echo "❌ Initial contract deployment failed"
    kill $ANVIL_PID 2>/dev/null
    exit 1
fi

echo "✅ Contracts deployed successfully!"

# Create deployment file from broadcast data (from project root)
cd "$PROJECT_ROOT"
echo "📄 Creating deployment file from broadcast data..."
./scripts/create-deployment-file.sh

if [ $? -ne 0 ]; then
    echo "❌ Failed to create deployment file"
    kill $ANVIL_PID 2>/dev/null
    exit 1
fi

# Copy deployment files to client (from project root)
echo "📄 Copying deployment files..."
./scripts/copy-deployment.sh

if [ $? -ne 0 ]; then
    echo "❌ Failed to copy deployment files"
    kill $ANVIL_PID 2>/dev/null
    exit 1
fi

# Seed demo environment
cd contracts
echo "🌱 Seeding demo environment with Cookie Monster NFTs..."
forge script script/SeedLocal.s.sol \
  --tc SeedLocalScript \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

if [ $? -eq 0 ]; then
    echo "✅ Demo jars and Cookie Monster NFTs created!"
    # Copy seed data to client
    cd "$PROJECT_ROOT"
    echo "📄 Copying seed data..."
    ./scripts/copy-deployment.sh
else
    echo "⚠️  Seeding failed, but contracts are deployed"
fi

# Start contract watcher in background (from project root)
cd "$PROJECT_ROOT"
echo "👀 Starting contract file watcher..."
./scripts/watch-deploy.sh > contracts/watch-deploy.log 2>&1 &
WATCHER_PID=$!

# Generate client types (from project root, using workspace command)
echo "⚙️  Generating client types..."
pnpm --filter client run generate

if [ $? -ne 0 ]; then
    echo "❌ Client type generation failed"
    kill $ANVIL_PID $WATCHER_PID 2>/dev/null
    exit 1
fi

# Start client dev server with proper logging
echo "🌐 Starting client development server..."
echo "📝 Client logs will be shown below. Watch for startup confirmation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Change to client directory and start dev server
cd client

# Create a simple script to run client dev that doesn't depend on workspace
echo "🔧 Preparing client environment..."

# Copy deployment files directly (bypass the client's copy:deployment script)
if [ ! -d "public/contracts" ]; then
    mkdir -p public/contracts
fi

if [ -f "../contracts/local-deployment.json" ]; then
    cp ../contracts/local-deployment.json public/contracts/
    echo "✅ Deployment files ready for client"
else
    echo "⚠️  No deployment file found, client may not connect properly"
fi

# Start Next.js dev server directly with Turbo for faster builds
echo "🚀 Starting Next.js development server (Turbo mode - faster builds & hot reload)..."
NODE_ENV=development npx next dev --turbo 2>&1 | tee ../contracts/client-dev.log &
CLIENT_PID=$!

# Wait for client to start and check if it's running
echo "⏳ Waiting for client to start..."
CLIENT_STARTED=false

for i in {1..30}; do
  # Check if Next.js dev server is ready
  if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
    echo ""
    echo "✅ Client is ready and responding on port 3000!"
    CLIENT_STARTED=true
    break
  fi
  
  # Check if the process is still running
  if ! kill -0 $CLIENT_PID 2>/dev/null; then
    echo "❌ Client process stopped unexpectedly!"
    echo "📋 Last few lines of client log:"
    tail -10 ../contracts/client-dev.log 2>/dev/null || echo "No log file found"
    kill $ANVIL_PID $WATCHER_PID 2>/dev/null
    exit 1
  fi
  
  echo "Waiting for client... ($i/30)"
  sleep 2
done

if [ "$CLIENT_STARTED" = false ]; then
    echo "❌ Client failed to start after 60 seconds"
    echo "📋 Last few lines of client log:"
    tail -10 ../contracts/client-dev.log 2>/dev/null || echo "No log file found"
    kill $ANVIL_PID $WATCHER_PID $CLIENT_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 Development environment is ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 DEVELOPMENT ENDPOINTS:"
echo "  🌐 Client:          http://localhost:3000 ✅ READY (Turbo Mode)"  
if [ "$1" = "--local" ] || [ "$ANVIL_FORK" = "false" ]; then
    echo "  ⛓️  Local Blockchain: http://127.0.0.1:8545 (Chain ID: 31337) [LOCAL]"
else
    echo "  ⛓️  Local Blockchain: http://127.0.0.1:8545 (Chain ID: 31337) [FORKED FROM ETHEREUM]"
fi
echo "  📄 Logs:"
echo "    - Anvil:          contracts/anvil.log"
echo "    - Contract Watch: contracts/watch-deploy.log" 
echo "    - Client:         contracts/client-dev.log (also shown above)"
echo ""
echo "🛠️  WORKFLOW:"
echo "  • Edit contracts in contracts/src/"
echo "  • Contracts auto-recompile and redeploy on changes"
echo "  • Client types auto-regenerate"
echo "  • Client hot-reloads automatically (⚡ Turbo mode)"
echo "  • ✨ Multicall3 enabled via Ethereum fork!"
echo ""
echo "🔗 TEST ACCOUNTS:"
echo "  • Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo "  • Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Monitoring client logs... (Press Ctrl+C to stop all services)"

# Keep script running and continue showing client logs
wait $CLIENT_PID