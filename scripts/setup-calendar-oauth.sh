#!/bin/bash
# ============================================================================
# Calendar OAuth Setup Script
# Configures environment variables for Google/Microsoft calendar sync
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Calendar OAuth Setup - HoliLabs Healthcare Platform${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
fi

# Function to update or add environment variable
update_env_var() {
    local key=$1
    local value=$2
    local file=".env"

    if grep -q "^${key}=" "$file" 2>/dev/null; then
        # Update existing
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=\"${value}\"|" "$file"
        else
            sed -i "s|^${key}=.*|${key}=\"${value}\"|" "$file"
        fi
        echo -e "${GREEN}✓ Updated ${key}${NC}"
    else
        # Add new
        echo "${key}=\"${value}\"" >> "$file"
        echo -e "${GREEN}✓ Added ${key}${NC}"
    fi
}

echo -e "${YELLOW}Step 1: Configure Base URLs${NC}"
echo ""

# Get production URL
echo -e "Enter your production URL (default: https://holilabs.xyz):"
read -r PROD_URL
PROD_URL=${PROD_URL:-https://holilabs.xyz}

update_env_var "NEXT_PUBLIC_APP_URL" "$PROD_URL"
update_env_var "NEXTAUTH_URL" "$PROD_URL"

echo ""
echo -e "${YELLOW}Step 2: Configure Google Calendar OAuth${NC}"
echo ""
echo "Before proceeding, ensure you've created a Google OAuth application:"
echo "  1. Go to: https://console.cloud.google.com/apis/credentials"
echo "  2. Create OAuth 2.0 Client ID"
echo "  3. Add redirect URI: ${PROD_URL}/api/calendar/google/callback"
echo ""

echo "Enter Google Client ID (or press Enter to skip):"
read -r GOOGLE_CLIENT_ID

if [ -n "$GOOGLE_CLIENT_ID" ]; then
    update_env_var "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"

    echo "Enter Google Client Secret:"
    read -rs GOOGLE_CLIENT_SECRET
    update_env_var "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"
    echo ""
    echo -e "${GREEN}✓ Google OAuth configured${NC}"
else
    echo -e "${YELLOW}⚠ Skipped Google OAuth configuration${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Configure Microsoft Calendar OAuth${NC}"
echo ""
echo "Before proceeding, ensure you've created a Microsoft Azure AD application:"
echo "  1. Go to: https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps"
echo "  2. Register new application"
echo "  3. Add redirect URI: ${PROD_URL}/api/calendar/microsoft/callback"
echo "  4. Add API permissions: Calendars.ReadWrite, User.Read, offline_access"
echo ""

echo "Enter Microsoft Client ID (or press Enter to skip):"
read -r MICROSOFT_CLIENT_ID

if [ -n "$MICROSOFT_CLIENT_ID" ]; then
    update_env_var "MICROSOFT_CLIENT_ID" "$MICROSOFT_CLIENT_ID"

    echo "Enter Microsoft Client Secret:"
    read -rs MICROSOFT_CLIENT_SECRET
    update_env_var "MICROSOFT_CLIENT_SECRET" "$MICROSOFT_CLIENT_SECRET"
    echo ""
    echo -e "${GREEN}✓ Microsoft OAuth configured${NC}"
else
    echo -e "${YELLOW}⚠ Skipped Microsoft OAuth configuration${NC}"
fi

echo ""
echo -e "${YELLOW}Step 4: Configure Token Encryption${NC}"
echo ""

# Check if TOKEN_ENCRYPTION_KEY exists
if grep -q "^TOKEN_ENCRYPTION_KEY=" .env 2>/dev/null; then
    echo -e "${GREEN}✓ Token encryption key already configured${NC}"
else
    echo "Generating secure token encryption key..."
    TOKEN_KEY=$(openssl rand -hex 32)
    update_env_var "TOKEN_ENCRYPTION_KEY" "$TOKEN_KEY"
    echo -e "${GREEN}✓ Generated and saved token encryption key${NC}"
fi

echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}Calendar OAuth Setup Complete!${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Review your .env file: cat .env | grep -E 'GOOGLE|MICROSOFT|APP_URL'"
echo "  2. Restart your application: pnpm dev"
echo "  3. Test authorization:"
echo "     - Google: ${PROD_URL}/api/calendar/google/authorize"
echo "     - Microsoft: ${PROD_URL}/api/calendar/microsoft/authorize"
echo "  4. For production, update environment variables in DigitalOcean App Platform"
echo ""

echo -e "${YELLOW}Documentation:${NC}"
echo "  See: /docs/CALENDAR_SYNC_SETUP.md"
echo ""

echo -e "${YELLOW}Security Reminders:${NC}"
echo "  ⚠ Never commit .env file to git"
echo "  ⚠ Backup TOKEN_ENCRYPTION_KEY securely (losing it = lose all stored OAuth tokens)"
echo "  ⚠ Rotate client secrets every 90 days"
echo ""
