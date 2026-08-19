import * as dotenv from 'dotenv';
import { createMockEvosApp } from './server';

dotenv.config();

const PORT = parseInt(process.env.MOCK_EVOS_PORT || '4001', 10);
const app = createMockEvosApp();

app.listen(PORT, () => {
  console.log(`🥙 Mock EVOS API Server running on http://localhost:${PORT}`);
  console.log(`💳 Mock EVOS Payment Portal available at http://localhost:${PORT}/mock/pay/:orderId`);
});
