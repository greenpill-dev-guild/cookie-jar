#!/bin/bash

# 🍪 Cookie Jar - Create Deployment File from Broadcast Data
echo "📄 Creating deployment file from broadcast data..."

# Get the project root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"
BROADCAST_DIR="$CONTRACTS_DIR/broadcast/DeployLocal.s.sol/31337"

# Check if broadcast data exists
if [ ! -f "$BROADCAST_DIR/run-latest.json" ]; then
    echo "❌ No broadcast data found at $BROADCAST_DIR/run-latest.json"
    echo "   Make sure contracts have been deployed first."
    exit 1
fi

# Extract CookieJarFactory address from broadcast data
echo "🔍 Extracting CookieJarFactory address from broadcast data..."

# Use jq to extract the contract address where contractName is "CookieJarFactory"
FACTORY_ADDRESS=$(cat "$BROADCAST_DIR/run-latest.json" | grep -A 10 -B 10 "CookieJarFactory" | grep '"contractAddress"' | head -1 | sed 's/.*"contractAddress": *"\([^"]*\)".*/\1/')

if [ -z "$FACTORY_ADDRESS" ] || [ "$FACTORY_ADDRESS" = "null" ]; then
    echo "❌ Could not extract CookieJarFactory address from broadcast data"
    echo "   Checking broadcast file structure..."
    echo "   File exists: $([ -f "$BROADCAST_DIR/run-latest.json" ] && echo "✅" || echo "❌")"
    if [ -f "$BROADCAST_DIR/run-latest.json" ]; then
        echo "   File size: $(wc -c < "$BROADCAST_DIR/run-latest.json") bytes"
        echo "   Contains CookieJarFactory: $(grep -c "CookieJarFactory" "$BROADCAST_DIR/run-latest.json" || echo "0")"
    fi
    exit 1
fi

echo "✅ Found CookieJarFactory at: $FACTORY_ADDRESS"

# Create deployment JSON file
DEPLOYMENT_FILE="$CONTRACTS_DIR/local-deployment.json"
cat > "$DEPLOYMENT_FILE" << EOF
{"CookieJarFactory":"$FACTORY_ADDRESS"}
EOF

if [ $? -eq 0 ]; then
    echo "✅ Created $DEPLOYMENT_FILE"
    echo "📄 Contents: $(cat "$DEPLOYMENT_FILE")"
else
    echo "❌ Failed to create deployment file"
    exit 1
fi

echo "🎉 Deployment file ready for client integration!"
