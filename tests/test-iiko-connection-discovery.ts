import assert from 'node:assert/strict';
import { IikoConnectionsService } from '../apps/api/src/modules/providers/iiko-connections.service';

async function main() {
  const service = new IikoConnectionsService({} as any);
  let upstreamCalls = 0;
  (service as any).client = () => ({
    getOrganizations: async () => { upstreamCalls++; return [{ id: 'org-1', name: 'Restaurant', currencyIsoName: 'UZS', restaurantAddress: 'Toshkent' }]; },
    getTerminalGroups: async () => [{ id: 'group-1', organizationId: 'org-1', name: 'Main group' }],
    getExternalMenus: async () => [{ id: 'menu-1', name: 'Public menu' }]
  });

  await assert.rejects(service.discover({}), /API kaliti|apiLogin/);
  await assert.rejects(service.discover({ apiLogin: 'test', unexpectedSecret: 'no' }), /Unrecognized key/);
  assert.equal(upstreamCalls, 0, 'Invalid input must not contact iiko');

  const result = await service.discover({ apiLogin: 'test', appId: '11111111-1111-4111-8111-111111111111', clientSecret: 'secret' });
  assert.deepEqual(result.organizations, [{ id: 'org-1', name: 'Restaurant', currency: 'UZS', address: 'Toshkent' }]);
  assert.deepEqual(result.terminalGroups, [{ id: 'group-1', organizationId: 'org-1', name: 'Main group' }]);
  assert.deepEqual(result.externalMenus, [{ id: 'menu-1', name: 'Public menu' }]);
  assert.equal(JSON.stringify(result).includes('secret'), false, 'Discovery must never return credentials');
  console.log('iiko connection discovery guards: PASS');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
