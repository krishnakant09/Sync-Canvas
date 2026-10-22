# Multi-stage Dockerfile for SyncCanvas
# Stage 1: Build the client assets
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=1234

COPY package*.json ./
RUN npm ci --only=production

# Install tsx globally or locally for runtime TypeScript server execution
RUN npm install -g tsx

# Copy built frontend assets and server sources
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY tsconfig*.json ./

# Create persistent directory for compacted CRDT snapshots
RUN mkdir -p /app/server/storage/snapshots

EXPOSE 1234

CMD ["tsx", "server/server.ts"]
