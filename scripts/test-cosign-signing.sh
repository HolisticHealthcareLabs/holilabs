#!/bin/bash

#
# Test Cosign Image Signing
#
# Tests the complete Cosign signing and verification workflow
#
# Usage:
#   ./scripts/test-cosign-signing.sh [image]
#
# Examples:
#   ./scripts/test-cosign-signing.sh ubuntu:22.04
#   ./scripts/test-cosign-signing.sh nginx:latest
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default test image
TEST_IMAGE="${1:-ubuntu:22.04}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Cosign Signing Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Test Image:${NC} $TEST_IMAGE"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker installed"

# Check Cosign
if ! command -v cosign &> /dev/null; then
    echo -e "${RED}❌ Cosign is not installed${NC}"
    echo ""
    echo "Install Cosign:"
    echo "  macOS:   brew install cosign"
    echo "  Linux:   curl -sL https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 -o /usr/local/bin/cosign && chmod +x /usr/local/bin/cosign"
    echo ""
    exit 1
fi
echo -e "${GREEN}✓${NC} Cosign installed"
cosign version
echo ""

# Check for keys
if [ ! -f "cosign.key" ] || [ ! -f "cosign.pub" ]; then
    echo -e "${YELLOW}⚠️  Cosign keys not found${NC}"
    echo ""
    echo "Generate keys first:"
    echo "  ./scripts/generate-cosign-keys.sh"
    echo ""
    read -p "Generate keys now? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./scripts/generate-cosign-keys.sh
    else
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} Cosign keys found"
echo ""

# Pull test image
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Step 1: Pull Test Image${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

docker pull $TEST_IMAGE
echo -e "${GREEN}✓${NC} Image pulled successfully"
echo ""

# Sign the image
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Step 2: Sign Image${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Signing image: $TEST_IMAGE"
echo -e "${YELLOW}⚠️  You will be prompted for your Cosign key password${NC}"
echo ""

cosign sign --key cosign.key \
  --annotations "test=true" \
  --annotations "timestamp=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  --annotations "signed-by=local-test" \
  $TEST_IMAGE

echo ""
echo -e "${GREEN}✓${NC} Image signed successfully"
echo ""

# Verify the signature
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Step 3: Verify Signature${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Verifying signature..."
echo ""

cosign verify --key cosign.pub $TEST_IMAGE

echo ""
echo -e "${GREEN}✓${NC} Signature verified successfully"
echo ""

# Display signature details
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Step 4: Inspect Signature${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Downloading signature bundle..."
cosign download signature $TEST_IMAGE > signature.json 2>/dev/null || {
    echo -e "${YELLOW}⚠️ Could not download signature bundle${NC}"
    echo ""
}

if [ -f signature.json ] && [ -s signature.json ]; then
    echo ""
    echo "Signature Details:"
    echo ""
    cat signature.json | jq '.[0].optional' || cat signature.json
    echo ""
    rm signature.json
fi

# Test SBOM attestation
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Step 5: Create SBOM Attestation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create simple SBOM
cat > test-sbom.json <<EOF
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.4",
  "version": 1,
  "metadata": {
    "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
    "component": {
      "name": "test-image",
      "version": "test",
      "type": "container"
    }
  },
  "components": []
}
EOF

echo "Creating SBOM attestation..."
echo -e "${YELLOW}⚠️  You will be prompted for your Cosign key password${NC}"
echo ""

cosign attest --key cosign.key \
  --predicate test-sbom.json \
  --type cyclonedx \
  $TEST_IMAGE

rm test-sbom.json

echo ""
echo -e "${GREEN}✓${NC} SBOM attestation created"
echo ""

# Verify attestation
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Step 6: Verify SBOM Attestation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Verifying SBOM attestation..."
echo ""

cosign verify-attestation --key cosign.pub \
  --type cyclonedx \
  $TEST_IMAGE

echo ""
echo -e "${GREEN}✓${NC} SBOM attestation verified"
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ All Tests Passed${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Test Summary:"
echo "  ✅ Image pulled successfully"
echo "  ✅ Image signed with Cosign"
echo "  ✅ Signature verified"
echo "  ✅ Signature details inspected"
echo "  ✅ SBOM attestation created"
echo "  ✅ SBOM attestation verified"
echo ""
echo -e "${GREEN}Your Cosign setup is working correctly!${NC}"
echo ""
echo "Next steps:"
echo "  1. Add keys to GitHub Secrets"
echo "  2. Test in CI/CD pipeline"
echo "  3. Deploy with signed images"
echo ""
echo "Commands:"
echo "  ${YELLOW}gh secret set COSIGN_PRIVATE_KEY < cosign.key${NC}"
echo "  ${YELLOW}gh secret set COSIGN_PASSWORD${NC}"
echo "  ${YELLOW}gh secret set COSIGN_PUBLIC_KEY < cosign.pub${NC}"
echo ""
