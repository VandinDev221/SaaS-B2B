# Deploy Render — passo a passo

Repositorio: https://github.com/VandinDev221/SaaS-B2B

## Ordem correta (importante)

A API **nao sobe** sem `DATABASE_URL` e `REDIS_URL`. Crie o banco e o Redis **antes** de esperar o deploy da API funcionar.

```
1. Criar Postgres no Render
2. Criar Redis no Render
3. Colar URLs em flowos-api → Environment
4. Redeploy da API
5. Blueprint / deploy do web
```

---

## Passo 1 — PostgreSQL

1. [dashboard.render.com](https://dashboard.render.com) → **New +** → **PostgreSQL**
2. **Name:** `flowos-db`
3. **Database:** `flowos`
4. **User:** `flowos`
5. **Plan:** Free (se disponivel)
6. **Create Database**

Se aparecer *"cannot have more than one active free tier database"*:
- Va em **Dashboard** e procure **qualquer** Postgres ja criado (outro nome/projeto)
- **Opcao A:** apague o que nao usa e crie `flowos-db`
- **Opcao B:** reutilize o Postgres existente (qualquer nome serve)

Copie a connection string:
- Abra o Postgres → **Connect** → **External Database URL** (ou Internal)

Exemplo:
```
postgresql://flowos:XXXX@dpg-XXXX.oregon-postgres.render.com/flowos
```

---

## Passo 2 — Redis (Key Value)

1. **New +** → **Key Value** (Redis)
2. **Name:** `flowos-redis`
3. **Plan:** Free
4. **Maxmemory Policy:** `noeviction` (importante para filas BullMQ)
5. **Create Key Value**

Se aparecer *"cannot have more than 1 free tier Key Value"*:
- Reutilize o Redis existente ou apague o que nao usa

Copie a URL:
- Abra o Redis → **Connect** → **Internal Redis URL** ou **External**

Exemplo:
```
redis://red-XXXX:6379
```

---

## Passo 3 — Blueprint (API + Web)

1. **New +** → **Blueprint**
2. Repo: `VandinDev221/SaaS-B2B` → branch `main`
3. **Apply**

Cria `flowos-api` e `flowos-web` (nao cria Postgres/Redis — limite free da conta).

---

## Passo 4 — Variaveis na API (obrigatorio)

**flowos-api** → **Environment** → adicione:

| Variavel | Valor |
|----------|--------|
| `DATABASE_URL` | connection string do Passo 1 |
| `REDIS_URL` | URL do Passo 2 |

Clique **Save Changes**.

Depois: **Manual Deploy** → **Deploy latest commit**.

Aguarde o log mostrar migrations aplicadas e `Nest application successfully started`.

---

## Passo 5 — Testar

```bash
curl https://flowos-api.onrender.com/v1/observability/live
curl https://flowos-api.onrender.com/v1/observability/ready
```

Web: https://flowos-web.onrender.com/login

---

## Erros comuns

| Log | Causa | Solucao |
|-----|-------|---------|
| `Environment variable not found: DATABASE_URL` | Postgres nao configurado na API | Passo 4 |
| `ERRO: DATABASE_URL ausente` | Mesmo problema | Cole a URL e redeploy |
| `cannot have more than one free tier database` | Ja existe Postgres free na conta | Reutilize ou apague o antigo |
| `Prisma failed to detect libssl` | Alpine sem OpenSSL | Corrigido no Dockerfile (push recente) |
| Web 500 | API fora do ar ou URL errada | Confira `API_URL` em flowos-web |

---

## Variaveis opcionais depois

**flowos-api:**
- `EVOLUTION_API_URL` — quando tiver WhatsApp/Evolution

**flowos-web** (exige redeploy se mudar):
- `API_URL` / `NEXT_PUBLIC_API_URL` — URL publica da API

---

## Atualizar codigo

```powershell
git push origin main
```

Render redeploya automaticamente se Auto-Deploy estiver ativo.
