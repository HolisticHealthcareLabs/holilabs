#!/usr/bin/env sh
#
# Pre-commit hook to detect secrets and prevent them from being committed
# Uses gitleaks to scan staged files for secrets
#
# Installation:
#   chmod +x scripts/pre-commit-hook.sh
#   cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
#
# Or use the install script:
#   ./scripts/install-pre-commit-hook.sh
#

echo "🔍 Running security checks..."

# Check if gitleaks is installed
if ! command -v gitleaks &> /dev/null; then
    echo "⚠️  WARNING: gitleaks is not installed. Secret detection skipped."
    echo "   Install with:"
    echo "     macOS:   brew install gitleaks"
    echo "     Linux:   See https://github.com/gitleaks/gitleaks#installing"
    echo "     Docker:  docker pull zricethezav/gitleaks:latest"
    echo ""
    echo "   Continuing without secret detection..."
    exit 0
fi

# Run gitleaks on staged files
echo "🔒 Scanning for secrets with gitleaks..."
gitleaks protect --staged --verbose --redact

GITLEAKS_EXIT_CODE=$?

if [ $GITLEAKS_EXIT_CODE -eq 0 ]; then
    echo "✅ No secrets detected. Proceeding with commit."
    exit 0
else
    echo ""
    echo "❌ SECRET DETECTED! Commit blocked."
    echo ""
    echo "A potential secret was found in your staged files."
    echo "Please review the output above and remove any sensitive data."
    echo ""
    echo "Common secrets to check for:"
    echo "  - API keys (AWS, Google, Sentry, Stripe, etc.)"
    echo "  - Database passwords and connection strings"
    echo "  - Private keys (SSH, SSL, JWT secrets, etc.)"
    echo "  - OAuth tokens and refresh tokens"
    echo "  - .env files with credentials"
    echo "  - Hardcoded passwords in code"
    echo ""
    echo "How to fix:"
    echo "  1. Remove the secret from the file"
    echo "  2. Add it to .gitignore if it's a config file"
    echo "  3. Use environment variables instead"
    echo "  4. Try committing again"
    echo ""
    echo "To bypass this check (NOT RECOMMENDED):"
    echo "  git commit --no-verify"
    echo ""
    echo "⚠️  WARNING: Bypassing this check can expose secrets to the repository!"
    echo ""
    exit 1
fi
