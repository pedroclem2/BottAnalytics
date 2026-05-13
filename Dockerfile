# syntax=docker/dockerfile:1.7
# =============================================================================
# Production image for the bott_analytics dashboard (Next.js standalone).
# Multi-stage so we only ship the compiled server + runtime deps.
# =============================================================================

# ---------- deps ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY web/package.json web/yarn.lock ./
RUN corepack disable && yarn install --frozen-lockfile --network-timeout 600000

# ---------- builder ----------
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY web/ ./
# The build expects DATABASE_URL only at request time, so a build-time stub is fine.
ENV DATABASE_URL="postgresql://placeholder:placeholder@build/placeholder"
RUN yarn build

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S nextjs && adduser -S -G nextjs nextjs

COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --retries=5 \
  CMD wget -q -O - "http://127.0.0.1:${PORT}/" >/dev/null || exit 1

CMD ["node", "server.js"]
