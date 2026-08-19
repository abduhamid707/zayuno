import * as dotenv from 'dotenv';
import { ZayunoBackgroundWorker } from './nats-worker';

dotenv.config();

const worker = new ZayunoBackgroundWorker();
worker.start();
console.log('⚡ Zayuno Background Event Worker Started.');
