#!/bin/bash

# 🔄 Local Development Contract Watcher
# Automatically redeploys contracts when files change
# No environment setup required - uses hardcoded Anvil Account #0!
echo "👀 Watching for contract changes (friction-free mode)..."

# Function to deploy contracts
deploy_contracts() {
    echo "🔄 Recompiling and redeploying contracts..."
    # No environment setup needed - using hardcoded Anvil Account #0
    
    # Build contracts
    cd contracts
    forge build
    if [ $? -ne 0 ]; then
        echo "❌ Compilation failed"
        cd ..
        return 1
    fi
    
    # Deploy to local network with hardcoded settings
    forge script script/DeployLocal.s.sol \
      --rpc-url http://127.0.0.1:8545 \
      --broadcast \
      --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
      --ffi
    cd ..
    if [ $? -eq 0 ]; then
        echo "✅ Contracts redeployed successfully!"
        echo "📄 Deployment files auto-copied via DeployLocal.s.sol"
        
        # Trigger client type regeneration
        echo "⚙️ Triggering client type regeneration..."
        cd client && pnpm generate && cd ..
        
        # Optional: Notify client of updates via API
        if command -v curl &> /dev/null; then
            curl -s -X POST http://localhost:3000/api/contracts-updated 2>/dev/null || true
        fi
    else
        echo "❌ Deployment failed"
    fi
}

# Watch for changes in contracts/src/ directory
if command -v fswatch &> /dev/null; then
    echo "Using fswatch for file monitoring..."
    fswatch -o contracts/src/ | while read f; do
        deploy_contracts
    done
elif command -v inotifywait &> /dev/null; then
    echo "Using inotifywait for file monitoring..."
    while inotifywait -r -e modify,create,delete contracts/src/; do
        deploy_contracts
    done
else
    echo "⚠️  No file watcher found. Install fswatch (macOS) or inotify-tools (Linux)"
    echo "Falling back to manual deployment mode..."
    echo "Run 'npm run deploy:local' after making changes"
fi
