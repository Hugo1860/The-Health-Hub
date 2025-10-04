# Multi-stage Dockerfile for Next.js app with MySQL dump export bundled

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install mysql-client for export
RUN apk add --no-cache mysql-client bash

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

# Include export script
COPY scripts/export-mysql.sh /usr/local/bin/export-mysql
RUN chmod +x /usr/local/bin/export-mysql

EXPOSE 3000
CMD ["npm", "run", "start"]

