import 'dotenv/config';
import { createPoyezSandboxApp } from './server';

const port = Number(process.env.PORT || 4006);
createPoyezSandboxApp().listen(port, '0.0.0.0', () => {
  console.log(`[Poyez Sandbox] listening on port ${port}`);
});

export { createPoyezSandboxApp } from './server';
export * from './data';
