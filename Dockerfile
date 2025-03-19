FROM oven/bun:1.1.12-slim as base

# Set working directory
WORKDIR /app

# Install dependencies for production
FROM base as dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build the app
FROM dependencies as build
# Copy source files first
COPY . .

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && apt-get clean

# Copy PGlite WASM files and build
RUN bun run copy-pglite-wasm
# Ensure WASM files are copied correctly 
RUN ls -la public/wasm || echo "WASM directory not found"
RUN bun run build

# Production image
FROM base as production
ENV NODE_ENV=production

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && apt-get clean

# Copy only necessary files from build stage
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/healthcheck || exit 1

# Start the app
CMD ["bun", "run", "start"] 