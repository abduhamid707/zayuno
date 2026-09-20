import type { ProxyOptions } from 'vite';

export function devApiProxy(target: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    cookieDomainRewrite: '',
    configure(proxy) {
      proxy.on('proxyRes', response => {
        // Development runs over local HTTP. Keep HttpOnly, SameSite and Path,
        // but allow upstream production cookies on this local origin.
        const cookies = response.headers['set-cookie'];
        if (cookies) response.headers['set-cookie'] = cookies.map(cookie => cookie.replace(/;\s*Secure\b/gi, ''));
      });
    },
  };
}
