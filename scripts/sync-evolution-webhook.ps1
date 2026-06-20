# Sincroniza webhook da instancia Evolution (header apikey) — Manager nao expoe Headers na UI
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
  Write-Host "Defina EVOLUTION_API_KEY (Render flowos-api -> Environment)" -ForegroundColor Red
  exit 1
}
if (-not $WebhookSecret) {
  Write-Host "Defina EVOLUTION_WEBHOOK_SECRET (Render flowos-api -> Environment)" -ForegroundColor Red
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
Invoke-RestMethod "$evoBase/webhook/set/$Instance" -Method POST -Headers $headers -Body $body | Out-Null
Write-Host "[OK] Webhook com header apikey aplicado." -ForegroundColor Green
Write-Host "URL: $WebhookUrl" -ForegroundColor Gray
