#!/bin/bash

#
# Cosign Key Generation Script
#
# Generates a Cosign key pair for signing container images
#
# Usage:
#   ./scripts/generate-cosign-keys.sh
#
# Output:
#   - cosign.key (private key - KEEP SECURE)
#   - cosign.pub (public key - distribute freely)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Cosign Key Pair Generation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if Cosign is installed
if ! command -v cosign &> /dev/null; then
    echo -e "${RED}❌ Cosign is not installed${NC}"
    echo ""
    echo "Install Cosign:"
    echo "  macOS:   brew install cosign"
    echo "  Linux:   curl -sL https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 -o /usr/local/bin/cosign && chmod +x /usr/local/bin/cosign"
    echo "  Windows: choco install cosign"
    echo ""
    echo "Or visit: https://docs.sigstore.dev/cosign/installation/"
    exit 1
fi

echo -e "${GREEN}✓${NC} Cosign is installed"
cosign version
echo ""

# Check if keys already exist
if [ -f "cosign.key" ] || [ -f "cosign.pub" ]; then
    echo -e "${YELLOW}⚠️  Warning: Cosign keys already exist in this directory${NC}"
    echo ""
    echo "Existing files:"
    [ -f "cosign.key" ] && echo "  - cosign.key (private key)"
    [ -f "cosign.pub" ] && echo "  - cosign.pub (public key)"
    echo ""
    read -p "Do you want to overwrite them? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled"
        exit 0
    fi
    echo ""
fi

# Generate key pair
echo -e "${BLUE}Generating Cosign key pair...${NC}"
echo ""
echo -e "${YELLOW}⚠️  You will be prompted to create a password for the private key${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: Store this password securely (password manager, vault, etc.)${NC}"
echo ""

cosign generate-key-pair

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Key pair generated successfully${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Display files
echo "Generated files:"
echo ""
echo -e "${RED}🔒 cosign.key${NC} - Private key (KEEP SECRET)"
echo "   - Add to GitHub Secrets as COSIGN_PRIVATE_KEY"
echo "   - Store password in GitHub Secrets as COSIGN_PASSWORD"
echo "   - NEVER commit to repository"
echo "   - Store securely in password manager/vault"
echo ""
echo -e "${GREEN}🔓 cosign.pub${NC} - Public key (safe to share)"
echo "   - Add to GitHub Secrets as COSIGN_PUBLIC_KEY"
echo "   - Can be committed to repository"
echo "   - Share with team for verification"
echo ""

# Show key contents
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Public Key${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
cat cosign.pub
echo ""

# GitHub Secrets setup instructions
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  GitHub Secrets Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Add these secrets to your GitHub repository:"
echo ""
echo "1. COSIGN_PRIVATE_KEY"
echo "   - Copy the entire contents of cosign.key"
echo "   - Include BEGIN and END lines"
echo ""
echo "2. COSIGN_PASSWORD"
echo "   - The password you just created"
echo "   - Store securely in password manager first"
echo ""
echo "3. COSIGN_PUBLIC_KEY"
echo "   - Copy the entire contents of cosign.pub"
echo "   - Include BEGIN and END lines"
echo ""
echo -e "${YELLOW}Via GitHub UI:${NC}"
echo "  Settings → Secrets and variables → Actions → New repository secret"
echo ""
echo -e "${YELLOW}Via GitHub CLI:${NC}"
echo "  gh secret set COSIGN_PRIVATE_KEY < cosign.key"
echo "  gh secret set COSIGN_PASSWORD"
echo "  gh secret set COSIGN_PUBLIC_KEY < cosign.pub"
echo ""

# Security warnings
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}  ⚠️  SECURITY WARNINGS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${RED}DO:${NC}"
echo "  ✅ Store private key in password manager/vault"
echo "  ✅ Store password in password manager/vault"
echo "  ✅ Add to GitHub Secrets immediately"
echo "  ✅ Delete local cosign.key after adding to secrets"
echo "  ✅ Restrict access to GitHub Secrets"
echo "  ✅ Rotate keys annually or if compromised"
echo ""
echo -e "${RED}DON'T:${NC}"
echo "  ❌ Commit cosign.key to repository"
echo "  ❌ Share private key via email/Slack"
echo "  ❌ Store password in plain text"
echo "  ❌ Use same key for multiple projects"
echo "  ❌ Leave cosign.key on local filesystem"
echo ""

# Add to .gitignore
if [ -f ".gitignore" ]; then
    if ! grep -q "cosign.key" .gitignore; then
        echo -e "${BLUE}Adding cosign.key to .gitignore...${NC}"
        echo "" >> .gitignore
        echo "# Cosign keys (NEVER commit private keys)" >> .gitignore
        echo "cosign.key" >> .gitignore
        echo "*.key" >> .gitignore
        echo -e "${GREEN}✓${NC} Updated .gitignore"
        echo ""
    fi
fi

# Final steps
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Next Steps${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. Add secrets to GitHub (see commands above)"
echo "2. Store private key and password in password manager"
echo "3. Delete local cosign.key file:"
echo "   ${YELLOW}rm cosign.key${NC}"
echo "4. Test signing with:"
echo "   ${YELLOW}./scripts/test-cosign-signing.sh${NC}"
echo "5. Deploy with signed images:"
echo "   ${YELLOW}gh workflow run deploy-production.yml${NC}"
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
