/**
 * Extracts client IP safely:
 * - Uses Express `req.ip` if trust proxy is configured.
 * - If directly connected without trusted proxy, uses `req.socket.remoteAddress` and rejects spoofed headers.
 */
export function extractClientIp(req: any): string {
  if (req?.ip && typeof req.ip === 'string' && req.ip.length > 0) {
    return req.ip;
  }

  const socketAddr = req?.socket?.remoteAddress || req?.connection?.remoteAddress;
  if (!socketAddr) return '127.0.0.1';

  const isLoopbackOrPrivate =
    socketAddr === '127.0.0.1' ||
    socketAddr === '::1' ||
    socketAddr === '::ffff:127.0.0.1' ||
    socketAddr.startsWith('10.') ||
    socketAddr.startsWith('192.168.') ||
    socketAddr.startsWith('172.');

  if (isLoopbackOrPrivate && req?.headers?.['x-forwarded-for']) {
    const xff = req.headers['x-forwarded-for']
      .toString()
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (xff.length > 0) {
      // Rightmost address appended by trusted proxy is the real client IP
      return xff[xff.length - 1];
    }
  }

  return socketAddr;
}
