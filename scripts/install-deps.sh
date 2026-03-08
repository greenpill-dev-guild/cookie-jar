#!/bin/bash

echo "🍪 Cookie Jar - Auto-installing missing dependencies..."
echo "====================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get version if available
get_version() {
    if command_exists "$1"; then
        case "$1" in
            "node") node --version ;;
            "bun") bun --version ;;
            "forge") forge --version | head -n1 | cut -d' ' -f3 ;;
            "git") git --version | cut -d' ' -f3 ;;
        esac
    fi
}

# Check Node.js
if ! command_exists node; then
    echo -e "${RED}❌ Node.js not found!${NC}"
    echo "   Please install Node.js (v18.0.0+) from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo -e "${RED}❌ Node.js $NODE_VERSION detected. Cookie Jar requires Node.js v18.0.0+${NC}"
    echo "   Please update Node.js: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✅ Node.js v$NODE_VERSION meets requirements${NC}"

# Check Git
if ! command_exists git; then
    echo -e "${RED}❌ Git not found!${NC}"
    echo "   Please install Git from: https://git-scm.com/"
    exit 1
fi
echo -e "${GREEN}✅ Git $(get_version git) found${NC}"

# Install bun if missing
if ! command_exists bun; then
    echo -e "${YELLOW}📦 Installing bun...${NC}"
    if ! npm install -g bun; then
        echo -e "${RED}❌ Failed to install bun globally${NC}"
        echo "   You may need to run: sudo npm install -g bun"
        echo "   Or visit: https://bun.sh/docs/installation"
        exit 1
    fi
    echo -e "${GREEN}✅ bun installed successfully${NC}"
else
    echo -e "${GREEN}✅ bun v$(get_version bun) already installed${NC}"
fi

# Install Foundry if missing (skip in CI where official action handles it)
if ! command_exists forge || ! command_exists anvil; then
    # Skip Foundry installation in CI environments or when SKIP_CONTRACTS is set
    if [ "$CI" = "true" ] || [ "$GITHUB_ACTIONS" = "true" ] || [ "$SKIP_CONTRACTS" = "true" ]; then
        if [ "$SKIP_CONTRACTS" = "true" ]; then
            echo -e "${YELLOW}⏭️  Skipping Foundry installation (SKIP_CONTRACTS=true)${NC}"
        else
            echo -e "${YELLOW}⏭️  Skipping Foundry installation in CI (handled by official action)${NC}"
        fi
    else
        echo -e "${YELLOW}🔧 Installing Foundry...${NC}"
    
    # Check if Windows (Git Bash, WSL detection)
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo -e "${YELLOW}💡 Windows environment detected.${NC}"
        echo "   For best results, install WSL2 and run this in Ubuntu:"
        echo "   https://docs.microsoft.com/en-us/windows/wsl/install"
        echo ""
        echo -e "${RED}❌ Automatic Foundry installation not supported on Windows${NC}"
        echo "   Please install manually: https://book.getfoundry.sh/getting-started/installation"
        exit 1
    fi
    
    # Download and run Foundry installer
    echo "   Downloading Foundry installer..."
    if ! curl -L https://foundry.paradigm.xyz | bash; then
        echo -e "${RED}❌ Failed to download Foundry installer${NC}"
        echo "   Please install manually: https://book.getfoundry.sh/getting-started/installation"
        exit 1
    fi
    
    # Add foundry to PATH for this session
    export PATH="$HOME/.foundry/bin:$PATH"
    
    # Run foundryup to install the binaries
    echo "   Installing Foundry binaries..."
    if ! foundryup; then
        echo -e "${RED}❌ Failed to install Foundry binaries${NC}"
        echo "   Try running: foundryup"
        echo "   Or visit: https://book.getfoundry.sh/getting-started/installation"
        exit 1
        fi
        
        echo -e "${GREEN}✅ Foundry installed successfully${NC}"
        echo -e "${YELLOW}💡 You may need to restart your terminal or run: source ~/.bashrc${NC}"
    fi
else
    FORGE_VERSION=$(get_version forge)
    if [ "$CI" = "true" ] || [ "$GITHUB_ACTIONS" = "true" ]; then
        echo -e "${GREEN}✅ Foundry available in CI: $FORGE_VERSION${NC}"
    elif [ "$SKIP_CONTRACTS" = "true" ]; then
        echo -e "${GREEN}✅ Foundry available but skipping (SKIP_CONTRACTS=true): $FORGE_VERSION${NC}"
    else
        echo -e "${GREEN}✅ Foundry already installed: $FORGE_VERSION${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 All dependencies are ready!${NC}"
echo "📦 Proceeding with project dependency installation..."
echo ""
