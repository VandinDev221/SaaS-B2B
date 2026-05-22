# FLOWOS — configura Evolution API + instancia WhatsApp
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$apiKey = if ($env:EVOLUTION_API_KEY) { $env:EVOLUTION_API_KEY } else { "flowos-evolution-dev-key" }
$evoBase = if ($env:EVOLUTION_API_URL) { $env:EVOLUTION_API_URL } else { "http://localhost:8080" }
$instance = if ($env:EVOLUTION_INSTANCE) { $env:EVOLUTION_INSTANCE } else { "flowos" }
$webhookUrl = if ($env:EVOLUTION_WEBHOOK_URL) {
  $env:EVOLUTION_WEBHOOK_URL
} else {
  "http://host.docker.internal:4000/v1/integrations/whatsapp/webhook/evolution"
}
$webhookSecret = if ($env:EVOLUTION_WEBHOOK_SECRET) { $env:EVOLUTION_WEBHOOK_SECRET } else { "flowos-webhook-secret" }

$headers = @{ apikey = $apiKey; "content-type" = "application/json" }

Write-Host "FLOWOS — Setup Evolution API" -ForegroundColor Cyan
Write-Host "URL: $evoBase | Instancia: $instance" -ForegroundColor Gray

function Test-EvolutionUp {
  try {
    Invoke-RestMethod "$evoBase" -Headers @{ apikey = $apiKey } -TimeoutSec 5 | Out-Null
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-EvolutionUp)) {
  Write-Host "Evolution nao responde em $evoBase" -ForegroundColor Yellow
  Write-Host "Subindo container..." -ForegroundColor Green
  docker compose up -d evolution-api
  $retries = 30
  for ($i = 0; $i -lt $retries; $i++) {
    if (Test-EvolutionUp) { break }
    Start-Sleep -Seconds 2
  }
  if (-not (Test-EvolutionUp)) {
    Write-Host "Evolution ainda offline. Verifique: docker logs flowos-evolution" -ForegroundColor Red
    exit 1
  }
}

Write-Host "[OK] Evolution online" -ForegroundColor Green

$createBody = @{
  instanceName = $instance
  qrcode       = $true
  integration  = "WHATSAPP-BAILEYS"
  webhook      = @{
    enabled = $true
    url     = $webhookUrl
    byEvents = $false
    base64  = $false
    headers = @{ apikey = $webhookSecret }
  }
} | ConvertTo-Json -Depth 6

try {
  Invoke-RestMethod "$evoBase/instance/create" -Method POST -Headers $headers -Body $createBody | Out-Null
  Write-Host "[OK] Instancia '$instance' criada" -ForegroundColor Green
} catch {
  Write-Host "[--] Instancia ja existe ou create retornou erro (continuando)" -ForegroundColor Yellow
}

try {
  $wh = @{
    webhook = @{
      enabled         = $true
      url             = $webhookUrl
      webhookByEvents = $false
      webhookBase64   = $false
      events          = @("MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE")
      headers         = @{ apikey = $webhookSecret }
    }
  } | ConvertTo-Json -Depth 6
  Invoke-RestMethod "$evoBase/webhook/set/$instance" -Method POST -Headers $headers -Body $wh | Out-Null
  Write-Host "[OK] Webhook apontando para FLOWOS" -ForegroundColor Green
  Write-Host "     $webhookUrl" -ForegroundColor Gray
} catch {
  Write-Host "[--] Webhook set: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Conectando WhatsApp (QR Code)..." -ForegroundColor Cyan
try {
  $connect = Invoke-RestMethod "$evoBase/instance/connect/$instance" -Headers @{ apikey = $apiKey }
  if ($connect.base64) {
    $qrPath = Join-Path $PSScriptRoot "evolution-qrcode.png"
    [IO.File]::WriteAllBytes($qrPath, [Convert]::FromBase64String($connect.base64))
    Write-Host "[OK] QR Code salvo em: $qrPath" -ForegroundColor Green
    Start-Process $qrPath
  } elseif ($connect.pairingCode) {
    Write-Host "Codigo de pareamento: $($connect.pairingCode)" -ForegroundColor Green
  } else {
    $connect | ConvertTo-Json -Depth 5
  }
} catch {
  Write-Host "Erro ao obter QR: $($_.Exception.Message)" -ForegroundColor Red
}

try {
  $state = Invoke-RestMethod "$evoBase/instance/connectionState/$instance" -Headers @{ apikey = $apiKey }
  Write-Host "Estado da conexao: $($state | ConvertTo-Json -Compress)" -ForegroundColor Cyan
} catch {
  Write-Host "Nao foi possivel ler estado da conexao" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Atualize apps/api/.env:" -ForegroundColor Cyan
Write-Host "  WHATSAPP_PROVIDER=evolution"
Write-Host "  EVOLUTION_API_KEY=$apiKey"
Write-Host "  EVOLUTION_WEBHOOK_SECRET=$webhookSecret"
Write-Host ""
Write-Host "Reinicie a API (npm run dev) e escaneie o QR no WhatsApp > Aparelhos conectados" -ForegroundColor Green
