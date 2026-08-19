/**
 * Production seeding is intentionally disabled.
 *
 * Production data must be changed with reviewed, idempotent registration or
 * migration scripts. To register the demo provider, run:
 *
 *   pnpm exec tsx scripts/register-mock-evos.ts
 */

throw new Error(
  'Generic production seeding is disabled. Use scripts/register-mock-evos.ts for the scoped Mock EVOS upsert.',
);
