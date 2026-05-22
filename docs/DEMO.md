# FLOWOS — Roteiro de demonstração (15 min)

## Pré-requisitos

1. **Docker Desktop** em execução
2. Na raiz do projeto:

```powershell
cd c:\project\Saas-B2B
docker compose up -d postgres redis
cd apps\api
npx prisma migrate deploy
npx prisma db seed
cd ..\..
npm run dev
```

3. Confirme no console:

```text
[dev] API_PORT=4000
[dev] WEB_PORT=3000
```

4. Health: http://localhost:4000/v1/observability/health → `"status":"ok"`

**Login:** `admin@flowos.local` / `admin12345`

---

## WhatsApp (Evolution) — opcional mas recomendado

1. Suba Evolution (se ainda não estiver): use o container em **http://localhost:8080**
2. Em `apps/api/.env`:

```env
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-chave-secreta-aqui
EVOLUTION_INSTANCE=flowos
```

3. Acesse **Configurações** → **WhatsApp Evolution** → **Configurar / QR** → escaneie com o celular
4. Envie uma mensagem de teste para o número conectado

---

## Roteiro sugerido

| Min | Tela | O que mostrar |
|-----|------|----------------|
| 0–2 | Login + Dashboard | KPIs, gráficos de funil e canais, banner de onboarding |
| 2–5 | WhatsApp / Inbox | Abas Aguardando/Respondidos, responder, **Gerar resposta** (IA) |
| 5–8 | CRM | Kanban, mover estágio, editar lead |
| 8–10 | Operação | Preview follow-up D+1, histórico de runs |
| 10–12 | Orçamentos + Cobrança | PDF, cobrança PIX |
| 12–14 | Alertas | Ack / Resolver incidente |
| 14–15 | Configurações | Automações (toggles), Evolution, white-label |

---

## Automações (evitar surpresas na demo)

Em **Configurações → Automações**, deixe **desligado** até demonstrar:

- Scan automático D+1
- Agendar D+1 ao receber mensagem
- Orçamento automático no WhatsApp

Assim nenhuma mensagem sai sem você ligar ao vivo.

---

## IA na demo

- Painel **IA Comercial**: preencha negócio + produtos ou aplique pacote do nicho (CFTV, oficina, etc.)
- No Inbox, após **Gerar resposta**, confira `IA: huggingface` (ou `openai`)
- Se aparecer *resposta padrão — LLM indisponível*, configure `OPENAI_API_KEY` no `.env` da API

---

## Problemas comuns

| Sintoma | Solução |
|---------|---------|
| API offline | `docker compose up -d postgres redis` + `npm run dev` na raiz |
| Redis/Postgres refused | Mesmo comando Docker |
| Mensagens não chegam | Evolution conectado? Webhook em Configurações → setup |
| Inbox vazio na aba Aguardando | Ver aba **Todos** ou **Respondidos** |
