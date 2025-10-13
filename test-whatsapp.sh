#!/bin/bash

# Test WhatsApp Integration Script
# This will test if your Twilio WhatsApp setup is working

echo "🧪 Testing WhatsApp Integration..."
echo ""

# Check if we're testing local or production
read -p "Test local (l) or production (p)? [l/p]: " ENV_CHOICE

if [ "$ENV_CHOICE" = "p" ]; then
  BASE_URL="https://holilabs-lwp6y.ondigitalocean.app"
  echo "📍 Testing PRODUCTION: $BASE_URL"
else
  BASE_URL="http://localhost:3000"
  echo "📍 Testing LOCAL: $BASE_URL"
fi

echo ""
echo "Enter your CRON_SECRET (from DigitalOcean env vars):"
read -s CRON_SECRET

echo ""
echo "🚀 Triggering appointment reminders..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/cron/send-appointment-reminders" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""
echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ SUCCESS! Check WhatsApp for messages."
  echo ""
  echo "If you didn't receive a WhatsApp message, check:"
  echo "  1. Did you join the Twilio sandbox? (send 'join <code>' to +1 415 523 8886)"
  echo "  2. Do you have appointments scheduled for tomorrow?"
  echo "  3. Do patients have phone numbers in database?"
elif [ "$HTTP_CODE" = "401" ]; then
  echo "❌ UNAUTHORIZED - Check your CRON_SECRET is correct"
else
  echo "❌ ERROR - Check logs for details"
fi
