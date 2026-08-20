import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const testSuites = [
  // Prompt 1: Publishing Gate, Readiness, Reserved Brands
  'tests/test-publishing-gate-and-readiness.ts',
  'tests/test-reserved-brands.ts',

  // Prompt 2: Auth, Verification, Onboarding Journey
  'tests/test-auth-and-verification.ts',
  'tests/test-provider-onboarding-journey.ts',

  // Prompt 3: Certification Runner, Local Mock EVOS Terminal Protection
  'tests/test-sandbox-simulator-e2e.ts',
  'tests/test-mock-evos-e2e.ts',

  // Prompt 4: Redaction, Live Inspector, Unmet Demand, Catalog Media
  'tests/test-prompt-4-observability-inspector-media.ts',

  // Repair Prompts A & B: Credential-free dev logs, Durable Token/Demand DB Models, SafePublicHttpsUrl
  'tests/test-repair-prompts-a-and-b.ts',

  // Repair Prompt C: HTTP Boundary Regressions (Auth, Tenant Isolation, Discovery Gate, Mock EVOS State)
  'tests/test-http-boundary-regression.ts',

  // Platform Guardrails & State Machine
  'tests/test-action-state-machine.ts',
  'tests/test-action-guardrails.ts',
  'tests/test-webhook-guardrails.ts',
  'tests/test-mcp-tool-consistency.ts',
  'tests/test-location-and-quote-persistence.ts',
  'tests/test-sensitive-dynamic-parameters.ts',
  'tests/test-docs-contract.ts',
  'tests/test-provider-operations-guardrails.ts',
  'tests/test-poyez-sandbox-e2e.ts',
  'tests/test-customer-experience-and-presenter.ts',
  'tests/test-coffee-time-availability-and-customer-mode.ts',
  'tests/test-action-quote-deduplication-tenant-isolation.ts',
  'tests/test-telegram-recruitment-provider.ts'
];

async function main() {
  console.log('================================================================');
  console.log('🚀 RUNNING ALL REVIEW & REGRESSION TEST SUITES (PROMPTS 1-4 + REPAIRS A, B, C)');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;
  const failedSuites: string[] = [];
  const startTime = Date.now();

  for (const suite of testSuites) {
    const fullPath = resolve(process.cwd(), suite);
    console.log(`▶ Running ${suite}...`);
    const proc = spawnSync('pnpm', ['tsx', fullPath], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ENABLE_DEV_TOKEN_HELPER: 'true'
      }
    });

    if (proc.status === 0) {
      passedCount++;
      console.log(`✅ ${suite} PASSED\n`);
    } else {
      failedCount++;
      failedSuites.push(suite);
      console.error(`❌ ${suite} FAILED with exit code ${proc.status}\n`);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('================================================================');
  console.log(`📊 TEST RUN COMPLETE in ${durationSec}s`);
  console.log(`   Passed: ${passedCount} / ${testSuites.length}`);
  console.log(`   Failed: ${failedCount} / ${testSuites.length}`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    console.error('❌ Failed suites:\n' + failedSuites.map(s => ` - ${s}`).join('\n'));
    process.exit(1);
  } else {
    console.log('🎉 ALL REVIEW AND REGRESSION TEST SUITES PASSED CLEANLY!');
  }
}

main().catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
