# syntax=docker/dockerfile:1

# ── Stage 1: base ──────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate
WORKDIR /app

# ── Stage 2: install dependencies ─────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ── Stage 3: build ─────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN pnpm run build

# ── Stage 4: production ───────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production

# Drizzle-kit needs these at runtime for migrations
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml drizzle.config.ts ./
COPY migrations ./migrations
COPY server/database/schema ./server/database/schema

# Nuxt production output
COPY --from=build /app/.output ./.output

# Entrypoint script (fix Windows CRLF line endings)
COPY docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
