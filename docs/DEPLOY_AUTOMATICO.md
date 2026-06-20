# Deploy Render + Neon — passo a passo

Repositorio: https://github.com/VandinDev221/SaaS-B2B

**Banco:** [Neon](https://neon.tech) (Postgres gratuito, sem limite do Render)  
**API + Web:** Render  
**Redis:** Render Key Value (1 free por conta)

## Ordem correta

```
1. Criar projeto no Neon → copiar DATABASE_URL
2. Criar Redis no Render (ou reutilizar existente)
3. Colar DATABASE_URL + REDIS_URL em flowos-api → Environment
4. Redeploy da API
5. Deploy do web (Blueprint)
```

---

## Passo 1 — Postgres no Neon

1. Acesse [console.neon.tech](https://console.neon.tech) e crie conta (GitHub ok)
2. **New Project**
   - **Name:** `flowos`
   - **Region:** escolha a mais perto (ex. `US East` se API no Render US)
   - **Postgres:** versao padrao (16+)
3. No dashboard do projeto → **Connect**
4. Copie a connection string **sem pooling** (recomendado para Prisma migrate):

```
postgresql://neondb_owner:XXXX@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

> Use a aba **Connection string** → role `neondb_owner` → **Direct connection** (nao pooled), para migrations funcionarem no deploy.

5. Opcional: renomeie o database para `flowos` em **Databases** (nao obrigatorio — a URL ja funciona com `neondb`).

---

## Passo 2 — Redis no Render

1. [dashboard.render.com](https://dashboard.render.com) → **New +** → **Key Value**
2. **Name:** `flowos-redis`
3. **Maxmemory Policy:** `noeviction`
4. **Plan:** Free
5. **Connect** → copie **External Redis URL** ou **Internal**

```
redis://red-XXXX:6379
```

Se der *"cannot have more than 1 free tier Key Value"*: reutilize o Redis que ja existe na conta.

---

## Passo 3 — Blueprint (API + Web)

1. **New +** → **Blueprint** → repo `VandinDev221/SaaS-B2B` → `main`
2. **Apply** → cria `flowos-api` e `flowos-web`

---

## Passo 4 — Variaveis na API (obrigatorio)

**flowos-api** → **Environment**:

| Variavel | Valor |
|----------|--------|
| `DATABASE_URL` | connection string do Neon (Passo 1) |
| `REDIS_URL` | URL do Redis (Passo 2) |

**Save Changes** → **Manual Deploy** → **Deploy latest commit**

No log, espere:
- `prisma migrate deploy` aplicando migrations
- `Nest application successfully started`

---

## Passo 5 — Testar

```bash
curl https://flowos-api.onrender.com/v1/observability/live
curl https://flowos-api.onrender.com/v1/observability/ready
```

Web: https://flowos-web.onrender.com/login

---

## Erros comuns

| Log | Solucao |
|-----|---------|
| `DATABASE_URL ausente` | Cole a URL do Neon em flowos-api → Environment |
| `P1001: Can't reach database` | Confira `?sslmode=require` na URL do Neon |
| `migrate deploy` falha | Use connection **Direct** do Neon, nao pooled |
| Redis connection refused | Confira `REDIS_URL` e redeploy |
| Web 500 | API fora do ar ou `API_URL` errado em flowos-web |

---

## Neon — dicas

- **Free tier** do Neon e suficiente para MVP
- **Auto-suspend:** Neon pausa DB inativo; primeiro request pode demorar ~1s (API Render acorda o Neon no healthcheck)
- **Backup:** Neon faz backup automatico no free
- Nao precisa criar Postgres no Render

---

## Variaveis opcionais

**flowos-api:** `EVOLUTION_API_URL` (WhatsApp)  
**flowos-web:** `API_URL` / `NEXT_PUBLIC_API_URL` (se mudar dominio da API)

---

## Atualizar codigo

```powershell
git push origin main
```
