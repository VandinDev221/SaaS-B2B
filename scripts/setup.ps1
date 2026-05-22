# FLOWOS - setup local (PostgreSQL + Redis via Docker)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "FLOWOS setup..." -ForegroundColor Cyan

function Test-Docker {
  try {
    docker info 2>$null | Out-Null
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-Docker)) {
  Write-Host ""
  Write-Host "Docker Desktop nao esta em execucao." -ForegroundColor Red
  Write-Host "1. Inicie o Docker Desktop" -ForegroundColor Yellow
  Write-Host "2. Execute novamente: .\scripts\setup.ps1" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Alternativa: instale PostgreSQL 16 e Redis localmente e configure DATABASE_URL em apps/api/.env" -ForegroundColor Yellow
  exit 1
}

Write-Host "Subindo PostgreSQL e Redis..." -ForegroundColor Green
docker compose up -d postgres redis

Write-Host "Aguardando healthcheck..." -ForegroundColor Green
$retries = 30
for ($i = 0; $i -lt $retries; $i++) {
  $pg = docker inspect -f "{{.State.Health.Status}}" flowos-postgres 2>$null
  if ($pg -eq "healthy") { break }
  Start-Sleep -Seconds 2
}

npm install
npm run prisma:generate -w @flowos/api
npm run prisma:deploy -w @flowos/api
npm run prisma:seed -w @flowos/api

Write-Host ""
Write-Host "Setup concluido!" -ForegroundColor Green
Write-Host "Credenciais demo: admin@flowos.local / admin12345" -ForegroundColor Cyan
Write-Host "Inicie: npm run dev" -ForegroundColor Cyan
