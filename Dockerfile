FROM node:20-alpine AS base

# OCI metadata labels
LABEL org.opencontainers.image.title="Holi Labs Healthcare Platform" \
      org.opencontainers.image.description="HIPAA/LGPD-compliant healthcare SaaS" \
      org.opencontainers.image.vendor="Holi Labs" \
      org.opencontainers.image.source="https://github.com/HolisticHealthcareLabs/holilabs"

# Install OpenSSL for Prisma compatibility
RUN apk add --no-cache openssl libc6-compat

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/utils/package.json ./packages/utils/
COPY packages/deid/package.json ./packages/deid/
COPY packages/dp/package.json ./packages/dp/
COPY packages/data-ingestion/package.json ./packages/data-ingestion/
COPY packages/event-bus/package.json ./packages/event-bus/

# Install dependencies
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

# SECURITY: Skip env validation at build time — secrets injected at runtime only.
# Never pass secrets as Docker build ARGs (visible in image layer history).
ENV SKIP_ENV_VALIDATION=true
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/deid/node_modules ./packages/deid/node_modules

# Copy source code
COPY . .

# Build workspace packages first (deid package)
WORKDIR /app/packages/deid
RUN pnpm build

# Generate Prisma Client
WORKDIR /app/apps/web
RUN pnpm prisma generate

# Build the web app (increase heap for TypeScript checker on memory-constrained CI)
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm build
ENV NODE_OPTIONS=""

# Production runner — clean image, no package managers (corepack/pnpm removed)
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Copy public folder from source (not from .next/standalone)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health/live',(r)=>{process.exit(r.statusCode===200?0:1)})"

CMD ["node", "apps/web/server.js"]
