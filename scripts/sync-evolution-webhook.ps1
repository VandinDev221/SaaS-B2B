# Sincroniza webhook da instancia Evolution (header apikey) - Manager nao expoe Headers na UI
param(
  [string]$EvolutionUrl = $env:EVOLUTION_API_URL,
  [string]$ApiKey = $env:EVOLUTION_API_KEY,
  [string]$WebhookSecret = $env:EVOLUTION_WEBHOOK_SECRET,
  [string]$WebhookUrl = $env:EVOLUTION_WEBHOOK_URL,
  [string]$Instance = $env:EVOLUTION_INSTANCE
)

$ErrorActionPreference = "Stop"

if (-not $EvolutionUrl) { $EvolutionUrl = "https://flowos-evolution.onrender.com" }
if (-not $Instance) { $Instance = "flowos" }
if (-not $WebhookUrl) {
  $WebhookUrl = "https://flowos-api.onrender.com/v1/integrations/whatsapp/webhook/evolution"
}
if (-not $ApiKey) {
  Write-Host "Defina EVOLUTION_API_KEY (Render flowos-api, aba Environment)" -ForegroundColor Red
  exit 1
}
if (-not $WebhookSecret) {
  Write-Host "Defina EVOLUTION_WEBHOOK_SECRET (Render flowos-api, aba Environment)" -ForegroundColor Red
  exit 1
}

$evoBase = $EvolutionUrl.TrimEnd("/")
$headers = @{ apikey = $ApiKey; "content-type" = "application/json" }

$body = @{
  webhook = @{
    enabled  = $true
    url      = $WebhookUrl
    byEvents = $false
    base64   = $false
    events   = @("MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE")
    headers  = @{ apikey = $WebhookSecret }
  }
} | ConvertTo-Json -Depth 6

Write-Host "Sincronizando webhook instancia '$Instance'..." -ForegroundColor Cyan
try {
  Invoke-RestMethod "$evoBase/webhook/set/$Instance" -Method POST -Headers $headers -Body $body | Out-Null
  Write-Host "[OK] Webhook com header apikey aplicado." -ForegroundColor Green
  Write-Host "URL: $WebhookUrl" -ForegroundColor Gray
} catch {
  $detail = "$($_.Exception.Message) $($_.ErrorDetails.Message)"
  if ($detail -match '502|503|Bad Gateway|offline no Render') {
    Write-Host "[X] Evolution retornou 502 - container caiu ou cold start no Render free." -ForegroundColor Red
    Write-Host "    Aguarde 1 min e tente de novo." -ForegroundColor Yellow
    exit 1
  }
  if ($detail -match 'does not exist|instanceId') {
    Write-Host "[X] Banco Evolution incompleto (migrations v2.3.7 nao rodaram)." -ForegroundColor Red
    Write-Host ""
    Write-Host "1. Neon SQL Editor:" -ForegroundColor Yellow
    Write-Host '   DROP SCHEMA IF EXISTS evolution CASCADE;' -ForegroundColor Gray
    Write-Host '   CREATE SCHEMA evolution;' -ForegroundColor Gray
    Write-Host "2. Render: flowos-evolution, Manual Deploy" -ForegroundColor Yellow
    Write-Host "   Aguarde log: All migrations have been successfully applied" -ForegroundColor Gray
    Write-Host "3. Rode este script de novo" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ou: npm run reset:evolution-schema" -ForegroundColor Cyan
    exit 1
  }
  throw
}
