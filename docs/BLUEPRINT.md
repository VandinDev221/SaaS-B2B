# FLOWOS Blueprint de Produto e Arquitetura

## 1) Estrutura completa de pastas

```txt
Saas-B2B/
  apps/
    web/
      app/
      components/
      lib/
      public/
    api/
      src/
        common/
        modules/
          auth/
          crm/
          dashboard/
          tenancy/
          whatsapp/
        prisma/
      prisma/
  packages/
    shared/
      src/
  infra/
    docker/
    n8n/
  docs/
  .github/
    workflows/
```

## 2) Arquitetura tecnica

- **Padrao**: modular monolith orientado a dominio, pronto para extracao em microservices
- **Comunicacao**: REST para APIs, webhooks para integracoes externas, eventos internos para automacao
- **Multi-tenant**: `tenantId` em entidades e indexes compostos para isolamento logico e performance
- **Camadas**:
  - `web`: app router, dashboard operacional, UI role-based
  - `api`: servicos de dominio, auth, CRM, WhatsApp Hub, KPIs, billing
  - `infra`: containers, CI/CD, workflows n8n

## 3) Banco de dados

Schema Prisma inclui os dominos exigidos:

- `Tenant`, `Company`, `User`, `Lead`
- `Conversation`, `Message`
- `Automation`
- `Quote`
- `Payment`
- `Plan`, `Subscription`
- `AnalyticsEvent`
- `AuditLog`

## 4) UI/UX design system

- **Linguagem visual**: minimalista premium, foco em clareza operacional
- **Princípios**:
  - poucos cliques para acao critica
  - contraste forte em estados (novo, em risco, ganho, perdido)
  - densidade de informacao controlada para operacao mobile-first
- **Componentes base**:
  - cards de KPI
  - shell lateral com foco em tarefas comerciais
  - estados de pipeline por etapa
  - blocos de alerta para follow-up e cobranca

## 5) Codigo base frontend

Entregue em `apps/web` com:

- Next.js App Router + TypeScript
- Tailwind e utilitario `cn`
- app shell inicial com dashboard premium
- suporte a dark/light por variaveis CSS

## 6) Codigo base backend

Entregue em `apps/api` com:

- NestJS + Config + Throttler
- Modulos MVP: `auth`, `crm`, `dashboard`, `whatsapp`, `tenancy`
- Prisma service central
- Endpoints iniciais:
  - `POST /v1/auth/login`
  - `GET /v1/crm/leads`
  - `GET /v1/dashboard/kpis`
  - `GET /v1/whatsapp/conversations`

## 7) Dockerizacao

- `docker-compose.yml` com:
  - PostgreSQL
  - Redis
  - API
  - Web
- Dockerfiles separados em `infra/docker/`

## 8) CI/CD

Pipeline em `.github/workflows/ci.yml`:

- install
- prisma generate
- lint
- build

## 9) Roadmap

- **Fase 1 (0-60 dias)**: auth, crm, whatsapp hub, dashboard, onboarding por nicho
- **Fase 2 (60-120 dias)**: IA comercial, orcamento PDF, cobranca automatizada
- **Fase 3 (120-240 dias)**: white-label total, marketplace de templates, escala multi-regiao

## 10) Estrategia comercial

- Posicionamento: "Sistema Operacional Comercial por nicho"
- Ticket: assinatura + setup + serviços premium
- Go-to-market: nichos com dor de resposta e follow-up

## 11) Estrategia de aquisicao

- Canal parceiro (agencias locais, consultores comerciais)
- Outbound segmentado por nicho
- Conteudo com casos reais e calculadora de receita recuperada
- Oferta de setup guiado como acelerador de fechamento

## 12) Estrategia de retencao

- Onboarding em 7 dias com first value claro
- Alertas de risco de churn por uso e resultado
- Success playbooks por nicho com automacoes prontas
- Trilha de upsell baseada em maturidade operacional

## 13) Estrategia de escala

- Feature flags por plano e tenant
- White-label + revenda
- Evolucao gradual para microsservicos (billing, messaging, AI engine)
- Observabilidade e SRE baseline desde inicio
