import dotenv from 'dotenv';
import { createTelegramRecruitmentApp } from './server.js';

export * from './types.js';
export * from './parser.js';
export * from './mtproto.js';
export * from './feed.js';
export * from './server.js';

dotenv.config();

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST && process.env.AUTO_START_PROVIDER !== 'false') {
  const port = parseInt(process.env.TELEGRAM_RECRUITMENT_PORT || '4005', 10);
  const app = createTelegramRecruitmentApp();
  app.listen(port, () => {
    console.log(`🚀 Telegram Recruitment Provider (UstozShogird) running on port ${port}`);
  });
}
