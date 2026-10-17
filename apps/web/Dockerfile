# Multi-stage Dockerfile for React + Vite Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace and web package definitions
COPY package.json ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm install

# Copy web source files
COPY apps/web ./apps/web/

# Build production bundle
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build --workspace=apps/web

# Production serving stage via Nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
