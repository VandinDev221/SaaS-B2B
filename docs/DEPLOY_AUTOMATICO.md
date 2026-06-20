# Deploy — GitHub + Render

Repositorio: https://github.com/VandinDev221/SaaS-B2B

## 1. Banco e Redis (uma vez por conta)

O plano **free** do Render permite **apenas 1 Postgres e 1 Redis** por conta.

### Se voce ainda nao tem Postgres/Redis

1. [dashboard.render.com](https://dashboard.render.com) → **New → PostgreSQL** → nome `flowos-db`
2. **New → Key Value** (Redis) → nome `flowos-redis`, policy **noeviction**
3. Em cada um, copie a **Internal Connection String** (ou External se a API for publica)

### Se o Blueprint falhou com "cannot have more than one free tier"

Voce **ja tem** `flowos-db` e/ou `flowos-redis` criados (tentativa anterior ou outro projeto). Reutilize-os — nao crie duplicados.

- Postgres → **Connect** → copie `Connection String`
- Redis → **Connect** → copie `Redis URL`

## 2. Aplicar o Blueprint (API + Web)

1. **New → Blueprint** → repo `VandinDev221/SaaS-B2B` (branch `main`)
2. O `render.yaml` cria apenas:
   - **flowos-api** — NestJS
   - **flowos-web** — Next.js
3. **Apply** e aguarde o deploy dos dois servicos

## 3. Configurar variaveis na API (obrigatorio)

Antes do primeiro deploy bem-sucedido da API, em **flowos-api → Environment**:

| Variavel | Valor |
|----------|--------|
| `DATABASE_URL` | Connection string do Postgres (`flowos-db` ou o que voce ja tem) |
| `REDIS_URL` | URL do Redis (`flowos-redis` ou o que voce ja tem) |

Salve e clique **Manual Deploy → Deploy latest commit**.

As demais variaveis (`JWT_*`, `CORS_ORIGINS`, etc.) o Blueprint ja preenche.

### URLs padrao

| Servico | URL |
|---------|-----|
| Web | https://flowos-web.onrender.com |
| API | https://flowos-api.onrender.com |

## 4. Variaveis opcionais

No painel do servico **flowos-api**, apos o primeiro deploy:

| Variavel | Quando ajustar |
|----------|----------------|
| `EVOLUTION_API_URL` | Quando tiver Evolution API publica (WhatsApp) |
| `CORS_ORIGINS` | Se usar dominio customizado no front |
| `PUBLIC_WEB_URL` | Se usar dominio customizado no front |

No painel do servico **flowos-web**:

| Variavel | Quando ajustar |
|----------|----------------|
| `API_URL` | Se a URL da API mudar (dominio customizado) |
| `NEXT_PUBLIC_API_URL` | Mesmo valor de `API_URL` — exige **redeploy** do web |

## 5. Smoke test

```bash
curl https://flowos-api.onrender.com/v1/observability/live
curl https://flowos-api.onrender.com/v1/observability/ready
```

Abra https://flowos-web.onrender.com/login

## 6. Por que nao usar Vercel para este projeto?

O front Next.js usa rotas BFF (`app/api/*`) e Server Components que chamam a API NestJS em runtime. Na Vercel, sem `NEXT_PUBLIC_API_URL` configurado corretamente, tudo retorna **500**.

A stack completa (API + Postgres + Redis + workers BullMQ) roda melhor no **Render** com Docker.

## 7. Dominio customizado (opcional)

1. Render → servico **flowos-web** → Settings → Custom Domain
2. Render → servico **flowos-api** → Settings → Custom Domain
3. Atualize `CORS_ORIGINS`, `PUBLIC_WEB_URL`, `API_URL` e `NEXT_PUBLIC_API_URL`
4. Redeploy dos dois servicos

## 8. Evolution / WhatsApp (fase 2)

Suba Evolution em VPS ou container com URL publica e atualize `EVOLUTION_API_URL` na API.
Webhook: `https://SUA-API/v1/integrations/whatsapp/webhook/evolution`

## 9. Atualizar codigo

Cada push na branch `main` dispara redeploy automatico no Render (se Auto-Deploy estiver ativo).

```powershell
git add .
git commit -m "sua mensagem"
git push origin main
```
