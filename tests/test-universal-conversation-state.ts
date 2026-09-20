import assert from 'node:assert/strict';
import { emptyConversationState } from '../packages/contracts/src/conversation';
import { conversationRequirements, validateSlot, writeField } from '../packages/shared/src/conversation-requirements';
import { ConversationStore } from '../apps/api/src/modules/consumer/chat/conversation-store';
import { RedisService } from '../apps/api/src/common/services/redis.service';

async function main() {
  for (const fields of [ ['checkIn', 'checkOut', 'guests'], ['origin', 'destination', 'weight'], ['timeSlot'], ['plan'], ['application'] ]) {
    const state = emptyConversationState();
    state.manifest = { version: 1, requirements: { QUOTE: { parametersSchema: {
      type: 'object', properties: Object.fromEntries(fields.map(key => [key, { type: 'string', title: `Label ${key}` }])),
      required: fields, additionalProperties: false } } }, customerRequirements: { email: 'REQUIRED', phone: 'NOT_NEEDED' } };
    const missing = conversationRequirements(state);
    assert.deepEqual(missing.map(field => field.path), fields.map(key => `parameters.${key}`));
    for (const field of missing) { assert.ok(validateSlot(field, 'value')); writeField(state, field.path, 'value'); }
    assert.equal(conversationRequirements(state).length, 0);
    assert.deepEqual(conversationRequirements(state, 'ACTION_CREATE').map(field => field.path), ['customer.email']);
  }
  assert.throws(() => writeField({}, '__proto__.polluted', true));
  const state = emptyConversationState();
  state.manifest = { version: 1, supportedLocationRoles: [{ role: 'SOURCE', required: true }] };
  assert.equal(conversationRequirements(state)[0].type, 'location');
  state.locations.push({ role: 'SOURCE', address: { raw: 'Address' } });
  assert.equal(conversationRequirements(state).length, 0);
  process.env.REDIS_URL = process.env.UNIVERSAL_TEST_REDIS_URL || 'redis://127.0.0.1:16379';
  const redis = new RedisService();
  redis.onModuleInit();
  await new Promise<void>((resolve, reject) => { redis.getClient().once('ready', resolve); redis.getClient().once('error', reject); });
  try {
    const store = new ConversationStore(redis);
    const user = `test-${Date.now()}`;
    await store.run(user, 'one', async (s, save) => { s.quantity = 2; s.providerSlug = 'new-provider'; await save();
      await assert.rejects(() => store.run(user, 'one', async () => null), /another message/); });
    await new ConversationStore(redis).run(user, 'one', async s => { assert.equal(s.quantity, 2); assert.equal(s.providerSlug, 'new-provider'); });
    await store.run(user, 'two', async s => assert.equal(s.quantity, 1));
    await store.run(`${user}-other`, 'one', async s => assert.equal(s.providerSlug, undefined));
    redis.onModuleDestroy();
    await assert.rejects(() => store.run(user, 'one', async () => null), /unavailable/);
  } finally { redis.onModuleDestroy(); }
  console.log('PASS: schema slots, generic roles, restart persistence, tenant/session isolation, concurrent lock, Redis fail closed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
