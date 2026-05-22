# FLOWOS

Sistema Operacional Comercial para pequenos negocios (Vertical SaaS) focado em transformar atendimento, CRM, orcamento, cobranca e pos-venda em uma maquina de receita.

## Stack

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui style primitives, Framer Motion
- Backend: NestJS, TypeScript, PostgreSQL, Prisma, Redis, BullMQ, WebSocket + REST + Webhooks
- Automacao: n8n + eventos internos
- IA: OpenAI/Hugging Face (camada de AI service pronta para conectores)
- Pagamentos: Stripe + Mercado Pago + PIX (camada de provider)
- Infra: Docker, Docker Compose, GitHub Actions, Cloudflare/Vercel/Railway ready

## Estrutura

```txt
apps/
  web/          # Next.js frontend multi-tenant
  api/          # NestJS backend modular monolith
packages/
  shared/       # tipos e contratos compartilhados
infra/
  docker/       # Dockerfiles
  n8n/          # templates de workflows comerciais
.github/
  workflows/    # CI/CD
```

## Fases do Produto

### Fase 1 (MVP comercial)
- Auth multi-tenant + RBAC
- CRM pipeline + leads
- WhatsApp Hub (inbox, mensagens, eventos)
- Dashboard com KPIs operacionais

### Fase 2 (aceleracao) — implementada
- **IA**: resumo de conversa, classificacao de lead, proxima acao, rascunho de resposta, geracao de orcamento (`/inbox` + `OPENAI_API_KEY` opcional)
- **Orcamentos**: catalogo por nicho, criacao com IA, PDF, aprovacao digital (`/quotes`)
- **Cobranca**: PIX (copy-paste), links, cobrancas, inadimplencia e playbook de recuperacao (`/billing`)

### Fase 3 (escala)
- White-label completo
- Marketplace de templates por nicho
- Arquitetura orientada a dominios para extracao em microservices

## Estrategia Comercial

- Planos: Starter, Pro, Scale, White-label
- Receita: mensalidade + setup + upsells de automacao + templates nichados + servicos premium
- Aquisição: parcerias locais, inside sales, conteudo operacional, indicacao com comissao
- Retenção: onboarding guiado por nicho, health score de conta, automacoes de valor em D+7, D+30 e D+90

## Seguranca

- Isolamento por tenant em toda consulta
- JWT + refresh token + rotacao de secrets
- Rate limiting global e por tenant
- Audit log para operacoes sensiveis
- LGPD by design (consentimento, minimizacao e trilha de acesso)

## Demonstracao

Roteiro passo a passo para apresentacao: [docs/DEMO.md](docs/DEMO.md)

## Producao

Checklist e deploy: [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) · [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Como rodar local

**Requisito:** Docker Desktop em execucao (PostgreSQL + Redis).

```powershell
npm install
npm run setup
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/v1
- Login demo: `admin@flowos.local` / `admin12345`

Se o Docker nao estiver disponivel, configure `DATABASE_URL` e `REDIS_URL` em `apps/api/.env`, rode `npm run db:migrate` e `npm run db:seed`, depois `npm run dev`.
