import { EventSource } from 'eventsource';

async function testEventSource() {
  const url = 'https://detail-directed-fabrics-skiing.trycloudflare.com/sse';
  console.log('Connecting to SSE:', url);
  
  const es = new EventSource(url);
  
  es.onopen = () => console.log('SSE Open!');
  es.onerror = (e: any) => console.error('SSE Error:', e);
  
  es.addEventListener('endpoint', (event: any) => {
    console.log('Received endpoint event data:', event.data);
    es.close();
  });
  
  setTimeout(() => {
    console.log('Timeout check');
    es.close();
  }, 5000);
}

testEventSource().catch(console.error);
