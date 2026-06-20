# Importa mensagens da Evolution para o FLOWOS (quando webhook falhou no Render free)
param(
  [string]$ApiUrl = "https://flowos-api.onrender.com/v1",
  [string]$EvoUrl = $env:EVOLUTION_API_URL,
  [string]$ApiKey = $env:EVOLUTION_API_KEY,
  [string]$WebhookSecret = $env:EVOLUTION_WEBHOOK_SECRET,
  [int]$Limit = 40
)

$ErrorActionPreference = "Stop"
if (-not $EvoUrl) { $EvoUrl = "https://flowos-evolution.onrender.com" }
if (-not $ApiKey) { Write-Host "Defina EVOLUTION_API_KEY" -ForegroundColor Red; exit 1 }
if (-not $WebhookSecret) { Write-Host "Defina EVOLUTION_WEBHOOK_SECRET" -ForegroundColor Red; exit 1 }

$ApiUrl = $ApiUrl.TrimEnd("/")
$EvoUrl = $EvoUrl.TrimEnd("/")

Write-Host "Buscando ate $Limit mensagens na Evolution..." -ForegroundColor Cyan
$body = "{`"limit`":$Limit,`"page`":1}"
$resp = Invoke-RestMethod "$EvoUrl/chat/findMessages/flowos" -Method POST -Headers @{ apikey = $ApiKey; "content-type" = "application/json" } -Body $body
$records = $resp.messages.records
Write-Host "Registros: $($records.Count)"

$imported = 0
$skipped = 0
foreach ($row in $records) {
  if ($row.key.fromMe -eq $true) { $skipped++; continue }
  $text = $row.message.conversation
  if (-not $text) { $text = $row.message.extendedTextMessage.text }
  if (-not $text) { $skipped++; continue }
  if (-not $row.key.remoteJidAlt -and -not ($row.key.remoteJid -like "*@s.whatsapp.net")) {
    Write-Host " skip sem telefone id=$($row.key.id)" -ForegroundColor Yellow
    $skipped++
    continue
  }

  $payload = @{
    event    = "messages.upsert"
    instance = "flowos"
    apikey   = $WebhookSecret
    data     = @{
      key      = $row.key
      message  = $row.message
      pushName = $row.pushName
    }
  } | ConvertTo-Json -Depth 12

  $r = Invoke-RestMethod "$ApiUrl/integrations/whatsapp/webhook/evolution" -Method POST -ContentType "application/json" -Body $payload
  if ($r.processed -ge 1) { $imported++ } else { $skipped++ }
}

Write-Host "[OK] importadas=$imported ignoradas=$skipped" -ForegroundColor Green
Write-Host "Abra o Inbox (aba Todos) e atualize a pagina." -ForegroundColor Cyan
