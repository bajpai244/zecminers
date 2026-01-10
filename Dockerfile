# Backend Dockerfile for sync and server services
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Production image
FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Default command (can be overridden in docker-compose)
CMD ["bun", "run", "src/sync.ts"]
