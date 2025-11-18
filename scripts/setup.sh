#!/bin/bash

echo "🏥 Holi Protocol - Local Development Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "${BLUE}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo "${YELLOW}❌ Node.js not found. Please install Node.js 20+${NC}"
    exit 1
fi
echo "${GREEN}✓ Node.js installed${NC}"

if ! command -v pnpm &> /dev/null; then
    echo "${YELLOW}❌ pnpm not found. Installing pnpm...${NC}"
    npm install -g pnpm
fi
echo "${GREEN}✓ pnpm installed${NC}"

if ! command -v docker &> /dev/null; then
    echo "${YELLOW}❌ Docker not found. Please install Docker Desktop${NC}"
    exit 1
fi
echo "${GREEN}✓ Docker installed${NC}"

echo ""
echo "${BLUE}Installing dependencies...${NC}"
pnpm install

echo ""
echo "${BLUE}Starting infrastructure (Docker Compose)...${NC}"
cd infra/docker
docker-compose up -d

echo ""
echo "${BLUE}Waiting for services to be healthy...${NC}"
sleep 10

echo ""
echo "${BLUE}Setting up database...${NC}"
cd ../../apps/web

if [ ! -f .env ]; then
    echo "${YELLOW}Creating .env file from .env.example...${NC}"
    cp ../../.env.example .env
fi

pnpm db:generate
pnpm db:migrate

echo ""
echo "${GREEN}=========================================="
echo "✅ Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env with your API keys (Anthropic, Deepgram)"
echo "2. Run: pnpm dev"
echo "3. Open: http://localhost:3000"
echo ""
echo "View landing page: open public/landing.html"
echo "View database: pnpm db:studio"
echo ""
echo "${YELLOW}Happy coding! 🚀${NC}"
