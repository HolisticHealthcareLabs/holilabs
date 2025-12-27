# ============================================================================
# Holi API - Production Dockerfile
# Multi-stage build for optimized image size and security
# ============================================================================

# Stage 1: Dependencies
# ----------------------------------------------------------------------------
FROM node:20-alpine AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package.json files for all workspaces
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/*/

# Install dependencies (frozen lockfile for reproducible builds)
RUN pnpm install --frozen-lockfile --filter @holilabs/api...

# Stage 2: Builder
# ----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages

# Copy source code
COPY apps/api ./apps/api
COPY pnpm-workspace.yaml package.json ./

# Generate Prisma Client
WORKDIR /app/apps/api
RUN pnpm prisma generate

# Build TypeScript
RUN pnpm build

# Stage 3: Runner (Production)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]

# ============================================================================
# Build Instructions:
#
# Development build:
#   docker build -t holilabs/api:dev -f apps/api/Dockerfile .
#
# Production build with tag:
#   docker build -t holilabs/api:1.0.0 -f apps/api/Dockerfile .
#
# Run container:
#   docker run -p 3000:3000 --env-file .env holilabs/api:1.0.0
#
# ============================================================================
