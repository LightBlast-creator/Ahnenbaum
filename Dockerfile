# =============================================================================
# Ahnenbaum — Single-container production Dockerfile
# =============================================================================
# Stages:
#   deps   → Install ALL dependencies (dev + prod, native builds)
#   build  → Compile core, server, and client workspaces
#   prod   → Single production container (server serves client static)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: deps — install all dependencies
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps

# Native build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json

RUN npm ci --ignore-scripts && npm rebuild better-sqlite3

# ---------------------------------------------------------------------------
# Stage 2: build — compile all workspaces
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Copy deps from previous stage (npm workspaces hoists everything to root)
COPY --from=deps /app/node_modules ./node_modules

# Copy all source code
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/ packages/core/
COPY packages/server/ packages/server/
COPY packages/client/ packages/client/

# Build all workspaces: core → server → client
RUN npm run build --workspaces && \
    find packages/core/dist packages/server/dist -name '*.map' -delete

# ---------------------------------------------------------------------------
# Stage 2.5: prune — strip devDependencies from node_modules
# ---------------------------------------------------------------------------
FROM deps AS prune
RUN npm prune --omit=dev

# ---------------------------------------------------------------------------
# Stage 3: prod — single production container
# ---------------------------------------------------------------------------
FROM node:22-alpine AS prod

ENV NODE_ENV=production

RUN apk add --no-cache curl

WORKDIR /app

# Copy pruned production node_modules (native binaries already built, workspace symlinks included)
COPY --from=prune /app/node_modules ./node_modules

# Copy workspace manifests (needed for Node.js package resolution)
COPY package.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json

# Copy compiled core (no source needed — tsc emits proper .js extensions)
COPY --from=build /app/packages/core/dist packages/core/dist

# Copy compiled server
COPY --from=build /app/packages/server/dist packages/server/dist

# Copy migration files
COPY --from=build /app/packages/server/drizzle packages/server/drizzle

# Copy client static build for serving via Hono serveStatic
COPY --from=build /app/packages/client/build packages/client/build

# Copy plugin source (if any first-party plugins exist)
COPY packages/plugins/ packages/plugins/

# Ensure data directories are owned by node user
RUN mkdir -p packages/server/data packages/server/data/backups packages/server/data/media packages/server/data/logs && \
    chown -R node:node /app

USER node

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "packages/server/dist/index.js"]
