import 'dotenv/config';
import { createMockEvosApp } from './server';

const port = Number(process.env.PORT || process.env.MOCK_EVOS_PORT || 4001);
const app = createMockEvosApp();

app.listen(port, '0.0.0.0', () => {
  console.log(`[Mock EVOS] Sandbox provider listening on port ${port}`);
});

export { createMockEvosApp } from './server';
export * from './data';
