import { startTunnel } from 'untun';

async function testUntun() {
  console.log('Testing untun Cloudflare tunnel for port 4002...');
  const tunnel = await startTunnel({ port: 4002 });
  const url = await tunnel.getURL();
  console.log('Untun Cloudflare URL:', url);
  
  const res = await fetch(`${url}/health`);
  const data = await res.json();
  console.log('Untun /health response:', data);
  
  await tunnel.close();
  console.log('Untun test completed successfully!');
}

testUntun().catch(console.error);
