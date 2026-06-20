# Deploy Render + Neon + Upstash

Repositorio: https://github.com/VandinDev221/SaaS-B2B

| Componente | Servico |
|------------|---------|
| **Postgres** | [Neon](https://neon.tech) |
| **Redis** | [Upstash](https://upstash.com) |
| **API + Web** | [Render](https://render.com) |

## Ordem correta

```
1. Neon → DATABASE_URL
2. Upstash → REDIS_URL
3. Colar ambas em flowos-api → Environment
4. Redeploy da API
```

---

## Passo 1 — Postgres no Neon

1. [console.neon.tech](https://console.neon.tech) → **New Project** → `flowos`
2. **Connect** → copie **Direct connection** (nao pooled):

```
postgresql://neondb_owner:XXXX@ep-xxxx.aws.neon.tech/neondb?sslmode=require
```

---

## Passo 2 — Redis no Upstash

1. [console.upstash.com](https://console.upstash.com) → **Create Database**
2. **Name:** `flowos-redis`
3. **Type:** Regional (free tier ok)
4. **Region:** mesma regiao da API (ex. `us-east-1`)
5. Apos criar → aba **Redis** → **Connect**
6. Copie a **Redis URL** (comeca com `rediss://` — TLS obrigatorio):

```
rediss://default:AXXX...@us1-xxxx.upstash.io:6379
```

> Use a URL **Redis**, nao a REST API (`UPSTASH_REDIS_REST_URL`). O BullMQ precisa da conexao Redis nativa.

---

## Passo 3 — Blueprint no Render

1. **New +** → **Blueprint** → `VandinDev221/SaaS-B2B` → `main` → **Apply**
2. Cria `flowos-api` e `flowos-web`

---

## Passo 4 — Variaveis na API

**flowos-api** → **Environment**:

| Variavel | Valor |
|----------|--------|
| `DATABASE_URL` | URL do Neon |
| `REDIS_URL` | URL `rediss://` do Upstash |

**Save** → **Manual Deploy**

> Se o deploy falhou antes com erro `Lead does not exist`: no Neon → **Branches** → **main** → **Reset** (ou apague e recrie o projeto). O banco ficou em estado inconsistente.

Log esperado:
- `prisma migrate deploy` OK
- `Worker BullMQ ativo`
- `Nest application successfully started`

---

## Passo 5 — Popular banco (obrigatorio na primeira vez)

O Neon sobe **vazio**. Sem seed, o login `admin@flowos.local` retorna **Credenciais invalidas**.

Na sua maquina (PowerShell), com a **mesma** `DATABASE_URL` da API:

```powershell
cd c:\dev\SaaS-B2B
$env:DATABASE_URL = "postgresql://neondb_owner:...@ep-....neon.tech/neondb?sslmode=require"
npm run db:seed
```

Ao final deve aparecer `Seed concluido` com email e senha.

**Login demo:**
- Email: `admin@flowos.local`
- Senha: `admin12345`

---

## Passo 6 — Testar

```bash
curl https://flowos-api.onrender.com/v1/observability/live
curl https://flowos-api.onrender.com/v1/observability/ready
```

O `/ready` deve mostrar `redis: up` e `database: up`.

Web: https://flowos-web.onrender.com/login

---

## Erros comuns

| Log | Solucao |
|-----|---------|
| `DATABASE_URL ausente` | Cole URL do Neon |
| `REDIS_URL ausente` | Cole URL `rediss://` do Upstash |
| `Redis connection` / TLS | Confira que a URL comeca com `rediss://` |
| `P1001: Can't reach database` | Adicione `?sslmode=require` no Neon |
| `relation "Lead" does not exist` (P3018) | **Reset** o banco Neon e redeploy |
| `Credenciais invalidas` no login | Rode `npm run db:seed` com `DATABASE_URL` do Neon |
| Upstash REST URL usada por engano | Use **Redis URL**, nao REST |

---

## Arquitetura final

```
[Usuario] → flowos-web (Render)
                ↓
           flowos-api (Render)
            ↓         ↓
         [Neon]   [Upstash]
        Postgres    Redis
```

Nao precisa criar Postgres nem Redis no Render.

---

## Atualizar codigo

```powershell
git push origin main
```
