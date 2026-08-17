# Multi-stage build for Holding IVIR Legal Intelligence Platform
# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install dependencies
RUN npm install -g pnpm@10.4.1 && pnpm --version && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Stage 2: Runtime stage
FROM node:22-alpine

WORKDIR /app

# Install runtime dependencies only
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

RUN npm install -g pnpm@10.4.1 && pnpm --version && pnpm install --prod --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["node", "dist/index.js"]
