#!/bin/bash

# HoliLabs Git-Secrets Setup Script
# Automatically configures git-secrets to prevent secret leaks

set -e

echo "🔒 HoliLabs Git-Secrets Setup"
echo "================================"
echo ""

# Check if git-secrets is installed
if ! command -v git-secrets &> /dev/null; then
    echo "❌ git-secrets is not installed"
    echo ""
    echo "Please install it first:"
    echo "  macOS:   brew install git-secrets"
    echo "  Linux:   See GIT_SECRETS_SETUP.md"
    echo "  Windows: See GIT_SECRETS_SETUP.md"
    exit 1
fi

echo "✅ git-secrets is installed"
echo ""

# Install hooks
echo "📦 Installing git-secrets hooks..."
git secrets --install -f
echo "✅ Hooks installed"
echo ""

# Register AWS patterns
echo "🔑 Registering AWS patterns..."
git secrets --register-aws
echo "✅ AWS patterns registered"
echo ""

# Add custom patterns
echo "🔍 Adding HoliLabs-specific patterns..."

# Anthropic API Keys
git secrets --add 'sk-ant-api03-[A-Za-z0-9_\-]+'

# OpenAI API Keys
git secrets --add 'sk-[A-Za-z0-9]{48}'

# Deepgram API Keys (32 hex characters)
git secrets --add '[0-9a-f]{32}'

# Twilio Account SID
git secrets --add 'AC[a-z0-9]{32}'

# Resend API Keys
git secrets --add 're_[A-Za-z0-9_]+'

# Generic API Key patterns
git secrets --add 'api[_-]?key["\s:=]+"[a-zA-Z0-9_\-]+'
git secrets --add 'apikey["\s:=]+"[a-zA-Z0-9_\-]+'

# JWT Tokens
git secrets --add '["\']eyJ[A-Za-z0-9_\-]*\.[A-Za-z0-9_\-]*\.[A-Za-z0-9_\-]*["\']'

# Private Keys
git secrets --add -- '-----BEGIN.*PRIVATE KEY-----'

# Database URLs with passwords
git secrets --add 'postgresql://[a-zA-Z0-9_]+:[^@\s]+@'
git secrets --add 'mongodb(\+srv)?://[a-zA-Z0-9_]+:[^@\s]+@'

# Stripe Keys
git secrets --add 'sk_live_[a-zA-Z0-9]{24,}'
git secrets --add 'pk_live_[a-zA-Z0-9]{24,}'

# Generic secret/token patterns
git secrets --add 'SECRET["\s:=]+"[a-zA-Z0-9_\-]{16,}'
git secrets --add 'TOKEN["\s:=]+"[a-zA-Z0-9_\-]{16,}'

echo "✅ Custom patterns added"
echo ""

# Add allowed patterns (exceptions)
echo "✨ Adding allowed patterns (exceptions)..."

# Allow example/placeholder keys
git secrets --add --allowed 'your-api-key-here'
git secrets --add --allowed 'your-.*-key-here'
git secrets --add --allowed 'example\.com'
git secrets --add --allowed 'localhost'

# Allow common test/mock patterns
git secrets --add --allowed 'test-api-key'
git secrets --add --allowed 'mock-.*'
git secrets --add --allowed 'fake-.*'

# Allow .env.example and other template files
git secrets --add --allowed '\.env\.example'
git secrets --add --allowed '\.env\..*\.example'
git secrets --add --allowed '\.template'

# Allow documentation patterns
git secrets --add --allowed '\[REDACTED\]'
git secrets --add --allowed 'YOUR_.*_KEY'
git secrets --add --allowed 'YOUR_.*_TOKEN'

echo "✅ Allowed patterns added"
echo ""

# Test the configuration
echo "🧪 Testing git-secrets configuration..."
if git secrets --scan; then
    echo "✅ No secrets found in staged files"
else
    echo "⚠️  Secrets detected! Please review and fix before committing."
fi
echo ""

echo "✅ Git-secrets setup complete!"
echo ""
echo "Next steps:"
echo "  1. Read SECURITY_AUDIT_HARDCODED_SECRETS.md"
echo "  2. Rotate any exposed API keys immediately"
echo "  3. Test with: git secrets --scan"
echo ""
echo "Documentation: apps/web/GIT_SECRETS_SETUP.md"
