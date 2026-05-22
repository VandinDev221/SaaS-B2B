# FLOWOS — Checklist de Producao

## Antes do deploy

### Segredos e ambiente
- [ ] `NODE_ENV=production` na API e no build do Next
- [ ] `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` com 32+ caracteres aleatorios
- [ ] `CORS_ORIGINS` com o dominio exato do front (ex.: `https://app.seudominio.com`)
- [ ] `PUBLIC_WEB_URL` apontando para o front publico
- [ ] `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_SECRET` configurados
- [ ] `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` (assinatura x-signature)
- [ ] `ALLOW_WHATSAPP_MOCK=false` e `ALLOW_PIX_MOCK=false`
- [ ] Nenhum arquivo `.env` com tokens reais commitado no Git

### Banco e filas
- [ ] `npx prisma migrate deploy` executado no pipeline
- [ ] Postgres com backup automatico
- [ ] Redis acessivel pela API (BullMQ)

### Infra
- [ ] Health: `GET /v1/observability/ready` (DB + Redis + Evolution)
- [ ] Liveness: `GET /v1/observability/live`
- [ ] Load balancer usa `/ready` para trafego

### WhatsApp
- [ ] Instancia Evolution conectada (`connectionState: open`)
- [ ] Webhook apontando para `https://api.seudominio.com/v1/integrations/whatsapp/webhook/evolution`
- [ ] Cada tenant com `whatsappInstance` correto (sem fallback em producao)

### Front
- [ ] `NEXT_PUBLIC_API_URL` = URL publica da API
- [ ] Cookies `Secure` (HTTPS)
- [ ] Build Next com `output: standalone` em producao

## Pos-deploy (smoke)

```bash
curl -s https://api.seudominio.com/v1/observability/ready
curl -s -X POST https://api.seudominio.com/v1/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"...","password":"..."}'
```

## Ainda recomendado (proxima iteracao)

- Sentry / OpenTelemetry
- MFA e recuperacao de senha
- Paginas LGPD (privacidade, exportacao, exclusao)
- Stripe (quando necessario)
- Testes e2e com Testcontainers no CI
- Rate limit por tenant na IA
