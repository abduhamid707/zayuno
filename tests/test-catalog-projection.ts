import assert from 'node:assert/strict';
import { projectCatalog, projectOffering } from '../packages/shared/src/catalog-projection';
import { ProviderManifestSchema } from '../packages/contracts/src/provider-manifest';

const offering = { id: 'a', title: 'Choice', basePrice: 10, currency: 'UZS', metadata: { raw: 'large' },
  variants: [{ id: 'v1', name: 'One', basePrice: 12, metadata: { private: 1 } }, { id: 'v2', name: 'Two', basePrice: 15 }] };
const original = JSON.stringify(offering);
assert.equal(projectOffering(offering), offering);
assert.deepEqual(projectOffering(offering, { select: ['id', 'variants.id', 'variants.name'] }),
  { id: 'a', variants: [{ id: 'v1', name: 'One' }, { id: 'v2', name: 'Two' }] });
assert.equal(projectOffering(offering, { responseProfile: 'MINIMAL' }).metadata, undefined);
assert.equal(projectOffering(offering, { responseProfile: 'COMPACT' }).variants[0].metadata, undefined);
assert.equal(projectCatalog({ offerings: [offering], version: '1' }, { select: ['title'] }).version, '1');
assert.deepEqual(projectCatalog([offering], { select: ['title'] }), [{ title: 'Choice' }]);
assert.throws(() => projectOffering(offering, { select: ['constructor.prototype'] }));
assert.throws(() => projectOffering(offering, { responseProfile: 'INVALID' as any }));
assert.equal(JSON.stringify(offering), original);
assert.deepEqual(ProviderManifestSchema.parse({ version: 1, branding: { displayName: 'New provider', brandColor: '#012345', secret: 'discard' } }).branding,
  { displayName: 'New provider', brandColor: '#012345' });
console.log('PASS: projection profiles, nested arrays, safe select, canonical immutability, branding allowlist');
