import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

const operations = read('docs/provider-operations.md');
const apiReference = read('docs/api-reference.md');
const changelog = read('docs/CHANGELOG.md');
const observability = read('docs/operations-observability.md');
const authentication = read('docs/authentication.md');
const providerController = read('apps/api/src/modules/providers/providers.controller.ts');
const adminController = read('apps/api/src/modules/admin/admin.controller.ts');
const adminUi = read('apps/admin/src/App.tsx');

for (const required of [
  'GET /api/v1/providers/me/dashboard',
  'GET /api/v1/providers/me/actions/:actionId',
  'paymentStatusSource',
  'PROVIDER_REPORTED',
  'CHANGES_REQUESTED',
  'requiredChanges',
  'GET /api/v1/admin/providers',
  'pnpm test:docs-contract'
]) {
  assert.ok(operations.includes(required), `provider-operations.md is missing: ${required}`);
}

for (const required of ['GET /providers/me/dashboard', 'GET /providers/me/actions/:actionId', 'POST /admin/providers/:slug/review', 'POST /admin/providers/:slug/reopen']) {
  assert.ok(apiReference.includes(required), `api-reference.md is missing: ${required}`);
}

assert.match(providerController, /@Get\('me\/dashboard'\)/, 'Provider dashboard route is missing.');
assert.match(providerController, /@Get\('me\/actions\/:actionId'\)/, 'Provider action detail route is missing.');
assert.match(adminController, /REQUEST_CHANGES/, 'Structured moderation route is missing.');
assert.ok(changelog.includes('provider-scoped action'), 'Contract changelog is missing this release.');
assert.ok(observability.includes('GET /api/v1/admin/logs/events'));
assert.ok(observability.includes('GET /api/v1/admin/logs/export'));
assert.ok(observability.includes('PostHog is not part of this implementation'));
assert.ok(authentication.includes('PROVIDER_API_KEY'));
assert.ok(authentication.includes('ZAYUNO_WEBHOOK_SECRET'));

const deploymentDoc = read('docs/deployment.md');
assert.ok(deploymentDoc.includes('PROD_HOST'), 'docs/deployment.md is missing PROD_HOST');
assert.ok(deploymentDoc.includes('PROD_SSH_KEY'), 'docs/deployment.md is missing PROD_SSH_KEY');
assert.ok(deploymentDoc.includes('PROD_KNOWN_HOSTS'), 'docs/deployment.md is missing PROD_KNOWN_HOSTS');
assert.ok(deploymentDoc.includes('pnpm db:migrate:deploy'), 'docs/deployment.md is missing db:migrate:deploy');
assert.ok(deploymentDoc.includes('scripts/deploy-production.ps1'), 'docs/deployment.md is missing fallback script reference');
assert.ok(observability.includes('.current_release_sha'), 'docs/operations-observability.md is missing release state tracking');
assert.ok(changelog.includes('GHCR immutable container images'), 'docs/CHANGELOG.md is missing GHCR deployment entry');

const publicPagesController = read('apps/api/src/modules/public-pages/public-pages.controller.ts');
assert.ok(publicPagesController.includes('@Get(\'robots.txt\')'), 'PublicPagesController is missing robots.txt endpoint.');
assert.ok(publicPagesController.includes('@Get(\'sitemap.xml\')'), 'PublicPagesController is missing sitemap.xml endpoint.');
assert.ok(publicPagesController.includes('https://schema.org'), 'PublicPagesController is missing JSON-LD schema definitions.');
assert.ok(publicPagesController.includes('canonicalUrl'), 'PublicPagesController is missing canonical URL logic.');
assert.ok(publicPagesController.includes('google-site-verification'), 'PublicPagesController is missing google-site-verification.');
assert.ok(publicPagesController.includes('yandex-verification'), 'PublicPagesController is missing yandex-verification.');
assert.ok(publicPagesController.includes('yandex_f58af2445b7b4bbf.html'), 'PublicPagesController is missing Yandex verification file endpoint.');
assert.ok(changelog.includes('Technical SEO'), 'CHANGELOG is missing Technical SEO entry.');

assert.ok(!adminUi.includes('href="http://localhost:4000/api/docs"'), 'Production-facing Swagger link is hardcoded to localhost.');
assert.ok(!adminUi.includes('href="http://localhost:4001/api/v1/info"'), 'Production-facing sandbox link is hardcoded to localhost.');

console.log('Documentation and SEO contract checks passed.');


