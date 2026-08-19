import assert from 'node:assert/strict';
import { ProvidersService } from '../apps/api/src/modules/providers/providers.service';

process.env.NODE_ENV = 'production';
const service = new ProvidersService({} as any);
const validate = (value: string) => (service as any).validateRemoteBaseUrl(value);

await assert.rejects(() => validate('http://api.example.com'), /must use HTTPS/i);
await assert.rejects(() => validate('https://127.0.0.1:4000'), /public IP/i);
await assert.rejects(() => validate('https://localhost:4000'), /private integration hosts/i);
await assert.rejects(() => validate('https://user:password@example.com'), /must not be embedded/i);
assert.equal(await validate('https://coffee-time-sandbox.shopla.uz/'), 'https://coffee-time-sandbox.shopla.uz');

console.log('Provider integration URL guard tests passed.');
