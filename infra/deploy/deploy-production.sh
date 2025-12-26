#!/bin/bash

#############################################################################
# Holi Labs - Production Deployment Script
#############################################################################
#
# Automated production deployment with health checks, smoke tests, and
# automatic rollback on failure.
#
# Usage:
#   ./deploy-production.sh                    # Deploy to default production
#   ./deploy-production.sh --dry-run          # Simulate deployment
#   ./deploy-production.sh --skip-tests       # Skip smoke tests (not recommended)
#   ./deploy-production.sh --rollback         # Rollback to previous version
#
# Prerequisites:
#   - Docker and Docker Compose installed
#   - kubectl configured (if deploying to Kubernetes)
#   - Database backup taken
#   - All environment variables set
#
#############################################################################

set -e  # Exit on error
set -o pipefail

#############################################################################
# Configuration
#############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Deployment configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
DEPLOYMENT_METHOD="${DEPLOYMENT_METHOD:-docker-compose}"  # docker-compose, kubernetes, or digitalocean
DRY_RUN=false
SKIP_TESTS=false
ROLLBACK=false

# Version management
DEPLOY_VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
DEPLOY_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_TAG="${DEPLOY_VERSION}_${DEPLOY_TIMESTAMP}"

# Backup configuration
BACKUP_DIR="${BACKUP_DIR:-/tmp/holi-backups}"
KEEP_BACKUPS=5

# Health check configuration
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_DELAY=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

#############################################################################
# Logging Functions
#############################################################################

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

log_step() {
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}$1${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

#############################################################################
# Argument Parsing
#############################################################################

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      log_warning "DRY RUN MODE - No changes will be made"
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      log_warning "Skipping smoke tests (NOT RECOMMENDED for production)"
      shift
      ;;
    --rollback)
      ROLLBACK=true
      shift
      ;;
    --method)
      DEPLOYMENT_METHOD="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --dry-run          Simulate deployment without making changes"
      echo "  --skip-tests       Skip smoke tests (not recommended)"
      echo "  --rollback         Rollback to previous deployment"
      echo "  --method METHOD    Deployment method (docker-compose, kubernetes, digitalocean)"
      echo "  --help             Show this help message"
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

#############################################################################
# Pre-Flight Checks
#############################################################################

preflight_checks() {
  log_step "Step 1: Pre-Flight Checks"

  # Check if running from correct directory
  if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    log_error "Must run from project root or infra/deploy directory"
    exit 1
  fi
  log_success "Running from project root: $PROJECT_ROOT"

  # Check git status
  if [ "$DRY_RUN" = false ]; then
    if [ -n "$(git status --porcelain)" ]; then
      log_warning "Working directory has uncommitted changes"
      read -p "Continue anyway? (y/N) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
      fi
    else
      log_success "Git working directory clean"
    fi
  fi

  # Check required tools
  log_info "Checking required tools..."

  if ! command -v docker &> /dev/null; then
    log_error "Docker not installed"
    exit 1
  fi
  log_success "Docker installed: $(docker --version)"

  if [ "$DEPLOYMENT_METHOD" = "docker-compose" ]; then
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
      log_error "Docker Compose not installed"
      exit 1
    fi
    log_success "Docker Compose installed"
  fi

  if [ "$DEPLOYMENT_METHOD" = "kubernetes" ]; then
    if ! command -v kubectl &> /dev/null; then
      log_error "kubectl not installed"
      exit 1
    fi
    log_success "kubectl installed: $(kubectl version --client --short 2>/dev/null || kubectl version --client)"
  fi

  # Check environment variables
  log_info "Checking environment variables..."

  required_vars=(
    "DATABASE_URL"
    "REDIS_URL"
    "JWT_SECRET"
  )

  for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
      log_error "Required environment variable not set: $var"
      exit 1
    fi
  done
  log_success "All required environment variables set"

  # Check database connectivity
  log_info "Checking database connectivity..."
  if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    log_success "Database connection successful"
  else
    log_error "Cannot connect to database"
    exit 1
  fi

  # Check Redis connectivity
  log_info "Checking Redis connectivity..."
  if redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
    log_success "Redis connection successful"
  else
    log_error "Cannot connect to Redis"
    exit 1
  fi

  log_success "All pre-flight checks passed"
}

#############################################################################
# Backup Current State
#############################################################################

