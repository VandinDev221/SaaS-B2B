## Baseline audit (repo atual)

### Frontend (`apps/web`)
- **Rotas**: apenas `/` em `apps/web/app/page.tsx`, renderiza `AppShell`.
- **Navegação**: menu em `apps/web/components/app-shell.tsx` é composto por `<button>` sem `href`/`Link`/router (não existe Dashboard/CRM/Operacao/Alertas).
- **API client**: não existe client HTTP nem uso de `NEXT_PUBLIC_API_URL` no código-fonte (apenas nos `.env*`).
- **Implicação**: “Dashboard/CRM/WhatsApp Hub/Operacao/Alertas” não funcionam no web porque **não existem como produto**, só como UI estática.

### Backend (`apps/api`)
- **Módulos presentes** (importados em `apps/api/src/modules/app.module.ts`):
  - `auth`, `tenancy`, `crm`, `whatsapp`, `dashboard`, `automation`, `integrations`, `quotes`, `billing`, `observability`.
- **Rotas existentes (principais)**:
  - `GET /v1/dashboard/kpis` (consulta Prisma agregando `lead`, `quote`, `payment`).
  - `GET /v1/crm/leads` (lista 100 leads por tenant).
  - `GET /v1/whatsapp/conversations` (lista conversas+mensagens por tenant).
  - `POST /v1/whatsapp/send-template` (chama adapter + enfileira evento).
  - `GET /v1/observability/health`, `GET /v1/observability/metrics` (básico).
- **Automação**: `AutomationService` cria BullMQ `Queue/Worker` e processa jobs **apenas com log** (sem regras, runs, incidentes, canais).
- **Alertas/Operação**: **não existe módulo** dedicado; não há entidades de regras/incidentes/notificações; não há UI nem endpoints.
- **WhatsApp**: listagem via Prisma ok; envio de template depende de adapter que hoje é **mock/placeholder** (sem provider real).

### Banco de dados (Prisma/Postgres)
- **Schema atual**: `Tenant/Company/User`, `Lead`, `Conversation/Message`, `Automation`, `Quote`, `Payment`, `Plan/Subscription`, `AnalyticsEvent/AuditLog`, `InboxEvent/OutboxEvent`.
- **Lacunas para módulos obrigatórios**:
  - **Operação/Alertas**: faltam `AlertRule`, `AlertIncident`, `Notification`, preferências e ack/escalation.
  - **Automation engine**: faltam `AutomationRun`, step-runs, scheduler e logs estruturados.
  - **CRM**: pipeline customizável (hoje `LeadStage` enum fixa), tarefas/atividades e histórico.
  - **WhatsApp**: entidades de conta/número/templates/status/mídia.
  - **Billing**: invoices/events/entitlements e estrutura enterprise.

### Conclusão
O backend possui **skeleton funcional** para CRM/Dashboard/WhatsApp, mas o produto “Operação/Alertas” **não existe** como domínio persistente nem como UI. O frontend ainda está em estado de “shell estático”, então os módulos não “funcionam” do ponto de vista do usuário final.

