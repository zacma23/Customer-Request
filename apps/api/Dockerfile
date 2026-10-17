# Multi-stage Dockerfile for Node.js API
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace and api package definitions
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy API source
COPY apps/api ./apps/api/

# Generate Prisma Client & compile TypeScript
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build --workspace=apps/api

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY prisma ./prisma/

RUN npm install --omit=dev

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create upload directory
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node apps/api/dist/src/index.js"]
