# Workflows n8n (Blueprint)

Este diretorio guarda fluxos de automacao comercial:

- Recuperacao de lead parado por 24h
- Follow-up automatico D+1, D+3, D+7
- Cobranca de inadimplencia por canal
- Reativacao de cliente inativo

Padrão de eventos esperados do backend:

- `lead.created`
- `lead.stage.changed`
- `quote.sent`
- `payment.overdue`
- `conversation.inbound.received`

Cada fluxo deve:

1. Receber webhook assinado
2. Validar tenant e contexto
3. Executar regra de negocio
4. Publicar evento de retorno (status / erro / acao realizada)
