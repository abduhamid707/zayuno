import 'dotenv/config';
import { createHhRecruitmentApp } from './server';

const port = Number(process.env.PORT || 4008);
createHhRecruitmentApp().listen(port, '0.0.0.0', () => {
  console.log(`[HeadHunter Recruitment Provider] listening on port ${port}`);
});

export { createHhRecruitmentApp } from './server';
export * from './hh-client';
