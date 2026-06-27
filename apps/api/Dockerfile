# ---- Build stage ------------------------------------------------------------
# Bundles the @attio/api Fastify service with its workspace deps.
# Docker context = repo root (set in render.yaml) so pnpm can install the
# full monorepo and tsup can bundle @attio/db + @attio/shared into dist/.

FROM node:20-slim AS builder

RUN corepack enable

WORKDIR /app

# Copy lockfile + workspace manifests first for cache-friendly install.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

RUN pnpm install --frozen-lockfile --filter @attio/api... --filter @attio/db...

# Copy source for the packages the API actually bundles.
COPY apps/api/ ./apps/api/
COPY packages/db/ ./packages/db/
COPY packages/shared/ ./packages/shared/
COPY packages/config/ ./packages/config/
COPY tsconfig.base.json ./

RUN pnpm --filter @attio/api build

# ---- Runtime stage ----------------------------------------------------------
# Slim runtime. Run from /app/apps/api so Node resolves node_modules the same
# way it does locally (the API's deps live in apps/api/node_modules via pnpm).
FROM node:20-slim AS runtime

WORKDIR /app/apps/api

# Copy the built bundle + the API's node_modules (has @fastify, postgres, etc.).
COPY --from=builder /app/apps/api/dist/ ./dist/
COPY --from=builder /app/apps/api/node_modules/ ./node_modules/
# Also copy the root node_modules (has @attio/* workspace symlinks + .pnpm store).
COPY --from=builder /app/node_modules/ /app/node_modules/

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/server.js"]
