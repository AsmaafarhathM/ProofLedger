# Step 1: Dependencies & Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source files
COPY tsconfig*.json nest-cli.json ./
COPY src ./src/

# Generate Prisma Client & Build NestJS app
RUN npx prisma generate
RUN npm run build

# Step 2: Production Runtime Stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Security: Create non-root user
RUN addgroup -S nestjs && adduser -S nestjs -G nestjs

# Copy package files and install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production --legacy-peer-deps && npx prisma generate

# Copy compiled dist from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/private-storage ./private-storage

# Set directory permissions
RUN chown -R nestjs:nestjs /app

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main.js"]
