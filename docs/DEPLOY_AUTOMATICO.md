# Deploy — GitHub + Render

Repositorio: https://github.com/VandinDev221/SaaS-B2B

## 1. Criar infraestrutura no Render (recomendado)

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. **New → Blueprint**
3. Conecte o repo `VandinDev221/SaaS-B2B` (branch `main`)
4. O Render le o `render.yaml` e cria automaticamente:
   - **flowos-api** — NestJS (Docker)
   - **flowos-web** — Next.js (Docker)
   - **flowos-db** — PostgreSQL
   - **flowos-redis** — Redis

5. Aplique o Blueprint e aguarde o primeiro deploy (5–15 min no plano free).

### URLs padrao

| Servico | URL |
|---------|-----|
| Web | https://flowos-web.onrender.com |
| API | https://flowos-api.onrender.com |

## 2. Variaveis que voce pode precisar ajustar

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

## 3. Smoke test

```bash
curl https://flowos-api.onrender.com/v1/observability/live
curl https://flowos-api.onrender.com/v1/observability/ready
```

Abra https://flowos-web.onrender.com/login

## 4. Por que nao usar Vercel para este projeto?

O front Next.js usa rotas BFF (`app/api/*`) e Server Components que chamam a API NestJS em runtime. Na Vercel, sem `NEXT_PUBLIC_API_URL` configurado corretamente, tudo retorna **500**.

A stack completa (API + Postgres + Redis + workers BullMQ) roda melhor no **Render** com Docker.

## 5. Dominio customizado (opcional)

1. Render → servico **flowos-web** → Settings → Custom Domain
2. Render → servico **flowos-api** → Settings → Custom Domain
3. Atualize `CORS_ORIGINS`, `PUBLIC_WEB_URL`, `API_URL` e `NEXT_PUBLIC_API_URL`
4. Redeploy dos dois servicos

## 6. Evolution / WhatsApp (fase 2)

Suba Evolution em VPS ou container com URL publica e atualize `EVOLUTION_API_URL` na API.
Webhook: `https://SUA-API/v1/integrations/whatsapp/webhook/evolution`

## 7. Atualizar codigo

Cada push na branch `main` dispara redeploy automatico no Render (se Auto-Deploy estiver ativo).

```powershell
git add .
git commit -m "sua mensagem"
git push origin main
```
