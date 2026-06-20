# Reseta schema evolution no Neon (migrations v2.3.7 do zero)
# Corrige: column "instanceId" does not exist
param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$sqlFile = Join-Path $PSScriptRoot "reset-evolution-schema.sql"
$sql = Get-Content $sqlFile -Raw

Write-Host ""
Write-Host "FLOWOS — Reset schema Evolution no Neon" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Causa: banco evolution migrado na v2.1.1 e imagem agora e v2.3.7." -ForegroundColor Yellow
Write-Host "       Tabela Chat ficou sem coluna instanceId -> mensagens falham no webhook." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANTE: isso apaga SO o schema 'evolution' (WhatsApp/Evolution)." -ForegroundColor Red
Write-Host "            O schema 'public' do FLOWOS (leads, inbox) NAO e afetado." -ForegroundColor Green
Write-Host ""

if (-not $Force) {
  Write-Host "Passo 1 — Neon SQL Editor (console.neon.tech):" -ForegroundColor Cyan
  Write-Host "  Cole e execute:" -ForegroundColor Gray
  Write-Host ""
  Write-Host $sql -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "Passo 2 — Render -> flowos-evolution -> Manual Deploy" -ForegroundColor Cyan
  Write-Host "  Aguarde logs: 'All migrations have been successfully applied'" -ForegroundColor Gray
  Write-Host ""
  Write-Host "Passo 3 — Reconectar WhatsApp" -ForegroundColor Cyan
  Write-Host "  Manager ou SaaS -> QR Code (instancia flowos sera recriada)" -ForegroundColor Gray
  Write-Host ""
  Write-Host "Passo 4 — Webhook com apikey" -ForegroundColor Cyan
  Write-Host '  $env:EVOLUTION_API_KEY="..."; $env:EVOLUTION_WEBHOOK_SECRET="..."' -ForegroundColor Gray
  Write-Host "  npm run sync:evolution-webhook" -ForegroundColor Gray
  Write-Host ""
  Write-Host "Passo 5 — Teste mensagem -> Inbox aba Todos" -ForegroundColor Cyan
  exit 0
}

Write-Host "Modo -Force: tentando via psql se DATABASE_URL estiver definida..." -ForegroundColor Yellow
$db = $env:DATABASE_URL
if (-not $db) {
  Write-Host "Defina DATABASE_URL ou rode sem -Force e use o SQL no Neon." -ForegroundColor Red
  exit 1
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  Write-Host "psql nao encontrado. Use o SQL manualmente:" -ForegroundColor Yellow
  Write-Host $sql
  exit 1
}

$sql | & psql $db
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "[OK] Schema evolution resetado. Redeploy flowos-evolution no Render." -ForegroundColor Green
