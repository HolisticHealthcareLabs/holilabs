#!/bin/bash
# Git Secrets Setup Script
# HoliLabs Security - Prevent Secret Commits
# Last Updated: December 15, 2025

set -e

echo "🔒 HoliLabs Git Secrets Setup"
echo "=============================="
echo ""

# Check if git-secrets is installed
if ! command -v git-secrets &> /dev/null; then
    echo "❌ git-secrets not found"
    echo ""
    echo "Please install git-secrets first:"
    echo ""
    echo "macOS (Homebrew):"
    echo "  brew install git-secrets"
    echo ""
    echo "Linux/macOS (from source):"
    echo "  git clone https://github.com/awslabs/git-secrets.git"
    echo "  cd git-secrets && sudo make install"
    echo ""
    exit 1
fi

echo "✅ git-secrets is installed"
echo ""

# Navigate to repository root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$SCRIPT_DIR/../../.."
cd "$REPO_ROOT"

echo "📁 Repository: $(pwd)"
echo ""

# Install git-secrets hooks
echo "Installing git-secrets hooks..."
git secrets --install -f
echo "✅ Git hooks installed"
echo ""

# Register AWS patterns
echo "Adding AWS secret patterns..."
git secrets --register-aws
echo "✅ AWS patterns registered"
echo ""

# Add custom patterns from .git-secrets-patterns.txt
echo "Adding HoliLabs custom patterns..."

# OpenAI & Anthropic
git secrets --add 'sk-proj-[A-Za-z0-9_\-]{40,}'
git secrets --add 'sk-[A-Za-z0-9_\-]{40,}'
git secrets --add 'sk-ant-api03-[A-Za-z0-9_\-]{40,}'
git secrets --add 'AIzaSy[A-Za-z0-9_\-]{33}'

# Stripe
git secrets --add 'sk_live_[A-Za-z0-9]{24,}'
git secrets --add 'sk_test_[A-Za-z0-9]{24,}'
git secrets --add 'whsec_[A-Za-z0-9]{32,}'

# Twilio
git secrets --add 'AC[a-f0-9]{32}'

# Email services
git secrets --add 're_[A-Za-z0-9]{20,}'
git secrets --add 'SG\.[A-Za-z0-9_\-]{22,}'

# Database URLs
git secrets --add 'postgresql://[a-zA-Z0-9_]+:[^@\s]+@'
git secrets --add 'mongodb(\+srv)?://[a-zA-Z0-9_]+:[^@\s]+@'

# Private keys
git secrets --add '-----BEGIN (RSA |EC )?PRIVATE KEY-----'

# JWT tokens
git secrets --add 'eyJ[A-Za-z0-9_\-]*\.[A-Za-z0-9_\-]*\.[A-Za-z0-9_\-]*'

# Long hex strings (potential keys)
git secrets --add '[0-9a-f]{64,}'

# Slack webhooks
git secrets --add 'https://hooks\.slack\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[A-Za-z0-9]{24}'

# Sentry
git secrets --add 'https://[a-f0-9]+@[a-z0-9\-]+\.ingest\.sentry\.io/[0-9]+'

echo "✅ Custom patterns added"
echo ""

# Add allowed patterns (false positive exceptions)
echo "Adding allowed patterns (test fixtures and placeholders)..."

git secrets --add --allowed 'sk-ant-api03-1234567890'
git secrets --add --allowed 'your-api-key-here'
git secrets --add --allowed 'your-secret-here'
git secrets --add --allowed 'your-token-here'
git secrets --add --allowed 'example-api-key'
git secrets --add --allowed 'test-api-key'
git secrets --add --allowed 'placeholder'
git secrets --add --allowed 'change-me'
git secrets --add --allowed 'replace-me'
git secrets --add --allowed 'generate-with'
git secrets --add --allowed 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
git secrets --add --allowed 'postgresql://user:password@'
git secrets --add --allowed 'mongodb://user:password@'

echo "✅ Allowed patterns added"
echo ""

# Test the setup
echo "Testing git-secrets configuration..."
echo ""

# Create a test file with a fake secret
TEST_FILE=$(mktemp)
echo "API_KEY=sk-proj-test123456789012345678901234567890123456" > "$TEST_FILE"

if git secrets --scan "$TEST_FILE" 2>/dev/null; then
    echo "⚠️  Warning: Test secret was NOT detected"
    echo "   Git-secrets may not be working correctly"
    rm "$TEST_FILE"
else
    echo "✅ Test passed: Git-secrets is working correctly"
    rm "$TEST_FILE"
fi

echo ""

# Scan current repository (optional - can take time on large repos)
read -p "Scan entire repository for secrets? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔍 Scanning repository..."
    echo "This may take a few minutes on large repositories..."
    echo ""

    if git secrets --scan-history; then
        echo ""
        echo "✅ No secrets found in repository history"
    else
        echo ""
        echo "⚠️  SECRETS DETECTED IN REPOSITORY!"
        echo ""
        echo "Please review the output above and take action:"
        echo "1. Revoke any exposed secrets immediately"
        echo "2. Remove secrets from git history using BFG Repo-Cleaner"
        echo "3. See docs/SECRETS_MANAGEMENT.md for detailed instructions"
        echo ""
        exit 1
    fi
fi

echo ""
echo "✅ Git-secrets setup complete!"
echo ""
echo "Next steps:"
echo "1. Secrets will be automatically scanned on git commit"
echo "2. If a secret is detected, the commit will be blocked"
echo "3. Review docs/SECRETS_MANAGEMENT.md for best practices"
echo "4. Share this setup with your team:"
echo "   ./apps/web/scripts/setup-git-secrets.sh"
echo ""
echo "To manually scan files:"
echo "  git secrets --scan <file>"
echo ""
echo "To scan entire history:"
echo "  git secrets --scan-history"
echo ""
