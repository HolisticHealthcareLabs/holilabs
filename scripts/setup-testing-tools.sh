#!/bin/bash
###############################################################################
# Testing Tools Setup Script
#
# USAGE:
#   ./scripts/setup-testing-tools.sh
#
# PURPOSE:
#   Install all required testing tools for beta testing acceleration
#   - Java (for Synthea)
#   - Playwright (for E2E testing)
#   - k6 (for load testing)
#
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "╔══════════════════════════════════════════════════════════╗"
echo "║      TESTING TOOLS SETUP - HOLI LABS                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

###############################################################################
# 1. Check if Homebrew is installed (macOS)
###############################################################################

log_info "Step 1/5: Checking Homebrew..."

if ! command -v brew &> /dev/null; then
    log_warning "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    log_success "✓ Homebrew installed"
else
    log_success "✓ Homebrew found"
fi

###############################################################################
# 2. Install Java (for Synthea)
###############################################################################

log_info "Step 2/5: Installing Java..."

if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n1 | cut -d'"' -f2)
    log_success "✓ Java already installed: $JAVA_VERSION"
else
    log_info "Installing OpenJDK 11..."
    brew install openjdk@11

    # Add to PATH
    echo 'export PATH="/opt/homebrew/opt/openjdk@11/bin:$PATH"' >> ~/.zshrc
    export PATH="/opt/homebrew/opt/openjdk@11/bin:$PATH"

    # Symlink for system Java
    sudo ln -sfn /opt/homebrew/opt/openjdk@11/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-11.jdk

    log_success "✓ Java 11 installed"
    log_warning "⚠️  Please restart your terminal or run: source ~/.zshrc"
fi

###############################################################################
# 3. Install Playwright
###############################################################################

log_info "Step 3/5: Installing Playwright..."

cd "$(dirname "$0")/.."  # Go to project root

# Install Playwright from package.json
pnpm install

# Install Playwright browsers
pnpm exec playwright install chromium firefox webkit

log_success "✓ Playwright installed with browsers"

###############################################################################
# 4. Install k6
###############################################################################

log_info "Step 4/5: Installing k6 load testing tool..."

if command -v k6 &> /dev/null; then
    K6_VERSION=$(k6 version | head -n1)
    log_success "✓ k6 already installed: $K6_VERSION"
else
    log_info "Installing k6 via Homebrew..."
    brew install k6
    log_success "✓ k6 installed"
fi

###############################################################################
# 5. Verify Docker
###############################################################################

log_info "Step 5/5: Verifying Docker..."

if ! command -v docker &> /dev/null; then
    log_error "Docker not found. Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info &> /dev/null; then
    log_error "Docker is not running. Please start Docker Desktop."
    exit 1
fi

log_success "✓ Docker is running"

###############################################################################
# Summary
###############################################################################

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║           SETUP COMPLETE - ALL TOOLS READY               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

log_success "✅ All testing tools installed successfully!"
echo ""
log_info "Installed tools:"
echo "  ✓ Java $(java -version 2>&1 | head -n1 | cut -d'"' -f2)"
echo "  ✓ Playwright (with Chromium, Firefox, WebKit)"
echo "  ✓ k6 $(k6 version | head -n1)"
echo "  ✓ Docker $(docker --version)"
echo ""
log_info "Next steps:"
echo "  1. Restart terminal (or run: source ~/.zshrc)"
echo "  2. Start testing infrastructure:"
echo "     docker-compose -f docker-compose.yml -f docker-compose.testing.yml up -d"
echo "  3. Generate test data:"
echo "     ./scripts/generate-synthea-patients.sh 100 'São Paulo'"
echo "  4. Run tests:"
echo "     pnpm test:coverage"
echo "     pnpm test:e2e"
echo "     k6 run tests/load/api-baseline.js"
echo ""

exit 0
