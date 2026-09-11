import assert from 'node:assert/strict';
import { ConsumerAuthService } from '../apps/api/src/modules/consumer/auth/consumer-auth.service';
import { prisma } from '../packages/database/src/client';
import { normalizeEmailCode, normalizeLoginEmail, validLoginEmail, resendSecondsRemaining } from '../apps/mobile/src/lib/email-auth';

async function main() {
  assert.equal(normalizeLoginEmail(' HELLO@Example.com '), 'hello@example.com');
  for (const invalid of ['', 'a@', 'a@b', 'a b@example.com']) assert.equal(validLoginEmail(invalid), false);
  assert.equal(normalizeEmailCode('12 3-45\n'), '12345');
  assert.equal(resendSecondsRemaining(61_000, 1000), 60);
  assert.equal(resendSecondsRemaining(1000, 61_000), 0);
  const values = new Map<string, string>();
  const client: any = {
    get: async (k: string) => values.get(k) || null,
    set: async (k: string, v: string, _ex?: string, _ttl?: number, nx?: string) => { if (nx && values.has(k)) return null; values.set(k, v); return 'OK'; },
    ttl: async (k: string) => values.has(k) ? 60 : -2,
    del: async (...keys: string[]) => { keys.forEach(k => values.delete(k)); return 1; },
    incr: async (k: string) => { const n = Number(values.get(k) || 0) + 1; values.set(k, String(n)); return n; },
    expire: async () => 1,
    eval: async (_script: string, _count: number, key: string, token: string) => { if (values.get(key) === token) values.delete(key); return 1; },
    multi: () => { const operations: Array<() => Promise<any>> = []; const chain: any = { set: (...args: any[]) => { operations.push(() => client.set(...args)); return chain; }, del: (...args: any[]) => { operations.push(() => client.del(...args)); return chain; }, exec: async () => Promise.all(operations.map(async fn => [null, await fn()])) }; return chain; },
  };
  const service: any = new ConsumerAuthService({} as any, { getClient: () => client } as any);
  const originalUpsert = prisma.user.upsert;
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  try {
    delete process.env.RESEND_API_KEY;
    await assert.rejects(() => service.deliverEmailOtp('fixture@example.com', '12345'), /vaqtincha/);
    process.env.RESEND_API_KEY = 'test-only-not-a-real-key';
    globalThis.fetch = (async () => new Response(JSON.stringify({ message: 'domain rejected' }), { status: 403 })) as any;
    await assert.rejects(() => service.sendEmailOtp('failure@example.com'), /yuborilmadi/);
    assert.equal(values.has('consumer:otp:code:failure@example.com'), false);
    assert.equal(values.has('consumer:otp:sent:failure@example.com'), false, 'delivery error must allow retry');
    globalThis.fetch = (async () => new Response('{}', { status: 200 })) as any;
    await assert.rejects(() => service.deliverEmailOtp('fixture@example.com', '12345'), /yuborilmadi/);
    const delivered = new Map<string, string>();
    service.deliverEmailOtp = async (email: string, code: string) => { assert.match(code, /^\d{5}$/); delivered.set(email, code); };
    (prisma.user as any).upsert = async () => ({ id: 'fixture-user', email: 'fixture@example.com' });
    let sessions = 0;
    service.issueSession = async () => { sessions++; return { accessToken: 'fixture' }; };
    await assert.rejects(() => service.sendEmailOtp('bad@'), /email/);
    const sendResults = await Promise.allSettled([service.sendEmailOtp('fixture@example.com'), service.sendEmailOtp('fixture@example.com')]);
    assert.equal(sendResults.filter(result => result.status === 'fulfilled').length, 1, 'duplicate sends must coalesce through lock');
    assert.notEqual(values.get('consumer:otp:code:fixture@example.com'), delivered.get('fixture@example.com'), 'store digest, not raw code');
    await assert.rejects(() => service.sendEmailOtp('fixture@example.com'), /daqiqa/);
    const verified = await Promise.allSettled([service.verifyEmailOtp('FIXTURE@example.com', delivered.get('fixture@example.com')), service.verifyEmailOtp('fixture@example.com', delivered.get('fixture@example.com'))]);
    assert.equal(verified.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(sessions, 1);
    await assert.rejects(() => service.verifyEmailOtp('fixture@example.com', delivered.get('fixture@example.com')), /muddati/);
    await service.sendEmailOtp('attempts@example.com');
    for (let i = 0; i < 5; i++) await assert.rejects(() => service.verifyEmailOtp('attempts@example.com', '00000'));
    assert.equal(values.has('consumer:otp:code:attempts@example.com'), false);
    await service.sendEmailOtp('retry@example.com');
    service.issueSession = async () => { throw new Error('DB temporarily unavailable'); };
    await assert.rejects(() => service.verifyEmailOtp('retry@example.com', delivered.get('retry@example.com')));
    assert.equal(values.has('consumer:otp:code:retry@example.com'), true, 'session failure must preserve valid code');
    const unavailable: any = new ConsumerAuthService({} as any, { getClient: () => undefined } as any);
    await assert.rejects(() => unavailable.sendEmailOtp('fixture@example.com'), /vaqtincha/);
    console.log('Email OTP: input/paste, delivery failures, cooldown, concurrent requests, attempt limit, single use and session recovery PASS');
  } finally {
    (prisma.user as any).upsert = originalUpsert;
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
