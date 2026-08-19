import 'dotenv/config';
import { createCoffeeTimeSandboxApp } from './server';

const port = Number(process.env.PORT || 4005);
createCoffeeTimeSandboxApp().listen(port, '0.0.0.0', () => {
  console.log(`[Coffee Time Sandbox] listening on port ${port}`);
});

export { createCoffeeTimeSandboxApp } from './server';
export * from './data';
