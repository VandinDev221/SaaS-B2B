# Corrige conflito: Evolution rodou migration no schema public do Neon
# e deixou registro falho que bloqueia o deploy da flowos-api (P3009).
param(
  [string]$DatabaseUrl = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not $DatabaseUrl) {
  Write-Host "Defina DATABASE_URL (mesma URL do flowos-api no Render):" -ForegroundColor Red
  Write-Host '  $env:DATABASE_URL = "postgresql://...@ep-xxx.neon.tech/neondb?sslmode=require"' -ForegroundColor Gray
  exit 1
}

$failedMigration = "20240609181238_init"

Write-Host ""
Write-Host "FLOWOS — Corrigir migration falha no Neon (P3009)" -ForegroundColor Cyan
Write-Host "Migration Evolution no schema public: $failedMigration" -ForegroundColor Yellow
Write-Host ""

$env:DATABASE_URL = $DatabaseUrl

Push-Location apps/api
try {
  Write-Host "Marcando migration como rolled-back..." -ForegroundColor Cyan
  npx prisma migrate resolve --rolled-back $failedMigration
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host ""
  Write-Host "[OK] Prisma resolve concluido." -ForegroundColor Green
  Write-Host ""
  Write-Host "Proximos passos no Render:" -ForegroundColor Cyan
  Write-Host "  1. flowos-evolution -> DATABASE_CONNECTION_URI com &schema=evolution" -ForegroundColor Gray
  Write-Host "  2. Redeploy flowos-evolution, depois flowos-api" -ForegroundColor Gray
} finally {
  Pop-Location
}
