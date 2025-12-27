FROM node:20-alpine AS base

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

# Install dependencies
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

# Declare build arguments for environment validation
ARG DATABASE_URL
ARG NODE_ENV
ARG NEXTAUTH_SECRET
ARG SESSION_SECRET
ARG ENCRYPTION_KEY
ARG ENCRYPTION_MASTER_KEY
ARG CRON_SECRET
ARG DEID_SECRET
ARG NEXT_PUBLIC_APP_URL
ARG NEXTAUTH_URL

# AI Services (optional at build, required at runtime)
ARG ANTHROPIC_API_KEY
ARG GOOGLE_AI_API_KEY
ARG OPENAI_API_KEY

# Make them available as environment variables during build
ENV DATABASE_URL=$DATABASE_URL
ENV NODE_ENV=$NODE_ENV
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV SESSION_SECRET=$SESSION_SECRET
ENV ENCRYPTION_KEY=$ENCRYPTION_KEY
ENV ENCRYPTION_MASTER_KEY=$ENCRYPTION_MASTER_KEY
ENV CRON_SECRET=$CRON_SECRET
ENV DEID_SECRET=$DEID_SECRET
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
ENV GOOGLE_AI_API_KEY=$GOOGLE_AI_API_KEY
ENV OPENAI_API_KEY=$OPENAI_API_KEY

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

# Build the web app
RUN pnpm build

FROM base AS runner
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

CMD ["node", "apps/web/server.js"]
