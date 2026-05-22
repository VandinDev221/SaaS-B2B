# FLOWOS — varredura completa (API + automacao + build)
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$failed = 0
$passed = 0

function Step($name, $scriptBlock) {
  Write-Host "`n>> $name" -ForegroundColor Cyan
  try {
    & $scriptBlock
    Write-Host "   OK" -ForegroundColor Green
    $script:passed++
  } catch {
    Write-Host "   FALHA: $($_.Exception.Message)" -ForegroundColor Red
    $script:failed++
  }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " FLOWOS Health Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Step "API compilavel (nest build)" {
  Push-Location "$root\apps\api"
  npm run build 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "build api falhou" }
  Pop-Location
}

Step "Web compilavel (next build)" {
  Push-Location "$root\apps\web"
  npm run build 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "build web falhou" }
  Pop-Location
}

Step "API online (porta 4000)" {
  $r = Invoke-RestMethod "http://localhost:4000/v1/observability/health" -TimeoutSec 5
  if ($r.status -ne "ok") { throw "health nao ok" }
}

Step "Smoke test endpoints" {
  & "$root\scripts\smoke-test.ps1"
  if ($LASTEXITCODE -ne 0) { throw "smoke-test falhou" }
}

Step "Follow-up D+1 (apos seed)" {
  Push-Location "$root"
  npm run db:seed 2>&1 | Out-Null
  node "$root\scripts\check-followup-eligibility.js" 2>&1 | Out-Host
  $base = "http://localhost:4000/v1"
  $login = Invoke-RestMethod "$base/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@flowos.local","password":"admin12345"}'
  $h = @{ Authorization = "Bearer $($login.accessToken)" }
  $p = Invoke-RestMethod "$base/automation/followup-d1/preview" -Headers $h
  if ($p.eligible -lt 1) {
    throw "nenhum lead elegivel apos seed (rode manualmente se necessario)"
  }
  $run = Invoke-RestMethod "$base/automation/followup-d1/leads/$($p.leadIds[0])/run" -Method POST -Headers $h
  if ($run.status -ne "succeeded") { throw "run retornou $($run.status)" }
}

Step "Redis acessivel" {
  Push-Location "$root\apps\api"
  node -e "const Redis=require('ioredis'); const r=new Redis(process.env.REDIS_URL||'redis://localhost:6379',{maxRetriesPerRequest:1,lazyConnect:true}); r.connect().then(()=>r.ping()).then(p=>{if(p!=='PONG')throw new Error(p); return r.quit();}).catch(e=>{console.error(e);process.exit(1)});" 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "redis indisponivel" }
  Pop-Location
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Resultado: $passed etapas OK, $failed falhas" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "========================================" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 }
