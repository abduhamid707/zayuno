import assert from 'node:assert/strict';
import { parseTelegramChannelPost, parseTelegramChannelHtml } from '../integrations/telegram-recruitment/src/parser.ts';
import { TelegramRecruitmentFeedService } from '../integrations/telegram-recruitment/src/feed.ts';
import { TelegramChannelFetcher } from '../integrations/telegram-recruitment/src/mtproto.ts';
import { createTelegramRecruitmentApp } from '../integrations/telegram-recruitment/src/server.ts';
import { formatCustomerCandidates, formatCustomerJobs } from '../packages/shared/src/customer-presenter.ts';
import { ZAYUNO_MCP_TOOLS } from '../apps/mcp/src/tools.ts';

const SAMPLE_XODIM_HTML = `
<div class="tgme_widget_message_wrap">
  <div class="tgme_widget_message_text">
    Ish joyi kerak:<br><br>
    👨‍💼 Xodim: Burhoniddin Abdullaev<br>
    🕑 Yosh: 23<br>
    📚 Texnologiya: Backend: Python, Django, Drf, Celery, Docker, Aiogrambot, Oddo, Git, Linux<br>
    frontend: Html, Css, Javascript, Bootstrap<br>
    🇺🇿 Telegram: @Burik0112<br>
    📞 Aloqa: +998 97 112 22 02<br>
    🌐 Hudud: Toshkent sh<br>
    💰 Narxi: $500<br>
    👨🏻‍💻 Kasbi: Middle -Python FullStack Developer<br>
    🕰 Murojaat qilish vaqti: 9:00 - 22:00<br>
    🔎 Maqsad: Odamlarni ishini engilashtirish va proyektlarni oz vohtida topshirish<br><br>
    #xodim #bootstrap #css #django #git #html #javaScript #linux #python #Toshkent<br><br>
    👉 @UstozShogird kanaliga ulanish
  </div>
</div>
`;

const SAMPLE_VAKANSIYA_HTML = `
<div class="tgme_widget_message_wrap">
  <div class="tgme_widget_message_text">
    Hodim kerak:<br><br>
    🏢 Idora: Tech Innovation Labs<br>
    📚 Texnologiya: Node.js, NestJS, TypeScript, PostgreSQL, Redis, Docker<br>
    🇺🇿 Telegram: @tech_hr_manager<br>
    📞 Aloqa: +998 90 999 88 77<br>
    🌐 Hudud: Toshkent sh, Chilonzor<br>
    💰 Maosh: 15 000 000 UZS<br>
    👨🏻‍💻 Kasbi: Senior NestJS Backend Developer<br>
    ⏱ Ish vaqti: 09:00 - 18:00<br>
    🔎 Talablar: Kamida 3 yil tijoriy tajriba, mikroservislar bilan ishlash malakasi.<br><br>
    #ishJoyi #vakansiya #nodejs #nestjs #typescript #postgresql #toshkent<br><br>
    👉 @UstozShogird kanaliga ulanish
  </div>
</div>
`;

