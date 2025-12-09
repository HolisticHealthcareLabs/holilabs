#!/bin/bash

# ============================================================================
# Holi Labs - Environment Variable Update Script
# ============================================================================
# This script helps you easily update your local .env.local file
# with your actual API keys from Deepgram and Twilio
# ============================================================================

set -e

ENV_FILE="apps/web/.env.local"
BACKUP_FILE="apps/web/.env.local.backup"

echo "🔧 Holi Labs - Environment Variable Updater"
echo "============================================"
echo ""

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Create backup
echo "📦 Creating backup: $BACKUP_FILE"
cp "$ENV_FILE" "$BACKUP_FILE"
echo "✅ Backup created"
echo ""

# Function to update a key in the env file
update_key() {
    local key=$1
    local value=$2
    local file=$3

    # Escape special characters for sed
    local escaped_value=$(echo "$value" | sed 's/[\/&]/\\&/g')

    # Update the key in the file
    sed -i.tmp "s|^${key}=.*|${key}=\"${escaped_value}\"|" "$file"
    rm -f "${file}.tmp"
}

# Prompt for Deepgram API Key
echo "🎤 Deepgram API Key"
echo "-------------------"
echo "Get your key from: https://console.deepgram.com"
echo ""
read -p "Paste your Deepgram API key (or press Enter to skip): " DEEPGRAM_KEY

if [ ! -z "$DEEPGRAM_KEY" ]; then
    update_key "DEEPGRAM_API_KEY" "$DEEPGRAM_KEY" "$ENV_FILE"
    echo "✅ Deepgram API key updated"
else
    echo "⏭️  Skipped Deepgram key"
fi
echo ""

# Prompt for Twilio Account SID
echo "📱 Twilio Credentials"
echo "--------------------"
echo "Get your credentials from: https://console.twilio.com"
echo ""
read -p "Paste your Twilio Account SID (or press Enter to skip): " TWILIO_SID

if [ ! -z "$TWILIO_SID" ]; then
    update_key "TWILIO_ACCOUNT_SID" "$TWILIO_SID" "$ENV_FILE"
    echo "✅ Twilio Account SID updated"
else
    echo "⏭️  Skipped Twilio SID"
fi
echo ""

# Prompt for Twilio Auth Token
read -p "Paste your Twilio Auth Token (or press Enter to skip): " TWILIO_TOKEN

if [ ! -z "$TWILIO_TOKEN" ]; then
    update_key "TWILIO_AUTH_TOKEN" "$TWILIO_TOKEN" "$ENV_FILE"
    echo "✅ Twilio Auth Token updated"
else
    echo "⏭️  Skipped Twilio Token"
fi
echo ""

# Prompt for Twilio Phone Number (optional)
read -p "Enter your Twilio Phone Number with country code (e.g., +15551234567) or press Enter to skip: " TWILIO_PHONE

if [ ! -z "$TWILIO_PHONE" ]; then
    update_key "TWILIO_PHONE_NUMBER" "$TWILIO_PHONE" "$ENV_FILE"
    update_key "TWILIO_WHATSAPP_NUMBER" "whatsapp:$TWILIO_PHONE" "$ENV_FILE"
    echo "✅ Twilio phone numbers updated"
else
    echo "⏭️  Skipped phone numbers"
fi
echo ""

# Prompt for Anthropic API Key (optional)
echo "🤖 Anthropic API Key (Optional but Recommended)"
echo "-----------------------------------------------"
echo "Get your key from: https://console.anthropic.com"
echo "This enables better AI clinical decision support"
echo ""
read -p "Paste your Anthropic API key (or press Enter to skip): " ANTHROPIC_KEY

if [ ! -z "$ANTHROPIC_KEY" ]; then
    update_key "ANTHROPIC_API_KEY" "$ANTHROPIC_KEY" "$ENV_FILE"
    echo "✅ Anthropic API key updated"
else
    echo "⏭️  Skipped Anthropic key"
fi
echo ""

# Summary
echo "============================================"
echo "✅ Environment variables updated!"
echo ""
echo "📝 Updated file: $ENV_FILE"
echo "📦 Backup saved: $BACKUP_FILE"
echo ""
echo "🚀 Next steps:"
echo "1. Restart your dev server if running: pnpm dev"
echo "2. Test the AI Scribe feature to verify Deepgram works"
echo "3. Test SMS/WhatsApp to verify Twilio works"
echo ""
echo "💡 To view your updated .env.local file:"
echo "   cat $ENV_FILE"
echo ""
echo "🔄 To restore from backup:"
echo "   cp $BACKUP_FILE $ENV_FILE"
echo ""
echo "============================================"
