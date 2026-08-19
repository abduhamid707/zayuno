import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encrypts a plaintext string (e.g. provider API secret or token) using AES-256-GCM.
 * Output format: hex(iv):hex(tag):hex(ciphertext)
 */
export function encryptSecret(plainText: string, keyHex: string): string {
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (64 characters).');
  }
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload.
 */
export function decryptSecret(encryptedPayload: string, keyHex: string): string {
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (64 characters).');
  }
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format.');
  }

  const [ivHex, authTagHex, cipherTextHex] = parts;
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherTextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates an HMAC SHA-256 signature for a payload.
 */
export function generateHmacSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verifies an HMAC SHA-256 signature using constant-time comparison to prevent timing attacks.
 */
export function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = generateHmacSignature(payload, secret);
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Generates a high-entropy API key.
 * Format: zy_live_<random_bytes> or zy_test_<random_bytes>
 */
export function generateApiKey(isLive = true): { rawKey: string; keyHash: string; keyPrefix: string } {
  const prefix = isLive ? 'zy_live_' : 'zy_test_';
  const randomPart = crypto.randomBytes(24).toString('base64url');
  const rawKey = `${prefix}${randomPart}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.substring(0, 16) + '...';

  return { rawKey, keyHash, keyPrefix };
}

/**
 * Hashes an API key with SHA-256 before database lookup/storage.
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generates a readable public reference ID for actions.
 * e.g., "ZY-SANDBOX-98421" or "ZY-ACT-12345"
 */
export function generatePublicActionId(providerSlug: string): string {
  const segment = providerSlug.split('-')[0] || providerSlug;
  const cleanSlug = segment.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  return `ZY-${cleanSlug}-${randomDigits}`;
}

export function generatePublicOrderId(providerSlug: string): string {
  return generatePublicActionId(providerSlug);
}
