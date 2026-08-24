import http from 'http';
import https from 'https';
import { lookup as dnsLookup } from 'dns';
import { lookup as dnsLookupPromise } from 'dns/promises';
import { isIP } from 'net';

export function isPrivateOrReservedIp(addr: string): boolean {
  const value = addr.toLowerCase().trim();
  return (
    value === 'localhost' ||
    value === '::1' ||
    value === '0.0.0.0' ||
    /^127\./.test(value) ||
    /^10\./.test(value) ||
    /^192\.168\./.test(value) ||
    /^169\.254\./.test(value) || // AWS / GCP / Azure link-local and cloud metadata
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(value) ||
    value.startsWith('fc') ||
    value.startsWith('fd') ||
    value.startsWith('fe80:') ||
    value.startsWith('::ffff:127.') ||
    value.startsWith('::ffff:10.') ||
    value.startsWith('::ffff:192.168.') ||
    value.startsWith('::ffff:169.254.') ||
    /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./.test(value)
  );
}

export function isCloudMetadataHost(host: string): boolean {
  const h = host.toLowerCase().trim();
  return (
    h === '169.254.169.254' ||
    h === 'metadata.google.internal' ||
    h === 'instance-data' ||
    h.endsWith('.metadata.google.internal') ||
    /^169\.254\./.test(h)
  );
}

export interface SsrfSafeGetResult {
  statusCode: number;
  body: string;
  latencyMs: number;
}

export class SsrfSecurityError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'SsrfSecurityError';
    this.code = code;
  }
}

/**
 * Performs a strictly secure, anti-DNS-rebinding, streamed HTTP/HTTPS GET request.
 * - Rejects any private, loopback, or cloud metadata target in production/staging.
 * - Checks DNS resolutions at socket creation time to eliminate TOCTOU / rebinding attacks.
 * - Streams chunks and destroys socket immediately if response body exceeds maxBytes (64KB).
 * - Imposes hard 5000ms timeout with immediate abort.
 */
