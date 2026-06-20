# Diagnostico: webhook Evolution -> Inbox FLOWOS
param(
  [string]$ApiUrl = $env:API_URL,
  [string]$WebhookSecret = $env:EVOLUTION_WEBHOOK_SECRET,
  [string]$Email = "admin@flowos.local",
  [string]$Password = "admin12345",
  [string]$TestPhone = "5598970112031"
)

$ErrorActionPreference = "Stop"
if (-not $ApiUrl) { $ApiUrl = "https://flowos-api.onrender.com/v1" }
$ApiUrl = $ApiUrl.TrimEnd("/")

Write-Host ""
Write-Host "FLOWOS - Diagnostico Inbox / Webhook" -ForegroundColor Cyan
Write-Host "API: $ApiUrl" -ForegroundColor Gray
Write-Host ""

function Invoke-Step {
  param([string]$Name, [scriptblock]$Action)
  Write-Host ">> $Name" -ForegroundColor Yellow
  try {
    $result = & $Action
    Write-Host "[OK] $Name" -ForegroundColor Green
    return $result
  } catch {
    Write-Host "[FAIL] $Name - $($_.Exception.Message)" -ForegroundColor Red
    return $null
  }
}

Invoke-Step "Health" {
  $h = Invoke-RestMethod "$ApiUrl/observability/ready" -TimeoutSec 60
  Write-Host "   db=$($h.database) redis=$($h.redis)" -ForegroundColor Gray
}

$login = Invoke-Step "Login" {
  $body = @{ email = $Email; password = $Password } | ConvertTo-Json
  Invoke-RestMethod "$ApiUrl/auth/login" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 60
}
if (-not $login) { exit 1 }

$headers = @{ Authorization = "Bearer $($login.accessToken)" }

Invoke-Step "Evolution status" {
  $s = Invoke-RestMethod "$ApiUrl/integrations/whatsapp/evolution/status" -Headers $headers -TimeoutSec 90
  Write-Host "   provider=$($s.provider) state=$($s.connectionState) instance=$($s.instance)" -ForegroundColor Gray
  if ($s.webhookUrl) { Write-Host "   webhook=$($s.webhookUrl)" -ForegroundColor Gray }
  $s
}

Invoke-Step "Inbox counts" {
  foreach ($f in @("needs_reply", "replied", "all")) {
    $inbox = Invoke-RestMethod "$ApiUrl/whatsapp/conversations?filter=$f" -Headers $headers -TimeoutSec 60
    Write-Host "   filter=$f total=$($inbox.counts.total) needsReply=$($inbox.counts.needsReply) items=$($inbox.items.Count)" -ForegroundColor Gray
  }
}

$webhookBody = @{
  event    = "MESSAGES_UPSERT"
  instance = "flowos"
  data     = @{
    key = @{
      remoteJid    = "69385314111689@lid"
      remoteJidAlt = "${TestPhone}@s.whatsapp.net"
      fromMe       = $false
    }
    message  = @{ conversation = "Teste diagnostico FLOWOS $(Get-Date -Format 'HH:mm:ss')" }
    pushName = "Teste Diagnostico"
  }
} | ConvertTo-Json -Depth 8

Invoke-Step "Webhook simulado" {
  $whHeaders = @{ "content-type" = "application/json" }
  if ($WebhookSecret) { $whHeaders["apikey"] = $WebhookSecret }
  $r = Invoke-RestMethod "$ApiUrl/integrations/whatsapp/webhook/evolution" -Method POST -Headers $whHeaders -Body $webhookBody -TimeoutSec 60
  Write-Host "   response: $($r | ConvertTo-Json -Compress)" -ForegroundColor Gray
  if (-not $r.ok) { throw "webhook ok=false reason=$($r.reason)" }
  if ($r.skipped) { throw "webhook ignorou: $($r.skipped)" }
  if ($r.processed -lt 1) { throw "nenhuma mensagem processada" }
}

Invoke-Step "Inbox apos webhook" {
  Start-Sleep -Seconds 1
  $inbox = Invoke-RestMethod "$ApiUrl/whatsapp/conversations?filter=all" -Headers $headers -TimeoutSec 60
  Write-Host "   conversas total=$($inbox.counts.total)" -ForegroundColor Gray
  if ($inbox.items.Count -lt 1) { throw "nenhuma conversa apos webhook" }
  $top = $inbox.items[0]
  Write-Host "   ultima: $($top.lead.name) - $($top.messages[0].body)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Diagnostico concluido." -ForegroundColor Green
if (-not $WebhookSecret) {
  Write-Host "Dica: defina EVOLUTION_WEBHOOK_SECRET para testar auth do webhook." -ForegroundColor Yellow
}
