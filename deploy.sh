#!/bin/bash
set -e

# Holilabs Deployment Script - Master Source of Truth Sync Protocol
# Pushes local changes to production server and triggers remote build

REMOTE_USER="root"
REMOTE_HOST="129.212.184.190"
REMOTE_PATH="/root/holilabs/"
LOCAL_PATH="."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Holilabs Deployment Pipeline ===${NC}"
echo -e "${YELLOW}Source:${NC} $(pwd)"
echo -e "${YELLOW}Target:${NC} ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}"
echo ""

# Pre-flight checks
echo -e "${YELLOW}[1/6] Pre-flight checks...${NC}"
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

# Check SSH connectivity
echo -e "${YELLOW}[2/6] Testing SSH connectivity...${NC}"
if ! ssh -o ConnectTimeout=5 ${REMOTE_USER}@${REMOTE_HOST} "echo 'SSH OK'" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to ${REMOTE_HOST}${NC}"
    echo "Please ensure:"
    echo "  1. SSH key is configured (~/.ssh/id_rsa)"
    echo "  2. Server is reachable"
    echo "  3. Root access is available"
    exit 1
fi
echo -e "${GREEN}✓ SSH connection successful${NC}"

# Sync files via rsync
echo -e "${YELLOW}[3/6] Syncing files to remote server...${NC}"
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.next' \
  --exclude 'dist' \
  --exclude 'build' \
  --exclude '.turbo' \
  --exclude '*.log' \
  --exclude '.env.local' \
  --exclude 'PRODUCTION_SECRETS.txt' \
  ${LOCAL_PATH}/ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: rsync failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ File sync complete${NC}"

# Execute remote build and deployment
echo -e "${YELLOW}[4/6] Installing dependencies on remote...${NC}"
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
cd /root/holilabs
export NODE_ENV=production

# Check if swap exists, create if not
if [ ! -f /swapfile ]; then
    echo "Creating 4GB swap file for build stability..."
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Install dependencies
pnpm install --frozen-lockfile
ENDSSH

echo -e "${GREEN}✓ Dependencies installed${NC}"

echo -e "${YELLOW}[5/6] Building application on remote...${NC}"
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
cd /root/holilabs
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=3072"

# Build with memory constraints
pnpm build

# Generate Prisma client
cd apps/web
pnpm prisma generate
ENDSSH

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Remote build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"

echo -e "${YELLOW}[6/6] Restarting services...${NC}"
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
cd /root/holilabs

# Restart using PM2 or Docker Compose
if command -v pm2 &> /dev/null; then
    pm2 restart holilabs || pm2 start apps/web/package.json --name holilabs
elif [ -f "docker-compose.yml" ]; then
    docker-compose down
    docker-compose up -d --build
else
    echo "Warning: No process manager found. You may need to restart manually."
fi
ENDSSH

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo -e "${GREEN}✓ Application deployed to ${REMOTE_HOST}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  - Monitor logs: ssh ${REMOTE_USER}@${REMOTE_HOST} 'pm2 logs holilabs'"
echo "  - Check health: curl https://your-domain.com/api/health"
echo ""
