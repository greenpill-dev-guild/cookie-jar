#!/bin/bash

# Cookie Jar Local Development Setup
echo "🍪 Starting Cookie Jar Local Development Environment..."

# Kill any existing anvil process
pkill -f anvil || true

# Start Anvil with Celo fork
echo "🔧 Starting Anvil (Celo fork on port 8545)..."
anvil \
  --host 0.0.0.0 \
  --port 8545 \
  --fork-url https://forno.celo.org \
  --chain-id 31337 \
  --accounts 10 \
  --balance 1000 \
  > anvil.log 2>&1 &

ANVIL_PID=$!
echo "Anvil started with PID: $ANVIL_PID"

# Wait for Anvil to start
echo "⏳ Waiting for Anvil to initialize..."
sleep 3

# Deploy contracts
echo "🚀 Deploying contracts to local Anvil..."
source .env.local
forge script script/DeployLocal.s.sol --rpc-url $RPC_URL --broadcast --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

if [ $? -eq 0 ]; then
    echo "✅ Contracts deployed successfully!"
    echo "📄 Deployment files auto-copied via DeployLocal.s.sol"
    echo "🔗 Local blockchain running at: http://127.0.0.1:8545"
    echo "🏁 Ready for development!"
else
    echo "❌ Deployment failed"
    kill $ANVIL_PID
    exit 1
fi

# Keep script running and handle cleanup
trap "echo '🛑 Stopping local development...'; kill $ANVIL_PID; exit 0" INT TERM
wait $ANVIL_PID