export async function executeSsrfSafeGet(
  rawUrl: string,
  headers: Record<string, string>,
  options: { timeoutMs?: number; maxBytes?: number; allowLocalDev?: boolean } = {}
): Promise<SsrfSafeGetResult> {
  const timeoutMs = options.timeoutMs || 5000;
  const maxBytes = options.maxBytes || 65536;
  const isDevOrTest = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging';
  const allowLocalDev = Boolean(options.allowLocalDev && isDevOrTest);

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfSecurityError('INVALID_URL', 'Noto‘g‘ri URL formati kiritildi.');
  }

  if (parsed.username || parsed.password) {
    throw new SsrfSecurityError('INVALID_URL', 'URL ichida username yoki password bo‘lishi taqiqlangan.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isCloudMetadataHost(hostname)) {
    throw new SsrfSecurityError('FORBIDDEN_ADDRESS', 'Cloud metadata manziliga murojaat qilish taqiqlangan.');
  }

  const isHttps = parsed.protocol === 'https:';
  const isHttp = parsed.protocol === 'http:';

  if (!isHttps && !isHttp) {
    throw new SsrfSecurityError('INVALID_URL', 'Faqat HTTP yoki HTTPS protokoli qo‘llab-quvvatlanadi.');
  }

  if (process.env.NODE_ENV === 'production' && !isHttps) {
    throw new SsrfSecurityError('INVALID_URL', 'Production muhitida faqat xavfsiz HTTPS protokoli qabul qilinadi.');
  }

  const isExplicitLocalHost = ['localhost', '127.0.0.1', '::1'].includes(hostname);

  // Pre-resolve DNS
  if (!allowLocalDev || !isExplicitLocalHost) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new SsrfSecurityError('FORBIDDEN_ADDRESS', 'Private yoki loopback IP manzillariga murojaat qilish bloklangan.');
    }

    try {
      const resolved = isIP(hostname) ? [{ address: hostname }] : await dnsLookupPromise(hostname, { all: true, verbatim: true });
      if (!resolved.length || resolved.some(r => isPrivateOrReservedIp(r.address) || isCloudMetadataHost(r.address))) {
        throw new SsrfSecurityError('FORBIDDEN_ADDRESS', 'Domen ichki tarmoq yoki cloud metadata IP manziliga yo‘naltirilgan.');
      }
    } catch (err: any) {
      if (err instanceof SsrfSecurityError) throw err;
      throw new SsrfSecurityError('UNREACHABLE', 'DNS tekshiruvi muvaffaqiyatsiz: domen topilmadi.');
    }
  }

  const client = isHttps ? https : http;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout | null = null;
    let finished = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
    };

    const req = client.request(
      parsed,
      {
        method: 'GET',
        headers: {
          ...headers,
          'User-Agent': 'Zayuno-Preflight-Checker/1.0',
          'Accept': 'application/json'
        },
        lookup: (host, opts, cb) => {
          dnsLookup(host, opts, (err, address, family) => {
            if (err) return cb(err, address, family);
            const addrs = Array.isArray(address) ? address : [{ address, family }];
            for (const item of addrs) {
              const addrStr = typeof item === 'string' ? item : item.address;
              if (isCloudMetadataHost(addrStr)) {
                return cb(new SsrfSecurityError('FORBIDDEN_ADDRESS', 'DNS cloud metadata manziliga yo‘naltirildi.'), address, family);
              }
              if ((!allowLocalDev || !isExplicitLocalHost) && isPrivateOrReservedIp(addrStr)) {
                return cb(new SsrfSecurityError('FORBIDDEN_ADDRESS', 'DNS ichki tarmoq IP manziliga yo‘naltirildi.'), address, family);
              }
            }
            cb(null, address, family);
          });
        }
      },
      res => {
        let totalBytes = 0;
        let responseBody = '';

        res.on('data', chunk => {
          totalBytes += chunk.length;
          if (totalBytes > maxBytes) {
            if (!finished) {
              finished = true;
              cleanup();
              const err = new SsrfSecurityError('SCHEMA_MISMATCH', `Server javobi hajmi ${maxBytes} baytdan oshdi.`);
              try { req.destroy(); } catch {}
              try { res.destroy(); } catch {}
              reject(err);
            }
            return;
          }
          responseBody += chunk.toString('utf8');
        });

        res.on('end', () => {
          cleanup();
          if (finished) return;
          finished = true;
          resolve({
            statusCode: res.statusCode || 200,
            body: responseBody,
            latencyMs: Date.now() - startTime
          });
        });

        res.on('error', err => {
          cleanup();
          if (finished) return;
          finished = true;
          reject(err);
        });
      }
    );

    timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      const err = new SsrfSecurityError('TIMEOUT', 'Server 5 soniya ichida javob bermadi (Timeout).');
      try { req.destroy(); } catch {}
      reject(err);
    }, timeoutMs);

    req.on('socket', socket => {
      socket.on('connect', () => {
        const remoteIp = socket.remoteAddress || '';
        if (isCloudMetadataHost(remoteIp)) {
          if (!finished) {
            finished = true;
            cleanup();
            const err = new SsrfSecurityError('FORBIDDEN_ADDRESS', 'Cloud metadata IP manziliga ulanish bloklandi.');
            try { req.destroy(); } catch {}
            reject(err);
          }
          return;
        }
        if ((!allowLocalDev || !isExplicitLocalHost) && isPrivateOrReservedIp(remoteIp)) {
          if (!finished) {
            finished = true;
            cleanup();
            const err = new SsrfSecurityError('FORBIDDEN_ADDRESS', 'Ichki tarmoq IP manziliga ulanish bloklandi.');
            try { req.destroy(); } catch {}
            reject(err);
          }
        }
      });
    });

    req.on('error', err => {
      cleanup();
      if (finished) return;
      finished = true;
      reject(err);
    });

    req.end();
  });
}
