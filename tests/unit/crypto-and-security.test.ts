import {
  encryptSecret,
  decryptSecret,
  generateHmacSignature,
  verifyHmacSignature,
  hashApiKey,
  generateApiKey,
  generatePublicActionId
} from '../../packages/shared/src/crypto';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion Failed: ${msg}`);
}

async function runCryptoTests() {
  console.log('Testing AES-256-GCM encryption & decryption...');
  const key = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const secret = 'sandbox_super_secret_partner_token_9988';

  const encrypted = encryptSecret(secret, key);
  assert(encrypted.includes(':'), 'Encrypted payload must contain IV and AuthTag separators');

  const decrypted = decryptSecret(encrypted, key);
  assert(decrypted === secret, 'Decrypted secret must match original plain text');

  console.log('Testing HMAC-SHA256 signature generation and verification...');
  const payload = JSON.stringify({ event: 'action.status_updated', actionId: 'ZY-SANDBOX-123' });
  const webhookSecret = 'zy_webhook_secret_test_key';

  const sig = generateHmacSignature(payload, webhookSecret);
  assert(verifyHmacSignature(payload, sig, webhookSecret) === true, 'Valid signature must verify');
  assert(verifyHmacSignature(payload, 'wrong_signature_123', webhookSecret) === false, 'Invalid signature must fail');

  console.log('Testing API Key generation and hashing...');
  const keyObj = generateApiKey(true);
  assert(keyObj.rawKey.startsWith('zy_live_'), 'Live API key must start with zy_live_');
  assert(keyObj.keyHash === hashApiKey(keyObj.rawKey), 'Key hash must match SHA-256 computation');

  console.log('Testing Public Action ID generation...');
  const publicId = generatePublicActionId('sandbox-provider');
  assert(publicId.startsWith('ZY-SANDBOX-'), 'Action ID must start with ZY-SANDBOX-');

  console.log('✅ All Crypto and Security Unit Tests Passed!');
}

runCryptoTests().catch(err => {
  console.error('❌ Crypto test failed:', err);
  process.exit(1);
});
