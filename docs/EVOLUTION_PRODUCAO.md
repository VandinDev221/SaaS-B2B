# WhatsApp em producao (Evolution no Render)

Guia para conectar WhatsApp pelo painel do FLOWOS em producao, usando **flowos-evolution** no Render com **Neon** + **Upstash** ja existentes.

## Arquitetura

```
[SaaS Web] --> [flowos-api Render]
                    |     ^
                    |     | webhook
                    v     |
              [flowos-evolution Render]
                    |
              WhatsApp (QR Code)
```

## Nota sobre versao da imagem

Usamos **`evoapicloud/evolution-api:v2.3.7`** (nao `atendai/evolution-api:v2.1.1`).

A v2.1.1 tem bug conhecido: loop infinito de reconexao Baileys que **impede gerar QR Code** (nem no Manager). Corrigido na v2.3.7 — ver [PR #2365](https://github.com/evolution-foundation/evolution-api/pull/2365) e [issue #2430](https://github.com/evolution-foundation/evolution-api/issues/2430).

## Passo 1 — Atualizar Blueprint no Render

1. Faca push do `render.yaml` atualizado para `main`.
2. No Render: **Blueprints** → seu blueprint FLOWOS → **Manual sync** (ou aguarde sync automatico).
3. Confirme que o servico **flowos-evolution** foi criado.

## Passo 2 — `DATABASE_CONNECTION_URI` no flowos-evolution

O Evolution usa o **mesmo Neon** da API, com schema separado `evolution`.

> **CRITICO:** sem `schema=evolution`, o Evolution migra no `public` e **quebra** o deploy da API (erro P3009 / `20240609181238_init`).

1. Abra **flowos-api** → **Environment** → copie `DATABASE_URL`.
2. Abra **flowos-evolution** → **Environment** → adicione/edite:

| Variavel | Valor |
|----------|--------|
| `DATABASE_CONNECTION_URI` | Sua `DATABASE_URL` + `&schema=evolution` |

**Exemplo:**

```
# DATABASE_URL (flowos-api)
postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

# DATABASE_CONNECTION_URI (flowos-evolution)
postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require&schema=evolution
```

`AUTHENTICATION_API_KEY` ja sincroniza pelo Blueprint (`EVOLUTION_API_KEY` da API).

> **Redis:** o Evolution no Render usa **cache local** (`CACHE_REDIS_ENABLED=false`). O Upstash (`rediss://`) nao e compativel com Evolution v2.1.1 — a API FLOWOS continua usando Redis normalmente.

## Passo 3 — Variaveis do flowos-api

Confira em **flowos-api** → **Environment**:

| Variavel | Valor esperado |
|----------|----------------|
| `WHATSAPP_PROVIDER` | `evolution` |
| `EVOLUTION_API_URL` | `https://flowos-evolution.onrender.com` (auto via Blueprint) |
| `EVOLUTION_API_KEY` | Gerado pelo Render (32+ chars) |
| `EVOLUTION_WEBHOOK_SECRET` | Gerado pelo Render (32+ chars) |
| `EVOLUTION_INSTANCE` | `flowos` |
| `EVOLUTION_WEBHOOK_URL` | `https://flowos-api.onrender.com/v1/integrations/whatsapp/webhook/evolution` |
| `CORS_ORIGINS` | URL do seu front (ex.: `https://seu-app.vercel.app`) |
| `PUBLIC_WEB_URL` | Mesma URL do front |

Se o front esta na **Vercel**, `CORS_ORIGINS` e `PUBLIC_WEB_URL` devem ser a URL da Vercel, nao a do Render web.

## Passo 4 — Redeploy

1. **flowos-evolution** → Manual Deploy (aguarde status **Live** — cold start pode levar 2-5 min).
2. **flowos-api** → Manual Deploy.

Teste Evolution:

```powershell
$env:EVOLUTION_API_URL = "https://flowos-evolution.onrender.com"
$env:EVOLUTION_API_KEY = "<copie do Render flowos-api>"
Invoke-RestMethod $env:EVOLUTION_API_URL -Headers @{ apikey = $env:EVOLUTION_API_KEY }
```

Resposta JSON = Evolution online.

## Passo 5 — Script opcional (instancia + webhook)

Na sua maquina, com as chaves do Render:

```powershell
cd c:\dev\SaaS-B2B
$env:DATABASE_URL = "postgresql://...@neon...?sslmode=require"
$env:EVOLUTION_API_KEY = "<do Render>"
$env:EVOLUTION_WEBHOOK_SECRET = "<do Render>"
npm run setup:evolution:prod
```

O script mostra o `DATABASE_CONNECTION_URI`, cria a instancia `flowos`, configura webhook e pode salvar o QR em `scripts/evolution-qrcode-prod.png`.

## Passo 6 — Conectar pelo SaaS

1. Login no FLOWOS (`admin@flowos.local` / `admin12345` apos seed).
2. **Configuracoes** → **WhatsApp (Evolution API)**.
3. Provedor deve mostrar `evolution` (nao `mock`).
4. Clique **Conectar / Gerar QR Code**.
5. No celular: WhatsApp → **Aparelhos conectados** → **Conectar aparelho** → escanear QR.
6. **Atualizar status** — estado deve ficar `open` ou `connected`.

## Erros comuns

| Sintoma | Solucao |
|---------|---------|
| `Provedor: mock` | Falta `WHATSAPP_PROVIDER=evolution` ou redeploy da API |
| `Evolution inacessivel` | flowos-evolution dormindo (free) — abra URL no browser e aguarde |
| `Evolution API 401` | `EVOLUTION_API_KEY` != `AUTHENTICATION_API_KEY` |
| Evolution crash no boot | `DATABASE_CONNECTION_URI` ausente ou sem `schema=evolution` |
| `P3009` / `20240609181238_init` na API | Evolution rodou no `public` — veja recuperacao abaixo |
| QR nao aparece (nem no Manager) | Imagem antiga v2.1.1 — use `evoapicloud/evolution-api:v2.3.7` e recrie instancia |
| `column "instanceId" does not exist` | Schema evolution desatualizado — reset + redeploy (veja abaixo) |
| `redis disconnected` no Evolution | Desative Redis no Evolution (`CACHE_REDIS_ENABLED=false`); Upstash nao suportado |
| Mensagens nao chegam no Inbox | `EVOLUTION_WEBHOOK_URL` errada ou secret diferente |
| CORS no login | `CORS_ORIGINS` sem URL da Vercel |

## Nota sobre plano free Render

- **flowos-evolution** e **flowos-api** hibernam sem trafego (~50s para acordar).
- Na primeira conexao QR, abra `https://flowos-evolution.onrender.com` antes de gerar o QR no SaaS.
- Sessao WhatsApp fica no Postgres (schema `evolution`), nao no disco efemero do container.

## Recuperacao — erro P3009 (`20240609181238_init`)

Se **flowos-api** e **flowos-evolution** falham com `migrate found failed migrations` e mencionam `20240609181238_init`, o Evolution subiu **sem** `schema=evolution` e sujou o schema `public`.

### 1. Corrigir URI do Evolution (antes de redeploy)

```
DATABASE_CONNECTION_URI = postgresql://...@neon.../neondb?sslmode=require&schema=evolution
```

Confirme nos logs do Evolution: `schema "evolution"` (nao `public`).

### 2. Limpar registro falho no Neon

Na sua maquina:

```powershell
cd c:\dev\SaaS-B2B
$env:DATABASE_URL = "<copie do Render flowos-api>"
npm run fix:neon-migration
```

Ou no **Neon SQL Editor**:

```sql
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20240609181238_init';
```

### 3. Redeploy na ordem

1. **flowos-evolution** (imagem v2.3.7 + `DATABASE_CONNECTION_URI` corrigida)
2. **flowos-api**

### 4. Recriar instancia `flowos` (se QR ainda falhar)

Instancias criadas na v2.1.1 podem ficar corrompidas. No Manager ou via API:

```powershell
# Com EVOLUTION_API_KEY do Render
$headers = @{ apikey = "SUA_CHAVE" }
Invoke-RestMethod "https://flowos-evolution.onrender.com/instance/delete/flowos" -Method DELETE -Headers $headers
```

Depois gere QR de novo no SaaS ou Manager.

## Recuperacao — `column "instanceId" does not exist`

Aparece nos logs ao receber mensagem (`messages.upsert`) depois de upgrade **v2.1.1 → v2.3.7**.

**Causa:** migrations antigas no schema `evolution` — tabelas da v2.1.1 sem colunas que a v2.3.7 exige.

**Solucao:** resetar **so** o schema `evolution` (nao apaga leads/inbox do FLOWOS):

No **Neon SQL Editor**:

```sql
DROP SCHEMA IF EXISTS evolution CASCADE;
CREATE SCHEMA evolution;
```

Ou localmente: `npm run reset:evolution-schema` (mostra o SQL).

Depois:

1. **flowos-evolution** → Manual Deploy (migrations v2.3.7 do zero)
2. Reconectar WhatsApp (QR)
3. `npm run sync:evolution-webhook`
4. Enviar mensagem de teste → Inbox **Todos**

