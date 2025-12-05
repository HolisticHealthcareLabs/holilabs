#!/bin/bash

##############################################################################
# Production Deployment Script
# Web2 Interoperability Foundation (RNDS/TISS/IPS)
#
# Usage: ./deploy-production.sh
#
# This script must be run ON THE PRODUCTION SERVER
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_section() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Check if running on production server
check_environment() {
    log_section "Step 1: Environment Check"

    # Check if git is available
    if ! command -v git &> /dev/null; then
        log_error "git is not installed"
        exit 1
    fi
    log_success "git is installed"

    # Check if pnpm is available
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm is not installed"
        exit 1
    fi
    log_success "pnpm is installed"

    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository"
        exit 1
    fi
    log_success "In git repository"

    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    log_info "Current branch: $CURRENT_BRANCH"

    # Warn if not on main branch
    if [ "$CURRENT_BRANCH" != "main" ]; then
        log_warning "Not on main branch. Current branch: $CURRENT_BRANCH"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Deployment cancelled"
            exit 1
        fi
    fi
}

# Pull latest changes from git
pull_latest_changes() {
    log_section "Step 2: Pull Latest Changes"

    log_info "Checking for uncommitted changes..."
    if ! git diff-index --quiet HEAD --; then
        log_warning "Uncommitted changes detected. Stashing..."
        git stash
    fi

    log_info "Pulling latest changes from origin/$CURRENT_BRANCH..."
    git pull origin "$CURRENT_BRANCH"

    log_info "Recent commits:"
    git log --oneline -5

    # Verify we have the expected commits
    if git log --oneline -5 | grep -q "48811c5"; then
        log_success "Found commit 48811c5 (seed script)"
    else
        log_warning "Commit 48811c5 not found in recent history"
    fi

    if git log --oneline -5 | grep -q "fac2d38"; then
        log_success "Found commit fac2d38 (schema changes)"
    else
        log_warning "Commit fac2d38 not found in recent history"
    fi
}

# Install dependencies
install_dependencies() {
    log_section "Step 3: Install Dependencies"

    log_info "Installing dependencies with pnpm..."
    pnpm install --frozen-lockfile

    log_success "Dependencies installed"
}

# Generate Prisma migration
generate_migration() {
    log_section "Step 4: Generate Prisma Migration"

    cd apps/web

    log_info "Generating migration file..."
    pnpm prisma migrate dev --name 20251205_web2_interop_foundation --schema ../../prisma/schema.prisma --create-only

    if [ -d "prisma/migrations/20251205_web2_interop_foundation" ]; then
        log_success "Migration file created"
        log_info "Migration SQL:"
        head -20 prisma/migrations/20251205_web2_interop_foundation/migration.sql
    else
        log_warning "Migration file not created (may already exist)"
    fi

    cd ../..
}

# Deploy migration to database
deploy_migration() {
    log_section "Step 5: Deploy Migration to Database"

    log_warning "This will modify the production database schema!"
    log_info "Press Ctrl+C within 5 seconds to cancel..."
    sleep 5

    cd apps/web

    log_info "Deploying migration..."
    pnpm prisma migrate deploy --schema ../../prisma/schema.prisma

    log_success "Migration deployed successfully"

    cd ../..
}

# Run seed script
run_seed() {
    log_section "Step 6: Seed Reference Data"

    log_info "Running seed script..."
    pnpm db:seed

    log_success "Seed script completed"
}

# Restart application
restart_application() {
    log_section "Step 7: Restart Application"

    log_info "Attempting to restart application..."

    # Try different restart methods
    if command -v pm2 &> /dev/null; then
        log_info "Detected PM2, restarting..."
        pm2 restart all
        log_success "Application restarted with PM2"
    elif command -v docker-compose &> /dev/null; then
        log_info "Detected Docker Compose, restarting..."
        docker-compose restart web
        log_success "Application restarted with Docker Compose"
    elif command -v systemctl &> /dev/null; then
        log_info "Detected systemd, attempting restart..."
        sudo systemctl restart holilabs-web 2>/dev/null || log_warning "systemctl restart failed"
    else
        log_warning "Could not detect process manager. Please restart manually."
    fi
}

# Verify deployment
verify_deployment() {
    log_section "Step 8: Verify Deployment"

    # Check if database has new tables
    log_info "Verifying database schema..."

    cd apps/web

    # Use Prisma to verify
    if pnpm prisma db execute --schema ../../prisma/schema.prisma --stdin <<< "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'organizations';" &> /dev/null; then
        log_success "Organization table exists"
    else
        log_warning "Could not verify Organization table"
    fi

    # Check seed data
    log_info "Checking ICD-10 codes..."
    ICD10_COUNT=$(pnpm prisma db execute --schema ../../prisma/schema.prisma --stdin <<< "SELECT COUNT(*) FROM \"ICD10Code\";" 2>/dev/null || echo "0")
    if [ "$ICD10_COUNT" -gt 0 ]; then
        log_success "ICD-10 codes seeded: $ICD10_COUNT records"
    else
        log_warning "No ICD-10 codes found"
    fi

    log_info "Checking LOINC codes..."
    LOINC_COUNT=$(pnpm prisma db execute --schema ../../prisma/schema.prisma --stdin <<< "SELECT COUNT(*) FROM \"LoincCode\";" 2>/dev/null || echo "0")
    if [ "$LOINC_COUNT" -gt 0 ]; then
        log_success "LOINC codes seeded: $LOINC_COUNT records"
    else
        log_warning "No LOINC codes found"
    fi

    cd ../..

    # Check health endpoint
    log_info "Checking health endpoint..."
    sleep 3  # Give app time to restart

    if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Health check endpoint is responding"
    else
        log_warning "Health check endpoint is not responding (app may still be starting)"
    fi
}

# Main deployment flow
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║        🚀 Production Deployment Script                        ║"
    echo "║        Web2 Interoperability Foundation                       ║"
    echo "║        (RNDS/TISS/IPS)                                        ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""

    check_environment
    pull_latest_changes
    install_dependencies
    generate_migration
    deploy_migration
    run_seed
    restart_application
    verify_deployment

    log_section "🎉 Deployment Complete!"

    echo ""
    echo "Next steps:"
    echo "  1. Monitor application logs for errors"
    echo "  2. Verify Organization creation in Prisma Studio"
    echo "  3. Test IPS export functionality"
    echo "  4. Review DEPLOYMENT_INSTRUCTIONS.md for detailed verification"
    echo ""
    log_success "Deployment completed successfully! 🎊"
}

# Run main function
main
