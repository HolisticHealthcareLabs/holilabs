#!/bin/bash

# World-Class Agenda System - Quick Setup Script
# This script helps set up the agenda system quickly

set -e

echo "🚀 Holi Labs - Agenda System Setup"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping .env creation..."
        SKIP_ENV=true
    fi
fi

# Create .env from example if needed
if [ "$SKIP_ENV" != true ]; then
    if [ -f ".env.example" ]; then
        echo -e "${GREEN}✅ Creating .env from .env.example...${NC}"
        cp .env.example .env
        echo ""
        echo -e "${YELLOW}📝 IMPORTANT: Edit .env file and set:${NC}"
        echo "   - DATABASE_URL (PostgreSQL connection string)"
        echo "   - NEXTAUTH_SECRET (run: openssl rand -base64 32)"
        echo "   - TWILIO_* (for WhatsApp notifications)"
        echo "   - RESEND_API_KEY (for email notifications)"
        echo ""
        read -p "Press Enter once you've configured .env..."
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
fi

# Check if DATABASE_URL is set
if ! grep -q "^DATABASE_URL=" .env 2>/dev/null || grep -q "DATABASE_URL=\"postgresql://user:password" .env 2>/dev/null; then
    echo -e "${RED}❌ DATABASE_URL not configured in .env${NC}"
    echo "Please set your database connection string in .env"
    echo ""
    echo "Example formats:"
    echo "  Local:    DATABASE_URL=\"postgresql://user:pass@localhost:5432/holi_labs\""
    echo "  Supabase: DATABASE_URL=\"postgresql://user:pass@host.supabase.co:5432/postgres\""
    echo ""
    exit 1
fi

echo ""
echo "📦 Step 1: Installing dependencies..."
pnpm install

echo ""
echo "🔧 Step 2: Generating Prisma Client..."
npx prisma generate

echo ""
echo "🗄️  Step 3: Running database migration..."
echo -e "${YELLOW}This will create/update database tables...${NC}"
npx prisma migrate dev --name enhanced-agenda-system

echo ""
echo "🌱 Step 4: Seeding default situations..."
tsx prisma/seed-situations.ts

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "🎉 The agenda system is ready!"
echo ""
echo "Next steps:"
echo "  1. Start dev server: pnpm dev"
echo "  2. Open browser: http://localhost:3000/dashboard/agenda"
echo "  3. Create your first appointment"
echo ""
echo "Available routes:"
echo "  📅 Agenda:      /dashboard/agenda"
echo "  📝 Templates:   /dashboard/templates"
echo "  🔄 Reschedules: /dashboard/reschedules"
echo ""
echo "For more details, see: AGENDA_SETUP_GUIDE.md"
echo ""
