# Voice service — standalone Express app (no @attio/* workspace deps).
# Runs TypeScript directly via tsx (no build step needed).
# Docker context = repo root (set in render.yaml) for pnpm workspace install.

FROM node:20-slim AS builder

RUN corepack enable

WORKDIR /app

# Copy lockfile + workspace manifests for cache-friendly install.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/voice/package.json ./apps/backend/voice/

# Install only the voice service's deps.
RUN pnpm install --frozen-lockfile --filter @attio/voice...

# Copy source.
COPY apps/backend/voice/ ./apps/backend/voice/

# ---- Runtime ---------------------------------------------------------------
FROM node:20-slim AS runtime

WORKDIR /app/apps/backend/voice

COPY --from=builder /app/apps/backend/voice/ ./
COPY --from=builder /app/apps/backend/voice/node_modules/ ./node_modules/
COPY --from=builder /app/node_modules/ /app/node_modules/

ENV NODE_ENV=production
EXPOSE 8787

CMD ["npx", "tsx", "src/server.ts"]
