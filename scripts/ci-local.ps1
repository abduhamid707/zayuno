# ==============================================================================
# Zayuno Local CI Validation Script (PowerShell)
# Run all CI checks locally before pushing or triggering deployment
# ==============================================================================

$ErrorActionPreference = 'Stop'

function Assert-LastCommand([string]$message) {
  if ($LASTEXITCODE -ne 0) { throw $message }
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "🚀 Running Zayuno Local CI Suite" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

Write-Host "`n1. Generating Prisma client..." -ForegroundColor Yellow
pnpm db:generate
Assert-LastCommand "Prisma generation failed."

Write-Host "`n2. Running Linting & Typecheck..." -ForegroundColor Yellow
pnpm lint
Assert-LastCommand "Linting failed."

Write-Host "`n3. Running Documentation Contract Test..." -ForegroundColor Yellow
pnpm test:docs-contract
Assert-LastCommand "Docs contract test failed."

Write-Host "`n4. Running Action & Guardrail Tests..." -ForegroundColor Yellow
pnpm test:action-guardrails
Assert-LastCommand "Action guardrails test failed."
pnpm test:action-state-machine
Assert-LastCommand "Action state machine test failed."
pnpm test:location-and-quote-persistence
Assert-LastCommand "Location & quote persistence test failed."
pnpm test:webhook-guardrails
Assert-LastCommand "Webhook guardrails test failed."
pnpm test:dynamic-provider-context
Assert-LastCommand "Dynamic provider context test failed."
pnpm test:sensitive-dynamic-parameters
Assert-LastCommand "Sensitive dynamic parameters test failed."
pnpm test:provider-operations
Assert-LastCommand "Provider operations test failed."
pnpm test:mcp-tool-consistency
Assert-LastCommand "MCP tool consistency test failed."

Write-Host "`n5. Building Monorepo..." -ForegroundColor Yellow
pnpm build
Assert-LastCommand "Monorepo build failed."

Write-Host "`n✅ All Local CI Checks Passed Successfully!" -ForegroundColor Green
