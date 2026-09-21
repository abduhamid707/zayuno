import assert from 'node:assert/strict';
import {
  connectorStatus,
  createRequestGate,
  formatSyncTime,
  integrationsUrl,
} from '../apps/provider-portal/src/integrations-model.ts';

const normalized = integrationsUrl(
  'https://developers.zayuno.uz/?tab=integrations&step=4&flow=provider-v2&provider=evoss',
  'evos',
);
assert.equal(normalized.searchParams.get('tab'), 'integrations');
assert.equal(normalized.searchParams.get('provider'), 'evos');
assert.equal(normalized.searchParams.has('step'), false);
assert.equal(normalized.searchParams.has('flow'), false);

assert.equal(connectorStatus('CONNECTED'), 'Ulangan');
assert.equal(connectorStatus('SYNCING'), 'Yangilanmoqda');
assert.equal(connectorStatus('ERROR'), 'Yangilashda xato');
assert.equal(connectorStatus('DISCONNECTED'), 'Ulanish uzilgan');

assert.equal(formatSyncTime(null), 'Hali yangilanmagan');
assert.equal(formatSyncTime('not-a-date'), 'Vaqt ma’lum emas');
assert.match(formatSyncTime('2026-09-21T09:54:01.000Z', 'uz-UZ', 'Asia/Tashkent'), /14:54/);

const gate = createRequestGate();
assert.equal(gate.enter('sync-1'), true);
assert.equal(gate.enter('sync-1'), false);
gate.leave('sync-1');
assert.equal(gate.enter('sync-1'), true);

console.log('Integrations view model tests: PASS');
