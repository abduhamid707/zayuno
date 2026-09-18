import https from 'node:https';

const TUNNEL_HEALTH_URL = process.env.TUNNEL_URL || 'https://wedding-watches-river-printable.trycloudflare.com/health';

console.log(`[KeepAlive] Active keep-alive daemon started for: ${TUNNEL_HEALTH_URL}`);
console.log(`[KeepAlive] Pinging every 15 seconds to prevent idle timeout and connection drop...`);

function ping() {
  const req = https.get(TUNNEL_HEALTH_URL, { timeout: 8000 }, (res) => {
    let raw = '';
    res.on('data', chunk => { raw += chunk; });
    res.on('end', () => {
      const now = new Date().toLocaleTimeString();
      if (res.statusCode === 200) {
        console.log(`[${now}] [KeepAlive PASS] HTTP 200 OK — Tunnel connection solid`);
      } else {
        console.warn(`[${now}] [KeepAlive WARN] HTTP ${res.statusCode}`);
      }
    });
  });

  req.on('error', (err) => {
    const now = new Date().toLocaleTimeString();
    console.error(`[${now}] [KeepAlive ERROR] Ping failed: ${err.message}`);
  });

  req.on('timeout', () => {
    req.destroy();
    const now = new Date().toLocaleTimeString();
    console.error(`[${now}] [KeepAlive TIMEOUT] Request timed out`);
  });
}

// Initial ping then every 15 seconds
ping();
setInterval(ping, 15000);
