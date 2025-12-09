#!/bin/bash

# Holi Labs - Invitation System Setup Script
# Run this to complete the setup after the code changes

set -e

echo "🚀 Setting up Holi Labs Invitation System..."
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing react-hot-toast..."
cd /Users/nicolacapriroloteran/prototypes/holilabsv2
pnpm install
echo "✅ Dependencies installed"
echo ""

# Step 2: Format Prisma schema
echo "📝 Step 2: Formatting Prisma schema..."
npx prisma format
echo "✅ Schema formatted"
echo ""

# Step 3: Create migration
echo "🗄️  Step 3: Creating database migration..."
npx prisma migrate dev --name add_invitation_system
echo "✅ Migration created and applied"
echo ""

# Step 4: Generate Prisma Client
echo "🔧 Step 4: Generating Prisma Client..."
npx prisma generate
echo "✅ Prisma Client generated"
echo ""

# Step 5: Check environment variables
echo "🔐 Step 5: Checking environment variables..."
if grep -q "ADMIN_API_KEY" .env; then
    echo "✅ ADMIN_API_KEY found in .env"
else
    echo "⚠️  ADMIN_API_KEY not found in .env"
    echo ""
    echo "Please add to your .env file:"
    echo "ADMIN_API_KEY=$(openssl rand -hex 32)"
    echo ""
fi
echo ""

echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure ADMIN_API_KEY is set in your .env file"
echo "2. Restart your development server"
echo "3. Visit http://localhost:3000 to test the landing page"
echo "4. Visit http://localhost:3000/admin/invitations to manage codes"
echo ""
echo "📚 Documentation: INVITATION_SYSTEM_GUIDE.md"
echo ""

