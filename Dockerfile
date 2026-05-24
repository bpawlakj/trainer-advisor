# syntax=docker/dockerfile:1.7
# ============================================================================
# Trainer Advisor — production image
#
# Three-stage build for a small final image:
#   1. deps    — install pnpm deps once, cacheable
#   2. build   — compile Next.js to .next/standalone
#   3. runtime — minimal node:alpine + copied standalone bundle
#
# Build context is the repo root; runtime config comes via env_file in
# docker-compose.yml on the Hetzner box. No secrets baked into the image.
#
# Local test: docker build -t trainer-advisor:local .
# ============================================================================

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=11.2.2

# ---- Stage 1: deps -------------------------------------------------------- #
FROM node:${NODE_VERSION} AS deps

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# Copy lockfile + manifest first so this layer caches when only source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Frozen lockfile is non-negotiable in CI/production builds — reproducibility
# guarantee that matches `~/.claude/rules/security.md` § Dependency Security.
RUN pnpm install --frozen-lockfile

# ---- Stage 2: build ------------------------------------------------------- #
FROM node:${NODE_VERSION} AS build

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# Re-use the populated node_modules from deps stage.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Telemetry off — Next.js phones home by default in build stage.
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# ---- Stage 3: runtime ----------------------------------------------------- #
FROM node:${NODE_VERSION} AS runtime

# Non-root user — same UID/GID as the upstream node image's 'node' user.
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Next.js standalone output already includes a minimal node_modules plus
# server.js. Static assets and public/ have to be copied separately.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000

# server.js is the entrypoint produced by next.config.ts `output: 'standalone'`.
CMD ["node", "server.js"]
