#!/usr/bin/env bash
set -euo pipefail

echo "================================================="
echo "🚀 Running Zayuno Local CI Suite"
echo "================================================="

echo -e "\n1. Generating Prisma client..."
pnpm db:generate

echo -e "\n2. Running Linting & Typecheck..."
pnpm lint

echo -e "\n3. Running Documentation Contract Test..."
pnpm test:docs-contract

echo -e "\n4. Running Action & Guardrail Tests..."
pnpm test:action-guardrails
pnpm test:action-state-machine
pnpm test:location-and-quote-persistence
pnpm test:webhook-guardrails
pnpm test:dynamic-provider-context
pnpm test:sensitive-dynamic-parameters
pnpm test:provider-operations
pnpm test:mcp-tool-consistency

echo -e "\n5. Building Monorepo..."
pnpm build

echo -e "\n✅ All Local CI Checks Passed Successfully!"
