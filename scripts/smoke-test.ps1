# FLOWOS smoke test - API endpoints
$ErrorActionPreference = "Stop"
$base = if ($env:API_URL) { $env:API_URL } else { "http://localhost:4000/v1" }
$email = "admin@flowos.local"
$pass = "admin12345"
$failed = 0
$passed = 0

function Test-Endpoint($name, $scriptBlock) {
  try {
    & $scriptBlock
    Write-Host "[OK] $name" -ForegroundColor Green
    $script:passed++
  } catch {
    Write-Host "[FAIL] $name - $($_.Exception.Message)" -ForegroundColor Red
    $script:failed++
  }
}

Write-Host "FLOWOS Smoke Test" -ForegroundColor Cyan

Test-Endpoint "health" {
  $r = Invoke-RestMethod "$base/observability/health"
  if ($r.status -ne "ok") { throw "status not ok" }
}

Test-Endpoint "login" {
  $script:login = Invoke-RestMethod "$base/auth/login" -Method POST -ContentType "application/json" -Body (@{ email = $email; password = $pass } | ConvertTo-Json)
  if (-not $script:login.accessToken) { throw "no token" }
}

$headers = @{ Authorization = "Bearer $($script:login.accessToken)" }

Test-Endpoint "dashboard kpis" {
  Invoke-RestMethod "$base/dashboard/kpis" -Headers $headers | Out-Null
}

Test-Endpoint "crm leads" {
  $l = Invoke-RestMethod "$base/crm/leads" -Headers $headers
  if ($l.Count -lt 1) { throw "no leads" }
  $script:leadId = $l[0].id
}

Test-Endpoint "crm pipeline" {
  Invoke-RestMethod "$base/crm/pipeline" -Headers $headers | Out-Null
}

Test-Endpoint "whatsapp conversations" {
  $c = Invoke-RestMethod "$base/whatsapp/conversations" -Headers $headers
  if ($c.Count -ge 1) { $script:convId = $c[0].id }
}

Test-Endpoint "quotes list" {
  Invoke-RestMethod "$base/quotes" -Headers $headers | Out-Null
}

Test-Endpoint "quotes catalog" {
  Invoke-RestMethod "$base/quotes/catalog?niche=cftv" -Headers $headers | Out-Null
}

Test-Endpoint "billing payments" {
  Invoke-RestMethod "$base/billing/payments" -Headers $headers | Out-Null
}

Test-Endpoint "billing overdue" {
  Invoke-RestMethod "$base/billing/overdue" -Headers $headers | Out-Null
}

Test-Endpoint "operations summary" {
  Invoke-RestMethod "$base/operations/summary" -Headers $headers | Out-Null
}

Test-Endpoint "operations runs" {
  Invoke-RestMethod "$base/operations/runs" -Headers $headers | Out-Null
}

Test-Endpoint "automation followup preview" {
  $p = Invoke-RestMethod "$base/automation/followup-d1/preview" -Headers $headers
  if (-not $p.leads) { throw "preview sem lista de leads" }
}

Test-Endpoint "automation followup scan" {
  $s = Invoke-RestMethod "$base/automation/followup-d1/scan" -Method POST -Headers $headers
  if (-not $s.jobId) { throw "scan sem jobId" }
}

Test-Endpoint "automation followup d7 preview" {
  $p = Invoke-RestMethod "$base/automation/followup-d7/preview" -Headers $headers
  if (-not $p.leads) { throw "d7 preview sem leads" }
}

Test-Endpoint "whatsapp evolution webhook" {
  $r = Invoke-RestMethod "$base/integrations/whatsapp/webhook/evolution" -Method POST -ContentType "application/json" -Body '{"data":{"key":{"fromMe":true}}}'
  if (-not $r.ok) { throw "webhook failed" }
}

Test-Endpoint "alerts rules" {
  Invoke-RestMethod "$base/operations/alerts/rules" -Headers $headers | Out-Null
}

Test-Endpoint "ai status" {
  Invoke-RestMethod "$base/ai/status" -Headers $headers | Out-Null
}

if ($script:convId) {
  Test-Endpoint "ai summary" {
    Invoke-RestMethod "$base/ai/conversations/$($script:convId)/summary" -Method POST -Headers $headers | Out-Null
  }
}

Test-Endpoint "ai classify" {
  Invoke-RestMethod "$base/ai/leads/$($script:leadId)/classify" -Method POST -Headers $headers | Out-Null
}

Test-Endpoint "marketplace templates" {
  Invoke-RestMethod "$base/marketplace/templates" -Headers $headers | Out-Null
}

Test-Endpoint "whitelabel branding" {
  Invoke-RestMethod "$base/whitelabel/branding" -Headers $headers | Out-Null
}

Test-Endpoint "scheduling" {
  Invoke-RestMethod "$base/scheduling/appointments" -Headers $headers | Out-Null
}

Test-Endpoint "postsale campaigns" {
  Invoke-RestMethod "$base/postsale/campaigns" -Headers $headers | Out-Null
}

Test-Endpoint "platform services" {
  Invoke-RestMethod "$base/platform/services" | Out-Null
}

Write-Host ""
Write-Host "Resultado: $passed OK, $failed FAIL" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
if ($failed -gt 0) { exit 1 }