backup_current_state() {
  log_step "Step 2: Backup Current State"

  if [ "$DRY_RUN" = true ]; then
    log_info "DRY RUN: Would create backup"
    return
  fi

  # Create backup directory
  mkdir -p "$BACKUP_DIR"

  # Backup database
  log_info "Creating database backup..."
  BACKUP_FILE="$BACKUP_DIR/database_${DEPLOY_TIMESTAMP}.sql.gz"

  if pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"; then
    log_success "Database backed up to: $BACKUP_FILE"
  else
    log_error "Database backup failed"
    exit 1
  fi

  # Save current Docker image tag (if using Docker)
  if [ "$DEPLOYMENT_METHOD" = "docker-compose" ]; then
    log_info "Saving current Docker image tags..."
    docker images --format "{{.Repository}}:{{.Tag}}" | grep "holi" > "$BACKUP_DIR/images_${DEPLOY_TIMESTAMP}.txt" || true
    log_success "Image tags saved"
  fi

  # Cleanup old backups (keep last 5)
  log_info "Cleaning up old backups (keeping last $KEEP_BACKUPS)..."
  cd "$BACKUP_DIR"
  ls -t database_*.sql.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs rm -f || true
  ls -t images_*.txt 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs rm -f || true
  cd - > /dev/null

  log_success "Backup completed"
}

#############################################################################
# Build & Push Images
#############################################################################

build_and_push_images() {
  log_step "Step 3: Build & Push Docker Images"

  if [ "$DRY_RUN" = true ]; then
    log_info "DRY RUN: Would build and push images"
    return
  fi

  cd "$PROJECT_ROOT"

  # Build API image
  log_info "Building API image..."
  docker build -t "holilabs/api:${DEPLOY_TAG}" -f apps/api/Dockerfile . || {
    log_error "Failed to build API image"
    exit 1
  }
  docker tag "holilabs/api:${DEPLOY_TAG}" "holilabs/api:latest"
  log_success "API image built"

  # Build web image (if needed)
  if [ -f "apps/web/Dockerfile" ]; then
    log_info "Building web image..."
    docker build -t "holilabs/web:${DEPLOY_TAG}" -f apps/web/Dockerfile . || {
      log_error "Failed to build web image"
      exit 1
    }
    docker tag "holilabs/web:${DEPLOY_TAG}" "holilabs/web:latest"
    log_success "Web image built"
  fi

  # Push images to registry (if configured)
  if [ -n "$DOCKER_REGISTRY" ]; then
    log_info "Pushing images to registry..."

    docker tag "holilabs/api:${DEPLOY_TAG}" "${DOCKER_REGISTRY}/holilabs/api:${DEPLOY_TAG}"
    docker push "${DOCKER_REGISTRY}/holilabs/api:${DEPLOY_TAG}" || {
      log_error "Failed to push API image"
      exit 1
    }

    if [ -f "apps/web/Dockerfile" ]; then
      docker tag "holilabs/web:${DEPLOY_TAG}" "${DOCKER_REGISTRY}/holilabs/web:${DEPLOY_TAG}"
      docker push "${DOCKER_REGISTRY}/holilabs/web:${DEPLOY_TAG}" || {
        log_error "Failed to push web image"
        exit 1
      }
    fi

    log_success "Images pushed to registry"
  fi

  log_success "Build completed"
}

#############################################################################
# Run Database Migrations
#############################################################################

run_migrations() {
  log_step "Step 4: Run Database Migrations"

  if [ "$DRY_RUN" = true ]; then
    log_info "DRY RUN: Would run migrations"
    return
  fi

  cd "$PROJECT_ROOT/apps/api"

  log_info "Running Prisma migrations..."

  # Generate Prisma client
  pnpm prisma generate || {
    log_error "Failed to generate Prisma client"
    exit 1
  }

  # Run migrations
  pnpm prisma migrate deploy || {
    log_error "Migration failed - rolling back"
    rollback_deployment
    exit 1
  }

  log_success "Migrations completed"
}

#############################################################################
# Deploy Application
#############################################################################

deploy_application() {
  log_step "Step 5: Deploy Application"

  if [ "$DRY_RUN" = true ]; then
    log_info "DRY RUN: Would deploy application"
    return
  fi

  case $DEPLOYMENT_METHOD in
    docker-compose)
      deploy_docker_compose
      ;;
    kubernetes)
      deploy_kubernetes
      ;;
    digitalocean)
      deploy_digitalocean
      ;;
    *)
      log_error "Unknown deployment method: $DEPLOYMENT_METHOD"
      exit 1
      ;;
  esac

  log_success "Deployment completed"
}

deploy_docker_compose() {
  log_info "Deploying with Docker Compose..."

  cd "$PROJECT_ROOT"

  # Pull latest images (if using registry)
  if [ -n "$DOCKER_REGISTRY" ]; then
    docker-compose pull || true
  fi

  # Stop old containers
  log_info "Stopping old containers..."
  docker-compose down || true

  # Start new containers
  log_info "Starting new containers..."
  docker-compose up -d || {
    log_error "Failed to start containers"
    exit 1
  }

  log_success "Docker Compose deployment complete"
}

