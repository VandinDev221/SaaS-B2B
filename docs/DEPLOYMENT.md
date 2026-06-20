# FLOWOS — Deploy

## API (NestJS)

1. Variaveis: copie `apps/api/.env.example` e preencha conforme [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).
2. Migrations: `npm run prisma:deploy -w @flowos/api`
3. Start: `npm run start -w @flowos/api` ou imagem Docker `infra/docker/api.Dockerfile`.

Porta padrao: **4000**.

## Web (Next.js)

1. `NEXT_PUBLIC_API_URL=https://api.seudominio.com`
2. Build: `npm run build -w @flowos/web`
3. Start: `npm run start -w @flowos/web` (standalone em producao).

Porta padrao: **3000**.

## Docker Compose (dev/staging)

```powershell
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed
```

Evolution e n8n: use apenas em rede interna; nao exponha n8n sem autenticacao em producao.

## Render (producao)

Blueprint: `render.yaml` (API + Web no Render). **Postgres no Neon**; Redis no Render Key Value.

Guia passo a passo: [DEPLOY_AUTOMATICO.md](./DEPLOY_AUTOMATICO.md)

| Componente | Render |
|------------|--------|
| Web | `flowos-web` (Docker `infra/docker/web.Dockerfile`) |
| API | `flowos-api` (Docker `infra/docker/api.Dockerfile`) |
| Postgres | `flowos-db` |
| Redis | `flowos-redis` |
| Evolution | VPS ou container dedicado com URL publica para webhook |

Webhook Evolution deve alcancar a API: use URL publica, nao `localhost`.
