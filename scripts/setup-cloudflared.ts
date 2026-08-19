import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';

const BIN_DIR = path.join(process.cwd(), 'bin');
const CLOUDFLARED_EXE = path.join(BIN_DIR, 'cloudflared.exe');

async function ensureCloudflared(): Promise<string> {
  if (fs.existsSync(CLOUDFLARED_EXE)) {
    return CLOUDFLARED_EXE;
  }

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  console.log('⬇️ Downloading official cloudflared binary for Windows x64...');
  const downloadUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
  
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`Failed to download cloudflared: HTTP ${res.status}`);

  const buffer = await res.arrayBuffer();
  fs.writeFileSync(CLOUDFLARED_EXE, Buffer.from(buffer));
  console.log('✅ Cloudflared binary downloaded successfully to bin/cloudflared.exe!');
  return CLOUDFLARED_EXE;
}

export function startCloudflareTunnel(port: number): Promise<{ url: string; process: any }> {
  return new Promise(async (resolve, reject) => {
    try {
      const exe = await ensureCloudflared();
      console.log(`🌐 Launching Cloudflare Tunnel for port ${port}...`);

      const child = spawn(exe, ['tunnel', '--url', `http://localhost:${port}`], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let foundUrl = false;

      const handleOutput = (data: Buffer) => {
        const text = data.toString();
        // Look for https://....trycloudflare.com
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !foundUrl) {
          foundUrl = true;
          const url = match[0];
          console.log(`✨ Cloudflare Tunnel Active: ${url} -> http://localhost:${port}`);
          resolve({ url, process: child });
        }
      };

      child.stdout.on('data', handleOutput);
      child.stderr.on('data', handleOutput);

      child.on('error', (err) => {
        if (!foundUrl) reject(err);
      });

      child.on('exit', (code) => {
        if (!foundUrl) reject(new Error(`cloudflared exited with code ${code} before providing URL`));
      });

      setTimeout(() => {
        if (!foundUrl) reject(new Error('Timed out waiting for Cloudflare tunnel URL'));
      }, 20000);
    } catch (err) {
      reject(err);
    }
  });
}

if (require.main === module) {
  ensureCloudflared().catch(console.error);
}