deploy_kubernetes() {
  log_info "Deploying to Kubernetes..."

  cd "$PROJECT_ROOT/infra/k8s"

  # Apply ConfigMaps and Secrets
  log_info "Applying ConfigMaps and Secrets..."
  kubectl apply -f config/ || {
    log_error "Failed to apply configs"
    exit 1
  }

  # Apply deployments with new image tag
  log_info "Updating deployments..."
  kubectl set image deployment/holi-api \
    holi-api="${DOCKER_REGISTRY}/holilabs/api:${DEPLOY_TAG}" || {
    log_error "Failed to update deployment"
    exit 1
  }

  # Wait for rollout
  log_info "Waiting for rollout to complete..."
  kubectl rollout status deployment/holi-api --timeout=5m || {
    log_error "Rollout failed"
    kubectl rollout undo deployment/holi-api
    exit 1
  }

  log_success "Kubernetes deployment complete"
}

deploy_digitalocean() {
  log_info "Deploying to DigitalOcean App Platform..."

  if ! command -v doctl &> /dev/null; then
    log_error "doctl not installed"
    exit 1
  fi

  # Get app ID
  APP_ID="${DIGITALOCEAN_APP_ID}"
  if [ -z "$APP_ID" ]; then
    log_error "DIGITALOCEAN_APP_ID not set"
    exit 1
  fi

  # Trigger deployment
  log_info "Triggering DigitalOcean deployment..."
  doctl apps create-deployment "$APP_ID" --wait || {
    log_error "DigitalOcean deployment failed"
    exit 1
  }

  log_success "DigitalOcean deployment complete"
}

#############################################################################
# Health Checks
#############################################################################

wait_for_health() {
  log_step "Step 6: Health Checks"

  if [ "$DRY_RUN" = true ]; then
    log_info "DRY RUN: Would check health"
    return
  fi

  # Determine API URL
  case $DEPLOYMENT_METHOD in
    docker-compose)
      API_URL="${API_URL:-http://localhost:3000}"
      ;;
    kubernetes)
      API_URL="${API_URL:-http://localhost:8080}"  # Assuming port-forward or ingress
      ;;
    digitalocean)
      API_URL="${API_URL:-https://api.holilabs.xyz}"
      ;;
  esac

  log_info "Waiting for API to be healthy at $API_URL..."

  for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    if curl -sf "$API_URL/health" > /dev/null 2>&1; then
      log_success "API is healthy (attempt $i/$HEALTH_CHECK_RETRIES)"
      break
    else
      if [ $i -eq $HEALTH_CHECK_RETRIES ]; then
        log_error "API failed to become healthy after $HEALTH_CHECK_RETRIES attempts"
        log_error "Rolling back deployment..."
        rollback_deployment
        exit 1
      fi
      log_info "Waiting for API... (attempt $i/$HEALTH_CHECK_RETRIES)"
      sleep $HEALTH_CHECK_DELAY
    fi
  done

  # Check all health endpoints
  log_info "Checking readiness probe..."
  if ! curl -sf "$API_URL/health/ready" > /dev/null; then
    log_error "Readiness probe failed"
    rollback_deployment
    exit 1
  fi
  log_success "Readiness probe passed"

  log_info "Checking liveness probe..."
  if ! curl -sf "$API_URL/health/live" > /dev/null; then
    log_error "Liveness probe failed"
    rollback_deployment
    exit 1
  fi
  log_success "Liveness probe passed"

  log_success "All health checks passed"
}

#############################################################################
# Run Smoke Tests
#############################################################################

run_smoke_tests() {
  log_step "Step 7: Run Smoke Tests"

  if [ "$SKIP_TESTS" = true ]; then
    log_warning "Skipping smoke tests (as requested)"
    return
  fi

  if [ "$DRY_RUN" = true ]; then
    log_info "DRY RUN: Would run smoke tests"
    return
  fi

  log_info "Running smoke tests..."

  # Run smoke test script
  if [ -f "$PROJECT_ROOT/demos/smoke-tests.sh" ]; then
    cd "$PROJECT_ROOT/demos"
    chmod +x smoke-tests.sh

    if ./smoke-tests.sh --quick --env "$ENVIRONMENT"; then
      log_success "Smoke tests passed"
    else
      log_error "Smoke tests failed - rolling back"
      rollback_deployment
      exit 1
    fi
  else
    log_warning "Smoke test script not found - skipping"
  fi

  log_success "Smoke tests completed"
}

#############################################################################
# Post-Deployment Tasks
#############################################################################

