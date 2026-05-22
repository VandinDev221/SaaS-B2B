## FLOWOS — Roadmap (Fase 1 → Fase 3)

### Princípios
- **MVP-first, scale-ready**: entregar valor operacional em semanas, sem “dívida invisível” de arquitetura.
- **Verticalização por nicho**: cada nicho recebe templates, SLAs, playbooks e catálogo/precificação padrão.
- **Operação/Alertas como motor do produto**: o sistema cobra o usuário (e executa partes sozinho) para evitar “leads esquecidos”.

### Fase 1 (0–60 dias) — MVP Comercial
**Objetivo**: transformar atendimento + CRM + follow-up em rotina diária inevitável.

- **Auth & Tenancy**
  - Multi-tenant, RBAC, JWT + refresh
  - Onboarding por nicho (CFTV, oficina, clínica, assistência, prestadores)
  - Perfil da empresa + setup inicial do funil (pipeline)
- **CRM**
  - Pipeline customizável por tenant (etapas e regras de ganho/perda)
  - Lead timeline (histórico), tarefas e atividades
  - Importação básica (CSV) e tagging
- **WhatsApp Hub (Inbox)**
  - Inbox centralizado + vinculação de conversa ao lead
  - Templates (base) e envio controlado
  - Eventos de inbox/outbox para confiabilidade
- **Dashboard**
  - KPIs essenciais: leads, conversão, tempo de resposta, follow-ups do dia, receita recebida, cobranças em risco
- **Operação & Alertas (core)**
  - Regras MVP: lead sem resposta em X min; lead estagnado; cobrança vencida; automação falhou; integração offline; fila crescendo
  - Incidentes com **ack/resolução** e feed de notificações in-app
- **Automação (motor)**
  - Worker BullMQ com execuções persistidas (runs/steps)
  - Playbooks MVP: “follow-up D+1”, “reativação 7/14/30”, “cobrança D-1/D+1/D+7”

**Saída**: um sistema “usável e vendável” com ciclo diário (operação) e prova de ROI.

### Fase 2 (60–120 dias) — Aceleração
**Objetivo**: IA e automação agressiva para reduzir trabalho manual e aumentar taxa de fechamento.

- **IA comercial (contextual)**
  - Resumo de conversa, classificação de lead, sugestão de próxima ação
  - Geração assistida de orçamento e mensagens de follow-up
- **Orçamentos**
  - Itens normalizados + catálogo por nicho
  - PDF profissional + aprovação digital
- **Cobrança**
  - PIX/link/assinaturas (Stripe/MP)
  - Recuperação de inadimplência com sequências automatizadas
- **Operação avançada**
  - Alertas com escalonamento (SLA), supressão, agrupamento, e canais (email/whatsapp)
  - Métricas e tracing (Prometheus/OTel) + healthchecks de DB/Redis/filas

### Fase 3 (120–240 dias) — Escala
**Objetivo**: white-label, marketplace e caminho para microservices.

- **White-label**
  - Domínios customizados, branding, templates por revenda, multi-região (opcional)
- **Marketplace**
  - Templates por nicho: automações, pipelines, scripts de vendas, catálogos, métricas
- **Arquitetura**
  - Extração gradual (quando fizer sentido): messaging/inbox, billing, automation engine, AI service
  - Governança: feature flags, entitlements, auditoria e compliance

---

## Planos e Monetização

### Planos
- **Starter**: 1 número WhatsApp, até X usuários, CRM+Inbox+Dashboard, alertas básicos.
- **Pro**: automações completas, templates por nicho, cobrança/PIX, relatórios avançados.
- **Scale**: múltiplos números/filiais, RBAC avançado, integrações, SSO (opcional), SLAs.
- **White-label**: revenda, branding completo, marketplace privado, entitlements custom.

### Receita
- **Mensalidade** por plano (âncora)
- **Setup** (onboarding assistido por nicho, importação, playbooks)
- **Upsells**: automações premium, templates nichados, múltiplos canais, números adicionais
- **Serviços premium**: consultoria de processo, implantação, treinamento

---

## Estratégia Comercial (Go-to-market)

### Posicionamento
“Não é só CRM: é um **Sistema Operacional Comercial por nicho** que reduz tempo de resposta, elimina follow-up perdido e acelera faturamento.”

### ICP (perfil ideal)
- Dono/gestor de micro e pequenas empresas com 2–20 pessoas
- Alta dependência de WhatsApp e orçamento manual
- Dor clara: “perco lead / demoro responder / não cobro / não acompanho”

### Oferta de entrada (irresistível)
- **Prova de ROI**: calculadora de receita recuperada (tempo de resposta + taxa de follow-up)
- **Setup rápido**: pipeline pronto + automações “D+1/D+7/D+30” + scripts de resposta por nicho

### Canais de aquisição
- **Parcerias**: agências locais, consultores comerciais, casas de software de nicho
- **Outbound**: listas por nicho (Google Maps/Instagram), cadência curta com demonstração de ROI
- **Conteúdo**: playbooks operacionais (“Como aumentar conversão no WhatsApp”), templates e checklists

### Retenção (anti-churn)
- Primeiro valor em 7 dias: tempo de resposta e follow-up controlado por alertas
- Health score por tenant (uso + resultado): se cair, automações de reativação e CS playbooks
- Crescimento orientado a maturidade: desbloquear features conforme evolução operacional

### Estratégia de escala
- Entitlements por tenant e feature flags por plano
- Templates por nicho como moat (acelera onboarding e reduz churn)
- White-label para canais de revenda e expansão regional

