#!/usr/bin/env bash
#
# Install pre-commit hook for secret detection
#
# This script installs a git pre-commit hook that uses gitleaks to scan
# for secrets before allowing commits.
#
# Usage:
#   ./scripts/install-pre-commit-hook.sh
#

set -e

echo "🔧 Installing pre-commit hook for secret detection..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository root directory"
    echo "   Please run this script from the repository root"
    exit 1
fi

# Check if pre-commit hook already exists
if [ -f ".git/hooks/pre-commit" ]; then
    echo "⚠️  Pre-commit hook already exists"
    echo "   Backing up existing hook to .git/hooks/pre-commit.backup"
    mv .git/hooks/pre-commit .git/hooks/pre-commit.backup
fi

# Copy pre-commit hook
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

echo "✅ Pre-commit hook installed successfully!"
echo ""

# Check if gitleaks is installed
if command -v gitleaks &> /dev/null; then
    GITLEAKS_VERSION=$(gitleaks version)
    echo "✅ gitleaks is installed: $GITLEAKS_VERSION"
else
    echo "⚠️  gitleaks is not installed"
    echo ""
    echo "The pre-commit hook will skip secret detection until gitleaks is installed."
    echo ""
    echo "Install gitleaks:"
    echo "  macOS:   brew install gitleaks"
    echo "  Linux:   wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.1/gitleaks_8.18.1_linux_x64.tar.gz"
    echo "           tar xzf gitleaks_8.18.1_linux_x64.tar.gz"
    echo "           sudo mv gitleaks /usr/local/bin/"
    echo "  Windows: choco install gitleaks"
    echo "  Docker:  docker pull zricethezav/gitleaks:latest"
    echo ""
fi

echo "🔒 Your commits will now be scanned for secrets before being allowed."
echo "   If a secret is detected, the commit will be blocked."
echo ""
echo "To bypass the hook (NOT RECOMMENDED):"
echo "  git commit --no-verify"
echo ""
