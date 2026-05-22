# Deploy automatico — GitHub + Vercel + Railway/Render

## 1. GitHub (codigo)

Repositorio: https://github.com/VandinDev221/SaaS-B2B

Apos push, conecte o repo nos paineis abaixo.

## 2. Frontend — Vercel

1. [vercel.com/new](https://vercel.com/new) → Import `VandinDev221/SaaS-B2B`
2. **Root Directory:** `apps/web`
3. Variaveis:

| Variavel | Valor |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | URL publica da API (ex. `https://flowos-api.up.railway.app`) |
| `NEXT_PUBLIC_APP_NAME` | `FLOWOS` |

4. Deploy. Anote a URL (ex. `https://saas-b2b.vercel.app`).

CLI (ja logado como `vandindev221`):

```powershell
cd apps/web
npx vercel link --yes
npx vercel env add NEXT_PUBLIC_API_URL production
npx vercel deploy --prod --yes
```

## 3. API — Railway (recomendado)

```powershell
npx @railway/cli login
npx @railway/cli init
npx @railway/cli add --database postgres
npx @railway/cli add --database redis
```

No servico **api** (Dockerfile `infra/docker/api.Dockerfile`), variaveis:

| Variavel | Exemplo |
|----------|---------|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `DATABASE_URL` | (referencia Postgres Railway) |
| `REDIS_URL` | (referencia Redis Railway) |
| `JWT_ACCESS_SECRET` | 48+ chars (`openssl rand -base64 48`) |
| `JWT_REFRESH_SECRET` | 48+ chars |
| `CORS_ORIGINS` | URL do front Vercel |
| `PUBLIC_WEB_URL` | URL do front Vercel |
| `EVOLUTION_API_URL` | URL publica Evolution (ou temporario) |
| `EVOLUTION_API_KEY` | chave Evolution |
| `EVOLUTION_WEBHOOK_SECRET` | 32+ chars |
| `ALLOW_WHATSAPP_MOCK` | `false` |
| `ALLOW_PIX_MOCK` | `false` |

Deploy: `npx @railway/cli up`

## 4. API — Render (alternativa)

1. [dashboard.render.com](https://dashboard.render.com) → New **Blueprint** → repo `SaaS-B2B`
2. Usa `render.yaml` (Postgres + Redis + API)
3. Preencha `CORS_ORIGINS` e `PUBLIC_WEB_URL` com a URL Vercel

## 5. Apos API no ar

1. Atualize `NEXT_PUBLIC_API_URL` na Vercel
2. Redeploy do front
3. Smoke:

```bash
curl https://SUA-API/v1/observability/live
curl https://SUA-API/v1/observability/ready
```

## 6. Evolution / WhatsApp (fase 2)

VPS ou container com `docker compose up evolution-api` e webhook apontando para a API publica.