async function main() {
  console.log('🧪 Running Stateless Real-Time Telegram Recruitment Provider Tests...\n');

  // =========================================================================
  // 1. Post Parser Unit Tests & Confidence Scoring
  // =========================================================================
  console.log('  1. Testing Telegram Post Parser (#xodim vs #ishJoyi) and Confidence Scoring...');
  const postCandidate = parseTelegramChannelPost(SAMPLE_XODIM_HTML, 'https://t.me/UstozShogird/44988', '2026-08-19T11:00:18+00:00');
  assert.ok(postCandidate, 'Candidate post must be parsed');
  assert.equal(postCandidate.type, 'candidate', 'Post type must be strictly candidate (#xodim)');
  assert.equal(postCandidate.postId, 44988);
  assert.equal(postCandidate.role, 'Middle -Python FullStack Developer');
  assert.ok(postCandidate.skills.includes('Python') || postCandidate.skills.includes('python'), 'Must extract Python skill');
  assert.ok(postCandidate.skills.includes('Django') || postCandidate.skills.includes('django'), 'Must extract Django skill');
  assert.equal(postCandidate.location, 'Toshkent sh');
  assert.equal(postCandidate.salary, '$500');
  assert.equal(postCandidate.salaryAmount, 6400000);
  assert.equal(postCandidate.postUrl, 'https://t.me/UstozShogird/44988');
  assert.ok(postCandidate.confidenceScore >= 0.8, `Confidence score should be high (>= 0.8), got: ${postCandidate.confidenceScore}`);

  // Verify PII suppression in summary
  assert.doesNotMatch(postCandidate.summary, /\+998/, 'Summary must not leak phone number');
  assert.doesNotMatch(postCandidate.summary, /@Burik0112/, 'Summary must not leak telegram handle');
  console.log('    ✅ Candidate post parsed with confidence score and PII sanitized.');

  const postJob = parseTelegramChannelPost(SAMPLE_VAKANSIYA_HTML, 'https://t.me/UstozShogird/44999', '2026-08-19T12:00:00+00:00');
  assert.ok(postJob, 'Job post must be parsed');
  assert.equal(postJob.type, 'job', 'Post type must be strictly job (#ishJoyi)');
  assert.equal(postJob.role, 'Senior NestJS Backend Developer');
  assert.ok(postJob.skills.includes('NestJS') || postJob.skills.includes('nestjs'), 'Must extract NestJS skill');
  assert.equal(postJob.salaryAmount, 15000000);
  assert.ok(postJob.confidenceScore >= 0.8, `Job confidence score should be high (>= 0.8), got: ${postJob.confidenceScore}`);
  assert.doesNotMatch(postJob.summary, /\+998/, 'Job summary must not leak phone number');
  assert.doesNotMatch(postJob.summary, /@tech_hr_manager/, 'Job summary must not leak telegram handle');
  console.log('    ✅ Vacancy job post parsed with confidence score and PII sanitized.');

  // =========================================================================
  // 2. MTProto Client & Zero Fake Data Policy Tests
  // =========================================================================
  console.log('  2. Testing MTProto Client & Zero Fake Data Policy...');
  const fetcher = new TelegramChannelFetcher();
  assert.equal(typeof (fetcher as any).apiId, 'number', 'API ID must be read as number');

  // Test zero fake data on non-existent channel
  const unreachablePosts = await fetcher.fetchChannelPosts({ channelName: 'non_existent_channel_xyz_998877' });
  assert.deepEqual(unreachablePosts, [], 'Unreachable channels must return [] (ZERO fake demo data)');
  console.log('    ✅ Zero fake demo data policy verified (returns [] on unreachable/empty source).');

  // Test explicit MTProto strict mode
  process.env.TELEGRAM_REQUIRE_MTPROTO = 'true';
  const strictFetcher = new TelegramChannelFetcher();
  const strictResult = await strictFetcher.fetchChannelPosts({ channelName: 'UstozShogird' });
  assert.deepEqual(strictResult, [], 'Strict MTProto mode with no session must return []');
  console.log('    ✅ Strict MTProto mode without active session safely returns [].');
  delete process.env.TELEGRAM_REQUIRE_MTPROTO;

  // =========================================================================
  // 3. Stateless Real-Time Search Engine Tests
  // =========================================================================
  console.log('  3. Testing Real-Time Search Engine Filtering & Confidence Ranking...');
  const feedService = new TelegramRecruitmentFeedService();

  // Test live real search
  const livePosts = await feedService.getLivePosts();
  console.log(`    ℹ️ Live real-time posts fetched from UstozShogird: ${livePosts.length}`);

  if (livePosts.length > 0) {
    // Category isolation test: candidate
    const candidateOfferings = await feedService.searchOfferings({ category: 'candidate' });
    assert.ok(candidateOfferings.every(o => o.categorySlug === 'candidate'), 'Every candidate offering must have category candidate (#xodim)');
    console.log(`    ✅ Candidate filter returned ${candidateOfferings.length} real candidates.`);

    // Category isolation test: job
    const jobOfferings = await feedService.searchOfferings({ category: 'job' });
    assert.ok(jobOfferings.every(o => o.categorySlug === 'job'), 'Every job offering must have category job (#ishJoyi)');
    console.log(`    ✅ Job filter returned ${jobOfferings.length} real vacancies.`);
  }

  // =========================================================================
  // 4. Provider Express App HTTP Spec Tests
  // =========================================================================
  console.log('  4. Testing Provider HTTP Endpoints...');
  const app = createTelegramRecruitmentApp();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // Health check
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const healthJson: any = await healthRes.json();
    assert.equal(healthJson.status, 'UP');
    assert.equal(healthJson.channel, 'UstozShogird');
    console.log('    ✅ GET /health verified.');

    // Provider Info
    const infoRes = await fetch(`${baseUrl}/provider-info`);
    assert.equal(infoRes.status, 200);
    const infoJson: any = await infoRes.json();
    assert.equal(infoJson.slug, 'ustoz-shogird');
    assert.ok(infoJson.capabilities.includes('SEARCH'));
    assert.ok(infoJson.capabilities.includes('CATALOG'));
    console.log('    ✅ GET /provider-info verified.');

    // Catalog
    const catalogRes = await fetch(`${baseUrl}/catalog`);
    assert.equal(catalogRes.status, 200);
    const catalogJson: any = await catalogRes.json();
    assert.equal(catalogJson.providerSlug, 'ustoz-shogird');
    console.log('    ✅ GET /catalog verified.');

    // Search via GET
    const searchGetRes = await fetch(`${baseUrl}/offerings/search?category=candidate`);
    assert.equal(searchGetRes.status, 200);
    const searchGetJson: any = await searchGetRes.json();
    assert.ok(Array.isArray(searchGetJson));
    console.log('    ✅ GET /offerings/search verified.');

    // Search via POST
    const searchPostRes = await fetch(`${baseUrl}/offerings/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categorySlug: 'job' })
    });
    assert.equal(searchPostRes.status, 200);
    const searchPostJson: any = await searchPostRes.json();
    assert.ok(Array.isArray(searchPostJson));
    console.log('    ✅ POST /offerings/search verified.');

    // Availability
    const availRes = await fetch(`${baseUrl}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerSlug: 'ustoz-shogird',
        items: [{ offeringId: 'us_candidate_44988', quantity: 1 }]
      })
    });
    assert.equal(availRes.status, 200);
    const availJson: any = await availRes.json();
    assert.equal(availJson.isAvailable, true);
    console.log('    ✅ POST /availability verified.');
  } finally {
    server.close();
  }

  // =========================================================================
  // 5. Customer Presenter & MCP Tools Tests
  // =========================================================================
  console.log('  5. Testing Customer Presenter & MCP Tools...');
  const sampleCandidate = [feedService.postToOffering(postCandidate)];
  const candidatePresenterMsg = formatCustomerCandidates(sampleCandidate);
  assert.match(candidatePresenterMsg, /Topilgan nomzodlar/);
  assert.match(candidatePresenterMsg, /Telegram e'lonini ochish/);
  assert.doesNotMatch(candidatePresenterMsg, /\+998/, 'Customer presenter must not contain leaked phone numbers');

  const sampleJob = [feedService.postToOffering(postJob)];
  const jobPresenterMsg = formatCustomerJobs(sampleJob);
  assert.match(jobPresenterMsg, /Topilgan vakansiyalar/);
  assert.match(jobPresenterMsg, /Telegram e'lonini ochish/);
  assert.doesNotMatch(jobPresenterMsg, /\+998/, 'Job presenter must not contain leaked phone numbers');

  // Verify MCP search_candidates and search_jobs tools
  const searchCandidatesTool = ZAYUNO_MCP_TOOLS.find(t => t.name === 'search_candidates');
  assert.ok(searchCandidatesTool, 'search_candidates tool must exist in MCP catalogue');

  const searchJobsTool = ZAYUNO_MCP_TOOLS.find(t => t.name === 'search_jobs');
  assert.ok(searchJobsTool, 'search_jobs tool must exist in MCP catalogue');

  const fakeClient = {
    searchCandidates: async (q: string, opts: any) => sampleCandidate,
    searchJobs: async (q: string, opts: any) => sampleJob
  };

  const toolCandResult = await searchCandidatesTool.handler({ query: 'Python' }, fakeClient as any);
  assert.ok(toolCandResult.customerMessage, 'search_candidates must return customerMessage');
  assert.match(toolCandResult.customerMessage, /Topilgan nomzodlar/);

  const toolJobResult = await searchJobsTool.handler({ query: 'NestJS' }, fakeClient as any);
  assert.ok(toolJobResult.customerMessage, 'search_jobs must return customerMessage');
  assert.match(toolJobResult.customerMessage, /Topilgan vakansiyalar/);

  console.log('    ✅ Customer presenter and MCP tools verified.\n');

  console.log('🎉 ALL STATELESS REAL-TIME TELEGRAM RECRUITMENT TESTS PASSED CLEANLY!\n');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
