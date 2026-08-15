FROM node:20-slim AS deps
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm install

FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/api ./apps/api
RUN npm run prisma:generate -w @flowos/api && npm run build -w @flowos/api

FROM node:20-slim AS runner
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4000
CMD ["sh", "-c", "if [ -z \"$DATABASE_URL\" ]; then echo 'ERRO: DATABASE_URL ausente. Render -> flowos-api -> Environment -> cole a connection string do Postgres.'; exit 1; fi; if [ -z \"$REDIS_URL\" ]; then echo 'ERRO: REDIS_URL ausente. Render -> flowos-api -> Environment -> cole a URL do Redis.'; exit 1; fi; npm run prisma:deploy -w @flowos/api && node apps/api/dist/main.js"]
