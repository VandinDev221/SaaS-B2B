# FLOWOS — instala e baixa modelo Ollama (IA local gratis)
# Requisito: https://ollama.com/download instalado no Windows

$ErrorActionPreference = "Stop"
$model = $env:OLLAMA_MODEL
if (-not $model) { $model = "llama3.2" }

Write-Host "FLOWOS: verificando Ollama..." -ForegroundColor Cyan
try {
  ollama --version | Out-Host
} catch {
  Write-Host "Ollama nao encontrado. Instale em https://ollama.com/download" -ForegroundColor Red
  exit 1
}

Write-Host "Baixando modelo $model (pode demorar na primeira vez)..." -ForegroundColor Cyan
ollama pull $model

Write-Host "Testando chat..." -ForegroundColor Cyan
$body = @{
  model = $model
  messages = @(
    @{ role = "user"; content = "Responda em uma frase: ola, boa tarde!" }
  )
  stream = $false
} | ConvertTo-Json -Depth 5

try {
  $res = Invoke-RestMethod -Uri "http://localhost:11434/api/chat" -Method POST -Body $body -ContentType "application/json"
  Write-Host "Resposta: $($res.message.content)" -ForegroundColor Green
} catch {
  Write-Host "API Ollama nao respondeu em :11434. Inicie o app Ollama." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Configure apps/api/.env:" -ForegroundColor Green
Write-Host "  AI_PROVIDER=ollama"
Write-Host "  OLLAMA_MODEL=$model"
Write-Host "  OLLAMA_BASE_URL=http://localhost:11434/v1"
