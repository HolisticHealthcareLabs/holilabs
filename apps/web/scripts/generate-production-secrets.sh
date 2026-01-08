#!/bin/bash
# Production Secrets Generator
# Generates cryptographically secure secrets for production deployment
#
# WARNING: DO NOT commit the output of this script to Git!
# Copy the generated secrets directly to your production environment (DigitalOcean, Vercel, etc.)

set -e

echo "========================================"
echo "  PRODUCTION SECRETS GENERATOR"
echo "========================================"
echo ""
echo "Generated: $(date)"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTICE:"
echo "   1. DO NOT commit these secrets to Git"
echo "   2. DO NOT save this output to a file"
echo "   3. Copy directly to production environment variables"
echo "   4. Delete terminal history after use"
echo ""
echo "========================================"
echo ""

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo "❌ Error: openssl is not installed"
    echo "   Install with: brew install openssl (macOS) or apt-get install openssl (Linux)"
    exit 1
fi

echo "📝 Copy these environment variables to your production platform:"
echo ""
echo "# Session & Authentication Secrets"
echo "SESSION_SECRET=$(openssl rand -hex 32)"
echo "NEXTAUTH_SECRET=$(openssl rand -hex 32)"
echo ""

echo "# Encryption Keys (for PHI data)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "ENCRYPTION_MASTER_KEY=$(openssl rand -hex 32)"
echo "TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo ""

echo "# Background Jobs & Cron"
echo "CRON_SECRET=$(openssl rand -hex 32)"
echo ""

echo "# De-identification"
echo "DEID_SECRET=$(openssl rand -hex 32)"
echo ""

echo "========================================"
echo ""
echo "📋 DEPLOYMENT INSTRUCTIONS:"
echo ""
echo "For DigitalOcean App Platform:"
echo "  1. Go to: https://cloud.digitalocean.com/apps"
echo "  2. Select your app"
echo "  3. Settings → App-Level Environment Variables"
echo "  4. Update each secret listed above"
echo "  5. Click 'Save' → Redeploy"
echo ""
echo "For Vercel:"
echo "  1. Go to: https://vercel.com/dashboard"
echo "  2. Select your project → Settings → Environment Variables"
echo "  3. Update each secret for 'Production' environment"
echo "  4. Redeploy"
echo ""
echo "========================================"
echo ""
echo "🔐 EXTERNAL SERVICES TO ROTATE:"
echo ""
echo "1. Sentry Auth Token:"
echo "   → https://sentry.io/settings/auth-tokens/"
echo "   → Revoke old token → Create new"
echo ""
echo "2. Google OAuth Secret:"
echo "   → https://console.cloud.google.com/apis/credentials"
echo "   → Select your OAuth 2.0 Client → Regenerate secret"
echo ""
echo "3. Resend API Key:"
echo "   → https://resend.com/api-keys"
echo "   → Revoke old → Create new"
echo ""
echo "4. Twilio (if using SMS/WhatsApp):"
echo "   → https://console.twilio.com/"
echo "   → Create new Auth Token"
echo ""
echo "========================================"
echo ""
echo "⚠️  BREAKING CHANGE WARNING:"
echo "   Rotating secrets will invalidate ALL user sessions!"
echo "   Users must re-login after deployment."
echo "   Plan a maintenance window and notify users."
echo ""
echo "========================================"