post_deployment_tasks() {
  log_step "Step 8: Post-Deployment Tasks"

  if [ "$DRY_RUN" = true ]; then
    log_info "DRY RUN: Would run post-deployment tasks"
    return
  fi

  # Run reconciliation job
  log_info "Running FHIR reconciliation..."
  API_URL="${API_URL:-http://localhost:3000}"
  curl -sf -X POST "$API_URL/fhir/admin/reconciliation/run" > /dev/null || {
    log_warning "Reconciliation job failed to start"
  }

  # Clear Redis cache (if needed)
  log_info "Clearing Redis cache..."
  redis-cli -u "$REDIS_URL" FLUSHDB || {
    log_warning "Failed to clear Redis cache"
  }

  # Tag Git commit
  log_info "Tagging Git commit..."
  git tag -a "deploy-prod-${DEPLOY_TIMESTAMP}" -m "Production deployment ${DEPLOY_TIMESTAMP}" || true
  git push origin "deploy-prod-${DEPLOY_TIMESTAMP}" || true

  log_success "Post-deployment tasks completed"
}

#############################################################################
# Rollback
#############################################################################

rollback_deployment() {
  log_step "ROLLBACK: Reverting to Previous Version"

  if [ "$DRY_RUN" = true ]; then
    log_info "DRY RUN: Would rollback"
    return
  fi

  case $DEPLOYMENT_METHOD in
    docker-compose)
      log_info "Rolling back Docker Compose deployment..."
      cd "$PROJECT_ROOT"
      docker-compose down
      docker-compose up -d
      ;;
    kubernetes)
      log_info "Rolling back Kubernetes deployment..."
      kubectl rollout undo deployment/holi-api
      kubectl rollout status deployment/holi-api --timeout=5m
      ;;
    digitalocean)
      log_error "Manual rollback required for DigitalOcean"
      log_info "Use: doctl apps list-deployments $DIGITALOCEAN_APP_ID"
      log_info "Then: doctl apps create-deployment $DIGITALOCEAN_APP_ID --deployment-id <previous-id>"
      ;;
  esac

  # Restore database backup (if needed)
  log_warning "To restore database, run:"
  log_info "  gunzip -c $BACKUP_DIR/database_${DEPLOY_TIMESTAMP}.sql.gz | psql $DATABASE_URL"

  log_success "Rollback initiated"
}

#############################################################################
# Cleanup
#############################################################################

cleanup() {
  log_step "Step 9: Cleanup"

  if [ "$DRY_RUN" = true ]; then
    log_info "DRY RUN: Would cleanup"
    return
  fi

  # Remove dangling Docker images
  log_info "Cleaning up Docker images..."
  docker image prune -f || true

  log_success "Cleanup completed"
}

#############################################################################
# Print Deployment Summary
#############################################################################

print_summary() {
  log_step "Deployment Summary"

  echo ""
  echo -e "  ${BOLD}Environment:${NC}      $ENVIRONMENT"
  echo -e "  ${BOLD}Method:${NC}           $DEPLOYMENT_METHOD"
  echo -e "  ${BOLD}Version:${NC}          $DEPLOY_VERSION"
  echo -e "  ${BOLD}Tag:${NC}              $DEPLOY_TAG"
  echo -e "  ${BOLD}Timestamp:${NC}        $DEPLOY_TIMESTAMP"
  echo ""

  if [ "$DRY_RUN" = false ]; then
    echo -e "  ${BOLD}API URL:${NC}          ${API_URL:-http://localhost:3000}"
    echo -e "  ${BOLD}Health:${NC}           ${API_URL:-http://localhost:3000}/health"
    echo -e "  ${BOLD}Metrics:${NC}          ${API_URL:-http://localhost:3000}/metrics"
    echo -e "  ${BOLD}Grafana:${NC}          ${GRAFANA_URL:-http://localhost:3001}"
    echo ""

    log_info "Next steps:"
    echo "  1. Monitor Grafana dashboard for anomalies"
    echo "  2. Check error rates and latency metrics"
    echo "  3. Review logs: docker-compose logs -f holi-api"
    echo "  4. Verify FHIR sync queue is processing"
    echo "  5. Test critical user flows"
    echo ""

    log_warning "Rollback if needed:"
    echo "  ./deploy-production.sh --rollback"
  fi

  echo ""
}

#############################################################################
# Main Execution
#############################################################################

main() {
  echo ""
  echo -e "${BOLD}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}║         Holi Labs - Production Deployment                    ║${NC}"
  echo -e "${BOLD}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  if [ "$ROLLBACK" = true ]; then
    rollback_deployment
    exit 0
  fi

  preflight_checks
  backup_current_state
  build_and_push_images
  run_migrations
  deploy_application
  wait_for_health
  run_smoke_tests
  post_deployment_tasks
  cleanup
  print_summary

  echo ""
  log_success "Deployment completed successfully! 🚀"
  echo ""
}

# Trap errors
trap 'log_error "Deployment failed at line $LINENO"; exit 1' ERR

# Run main
main

#############################################################################
# End of Script
#############################################################################
