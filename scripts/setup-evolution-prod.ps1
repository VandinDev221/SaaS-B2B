# FLOWOS — prepara Evolution API em producao (Render + Neon + Upstash)
param(
  [string]$EvolutionUrl = $env:EVOLUTION_API_URL,
  [string]$ApiKey = $env:EVOLUTION_API_KEY,
  [string]$WebhookUrl = $env:EVOLUTION_WEBHOOK_URL,
  [string]$WebhookSecret = $env:EVOLUTION_WEBHOOK_SECRET,
  [string]$Instance = $env:EVOLUTION_INSTANCE,
  [string]$DatabaseUrl = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not $EvolutionUrl) { $EvolutionUrl = "https://flowos-evolution.onrender.com" }
if (-not $Instance) { $Instance = "flowos" }
if (-not $WebhookUrl) {
  $WebhookUrl = "https://flowos-api.onrender.com/v1/integrations/whatsapp/webhook/evolution"
}

function To-EvolutionDatabaseUri([string]$url) {
  if (-not $url) { return $null }
  $uri = $url.Trim()
  if ($uri -match "schema=") {
    return ($uri -replace "schema=[^&]+", "schema=evolution")
  }
  if ($uri -match "\?") {
    return "$uri&schema=evolution"
  }
  return "$uri?schema=evolution"
}

function Test-EvolutionUp([string]$base, [string]$key) {
  try {
    Invoke-RestMethod "$base" -Headers @{ apikey = $key } -TimeoutSec 30 | Out-Null
    return $true
  } catch {
    return $false
  }
}

Write-Host ""
Write-Host "FLOWOS — Setup Evolution (producao)" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

if ($DatabaseUrl) {
  $evoDb = To-EvolutionDatabaseUri $DatabaseUrl
  Write-Host "[1] DATABASE_CONNECTION_URI para flowos-evolution no Render:" -ForegroundColor Yellow
  Write-Host "    $evoDb" -ForegroundColor Gray
  Write-Host ""
}

Write-Host "[2] Variaveis obrigatorias no Render (flowos-api):" -ForegroundColor Yellow
Write-Host "    WHATSAPP_PROVIDER=evolution"
Write-Host "    EVOLUTION_API_URL=$EvolutionUrl"
Write-Host "    EVOLUTION_INSTANCE=$Instance"
Write-Host "    EVOLUTION_WEBHOOK_URL=$WebhookUrl"
Write-Host "    EVOLUTION_API_KEY=<mesmo valor de AUTHENTICATION_API_KEY no flowos-evolution>"
Write-Host "    EVOLUTION_WEBHOOK_SECRET=<segredo forte, 32+ chars>"
Write-Host ""

if (-not $ApiKey) {
  Write-Host "[!] EVOLUTION_API_KEY nao definida. Copie do Render:" -ForegroundColor Red
  Write-Host "    flowos-api -> Environment -> EVOLUTION_API_KEY" -ForegroundColor Gray
  Write-Host "    Cole em flowos-evolution -> AUTHENTICATION_API_KEY (via Blueprint ja sincroniza)" -ForegroundColor Gray
  Write-Host ""
  Write-Host "Depois rode novamente:" -ForegroundColor Cyan
  Write-Host '  $env:EVOLUTION_API_KEY="..."; npm run setup:evolution:prod' -ForegroundColor Gray
  exit 0
}

if (-not $WebhookSecret) {
  Write-Host "[!] EVOLUTION_WEBHOOK_SECRET nao definida." -ForegroundColor Yellow
  Write-Host "    Copie de flowos-api -> Environment no Render e exporte antes de rodar o script." -ForegroundColor Gray
  $WebhookSecret = ""
}

$evoBase = $EvolutionUrl.TrimEnd("/")
$headers = @{ apikey = $ApiKey; "content-type" = "application/json" }

Write-Host "[3] Testando Evolution em $evoBase ..." -ForegroundColor Yellow
if (-not (Test-EvolutionUp $evoBase $ApiKey)) {
  Write-Host "[X] Evolution offline ou chave invalida." -ForegroundColor Red
  Write-Host "    - flowos-evolution deployou? (Render pode levar 2-5 min no cold start)" -ForegroundColor Gray
  Write-Host "    - DATABASE_CONNECTION_URI configurada no flowos-evolution?" -ForegroundColor Gray
  Write-Host "    - EVOLUTION_API_KEY = AUTHENTICATION_API_KEY?" -ForegroundColor Gray
  exit 1
}
Write-Host "[OK] Evolution online" -ForegroundColor Green

$createBody = @{
  instanceName = $Instance
  qrcode       = $true
  integration  = "WHATSAPP-BAILEYS"
  webhook      = @{
    enabled  = $true
    url      = $WebhookUrl
    byEvents = $false
    base64   = $false
    headers  = @{ apikey = $WebhookSecret }
  }
} | ConvertTo-Json -Depth 6

try {
  Invoke-RestMethod "$evoBase/instance/create" -Method POST -Headers $headers -Body $createBody | Out-Null
  Write-Host "[OK] Instancia '$Instance' criada" -ForegroundColor Green
} catch {
  Write-Host "[--] Instancia ja existe ou create retornou aviso (continuando)" -ForegroundColor Yellow
}

if ($WebhookSecret) {
  try {
    $wh = @{
      webhook = @{
        enabled         = $true
        url             = $WebhookUrl
        webhookByEvents = $false
        webhookBase64   = $false
        events          = @("MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE")
        headers         = @{ apikey = $WebhookSecret }
      }
    } | ConvertTo-Json -Depth 6
    Invoke-RestMethod "$evoBase/webhook/set/$Instance" -Method POST -Headers $headers -Body $wh | Out-Null
    Write-Host "[OK] Webhook -> $WebhookUrl" -ForegroundColor Green
  } catch {
    Write-Host "[--] Webhook set: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "[4] Proximo passo: no SaaS (Settings -> WhatsApp) clique Conectar / Gerar QR Code" -ForegroundColor Green
Write-Host "    Ou obtenha QR aqui:" -ForegroundColor Gray

try {
  $connect = Invoke-RestMethod "$evoBase/instance/connect/$Instance" -Headers @{ apikey = $ApiKey }
  if ($connect.base64) {
    $qrPath = Join-Path $PSScriptRoot "evolution-qrcode-prod.png"
    [IO.File]::WriteAllBytes($qrPath, [Convert]::FromBase64String($connect.base64))
    Write-Host "[OK] QR salvo: $qrPath" -ForegroundColor Green
    Start-Process $qrPath
  } elseif ($connect.pairingCode) {
    Write-Host "Codigo de pareamento: $($connect.pairingCode)" -ForegroundColor Green
  }
} catch {
  Write-Host "QR via API: $($_.Exception.Message) — use o painel do SaaS." -ForegroundColor Yellow
}

try {
  $state = Invoke-RestMethod "$evoBase/instance/connectionState/$Instance" -Headers @{ apikey = $ApiKey }
  Write-Host "Estado: $($state | ConvertTo-Json -Compress)" -ForegroundColor Cyan
} catch {
  Write-Host "Estado indisponivel (instancia nova — normal ate escanear QR)" -ForegroundColor Yellow
}

Write-Host ""
