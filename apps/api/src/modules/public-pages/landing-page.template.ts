/**
 * Zayuno.uz World-Class Landing Page Template
 * Enterprise-Grade AI Commerce OS & Protocol Layer Showcase
 */

export function renderLandingPageHtml(
  sharedHead: string,
  sharedNavbar: string,
  sharedFooter: string,
): string {
  return `<!DOCTYPE html>
<html lang="uz" class="dark scroll-smooth">
<head>
  ${sharedHead}
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased lang-uz selection:bg-emerald-500 selection:text-slate-950">
  ${sharedNavbar}

  <main class="flex-grow">
    
    <!-- ===================================================================== -->
    <!-- 1. HERO SECTION: High-Impact Infrastructure Identity                  -->
    <!-- ===================================================================== -->
    <section class="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 border-b border-slate-900 glow-bg">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        <!-- Live Protocol Status Chip -->
        <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-8 shadow-lg shadow-emerald-950/40 backdrop-blur-md">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="lang-uz font-mono tracking-wide">ZAYUNO COMMERCE OS • 192ms JONLI IJRO • MCP NATIVE</span>
          <span class="lang-en font-mono tracking-wide">ZAYUNO COMMERCE OS • 192ms E2E PROVEN SPEED • MCP NATIVE</span>
        </div>

        <!-- Primary Hero Title -->
        <h1 class="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.12] mb-8">
          <span class="lang-uz">O‘zbekiston Tijoratini <br class="hidden sm:inline" /><span class="text-gradient">Sun’iy Intellektga Ulaydigan</span> Infratuzilma.</span>
          <span class="lang-en">The Unified Commerce OS <br class="hidden sm:inline" /><span class="text-gradient">Connecting Real Business to AI</span>.</span>
        </h1>

        <!-- Subtitle -->
        <p class="max-w-3xl mx-auto text-base sm:text-xl text-slate-300 leading-relaxed mb-10 font-normal">
          <span class="lang-uz">Restoranlar, savdo tarmoqlari va xizmatlarni ChatGPT, Claude, Telegram va avtonom agentlar bilan real vaqtda bog‘lang. Nol xatoli <strong class="text-emerald-400 font-semibold">Approval Gate</strong> va 0.2 soniyalik to‘g‘ridan-to‘g‘ri kassa ijrosi.</span>
          <span class="lang-en">Bridge restaurants, retail networks, and services to ChatGPT, Claude, and autonomous agents in real time. Zero-risk <strong class="text-emerald-400 font-semibold">Approval Gate</strong> and sub-second direct POS execution.</span>
        </p>

        <!-- Primary Action Triggers -->
        <div class="flex flex-wrap items-center justify-center gap-4 mb-14">
          <a href="https://developers.zayuno.uz" class="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm sm:text-base shadow-xl shadow-emerald-500/25 transition-all duration-200 hover:scale-[1.02] flex items-center gap-2">
            <span class="lang-uz">Biznesimni ulash (5 daqiqada)</span>
            <span class="lang-en">Connect Business (In 5 mins)</span>
            <span>→</span>
          </a>
          <a href="#simulator" class="px-8 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 border border-slate-700/80 font-semibold text-sm sm:text-base transition-all duration-200 hover:border-emerald-500/50 flex items-center gap-2">
            <span class="lang-uz">Jonli Simulyatorni ko‘rish</span>
            <span class="lang-en">Explore Live Simulator</span>
            <span>↓</span>
          </a>
          <a href="https://developers.zayuno.uz/docs" class="px-5 py-4 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 text-sm font-mono transition flex items-center gap-1.5">
            <span>Docs</span>
            <span class="text-xs">↗</span>
          </a>
        </div>

        <!-- 4 Real-World Architectural Metric Pills -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto pt-4 border-t border-slate-900/80 text-left">
          
          <div class="card-glass-static p-4 rounded-xl">
            <div class="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">192 ms</div>
            <div class="text-xs font-semibold text-slate-200 mt-0.5">
              <span class="lang-uz">Jonli Ijro Tezligi</span>
              <span class="lang-en">Proven E2E Latency</span>
            </div>
            <div class="text-[11px] text-slate-500 mt-1 font-mono">EVOS & Feed Up verified</div>
          </div>

          <div class="card-glass-static p-4 rounded-xl">
            <div class="text-xl sm:text-2xl font-extrabold text-cyan-400 font-mono">100% Gate</div>
            <div class="text-xs font-semibold text-slate-200 mt-0.5">
              <span class="lang-uz">Approval Gate</span>
              <span class="lang-en">Zero-Risk Gate</span>
            </div>
            <div class="text-[11px] text-slate-500 mt-1 font-mono">No unconfirmed billing</div>
          </div>

          <div class="card-glass-static p-4 rounded-xl">
            <div class="text-xl sm:text-2xl font-extrabold text-purple-400 font-mono">MCP Native</div>
            <div class="text-xs font-semibold text-slate-200 mt-0.5">
              <span class="lang-uz">Universal Protokol</span>
              <span class="lang-en">Open AI Standard</span>
            </div>
            <div class="text-[11px] text-slate-500 mt-1 font-mono">Claude, OpenAI, Cursor</div>
          </div>

          <div class="card-glass-static p-4 rounded-xl">
            <div class="text-xl sm:text-2xl font-extrabold text-amber-400 font-mono">POS Engine</div>
            <div class="text-xs font-semibold text-slate-200 mt-0.5">
              <span class="lang-uz">Kassa & Ombor</span>
              <span class="lang-en">POS Integration</span>
            </div>
            <div class="text-[11px] text-slate-500 mt-1 font-mono">iiko, BILLZ, Uzum</div>
          </div>

        </div>

      </div>
    </section>

    <!-- ===================================================================== -->
    <!-- 2. INTERACTIVE LIVE AGENT SIMULATOR: Clickable Real-World Trace       -->
    <!-- ===================================================================== -->
    <section id="simulator" class="py-20 lg:py-28 bg-slate-950 border-b border-slate-900 relative">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-3xl mx-auto mb-12">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase mb-4">
            <span class="lang-uz">JONLI INTERAKTIV TAJRIBA</span>
            <span class="lang-en">INTERACTIVE AGENTIC SIMULATOR</span>
          </div>
          <h2 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            <span class="lang-uz">Foydalanuvchi so‘rovi qanday qilib 0.2 soniyada kassa chekiga aylanadi?</span>
            <span class="lang-en">How a Single User Prompt Becomes a Kitchen Ticket in 0.2s</span>
          </h2>
          <p class="text-slate-400 mt-3 text-sm sm:text-base">
            <span class="lang-uz">Quyidagi real stsenariylardan birini tanlang va Zayuno dvigatelining kassa, stop-list va to‘lov bilan ishlashini jonli sinab ko‘ring:</span>
            <span class="lang-en">Select a live scenario below to test Zayuno's real-time POS probe, stock check, and Approval Gate execution:</span>
          </p>

          <!-- Scenario Switcher Buttons -->
          <div class="flex flex-wrap items-center justify-center gap-2.5 mt-6">
            <button onclick="switchSimulatorScenario('feedup')" id="btn-scen-feedup" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20">
              🍔 Feed Up: Donarchi Combo
            </button>
            <button onclick="switchSimulatorScenario('evos')" id="btn-scen-evos" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 bg-slate-900 text-slate-300 hover:text-white border border-slate-800">
              🌯 EVOS: Lavash L & Pepsi
            </button>
            <button onclick="switchSimulatorScenario('terrapro')" id="btn-scen-terrapro" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 bg-slate-900 text-slate-300 hover:text-white border border-slate-800">
              👕 Terra Pro: Polo M (BILLZ)
            </button>
          </div>
        </div>

        <!-- Terminal Window Mockup -->
        <div class="max-w-4xl mx-auto rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl overflow-hidden font-mono text-xs sm:text-sm">
          
          <!-- Window Top Bar -->
          <div class="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
              <span class="text-xs text-slate-400 font-mono ml-2">zayuno-engine-v1.4 // node-tashkent-city</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span id="sim-trace-status" class="text-[11px] text-emerald-400 font-bold">POS_SYNC: 0.192s</span>
            </div>
          </div>

          <!-- Terminal Content Area -->
          <div class="p-6 space-y-6 text-slate-300 bg-slate-900/80">
            
            <!-- Step 1: User Request -->
            <div class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">👤</div>
              <div class="space-y-1">
                <div class="text-[11px] text-slate-500">Mijoz (Telegram / ChatGPT MCP)</div>
                <div id="sim-user-prompt" class="text-slate-100 font-sans font-medium text-sm sm:text-base">
                  "Toshkent City'dagi ofisimga Feed Up'dan bitta Donarchi burger va 0.5L muzdek kola olib kel"
                </div>
              </div>
            </div>

            <!-- Step 2: Zayuno Engine Pipeline Trace -->
            <div class="pl-10 space-y-2 border-l-2 border-slate-800 text-xs">
              <div class="flex items-center gap-2 text-emerald-400">
                <span>[0.04s]</span>
                <span id="sim-step-geo">📍 Geocoding & Poligon: Tashkent City, Furqat 2 D17 (Geo: 41.3115, 69.2465)</span>
              </div>
              <div class="flex items-center gap-2 text-cyan-400">
                <span>[0.11s]</span>
                <span id="sim-step-pos">🏢 POS Discovery: Eng yaqin filial tanlandi -&gt; [Feed Up O‘qchi, Terminal ID: 838c8e8f...]</span>
              </div>
              <div class="flex items-center gap-2 text-purple-400">
                <span>[0.17s]</span>
                <span id="sim-step-stock">📦 Live Stop-List Probe: Donarchi (Mavjud), Pepsi 500ml (Mavjud). Narxlar tasdiqlandi.</span>
              </div>
            </div>

            <!-- Step 3: Interactive Approval Gate Card -->
            <div id="sim-gate-container" class="card-glass p-5 rounded-xl border border-emerald-500/40 bg-slate-950/80 space-y-4">
              <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    🛡️ APPROVAL GATE
                  </span>
                  <span id="sim-gate-title" class="font-bold text-white font-sans text-sm">Buyurtma Kotirovkasi (Quote)</span>
                </div>
                <span class="text-xs text-slate-400 font-mono">Tasdiqlash kutilmoqda</span>
              </div>

              <!-- Order Breakdown -->
              <div id="sim-order-items" class="space-y-2 text-xs font-sans">
                <div class="flex justify-between text-slate-300">
                  <span>🍔 1x Donarchi burger</span>
                  <span class="font-mono text-white">45 000 UZS</span>
                </div>
                <div class="flex justify-between text-slate-300">
                  <span>🥤 1x Pepsi 500ml</span>
                  <span class="font-mono text-white">12 000 UZS</span>
                </div>
                <div class="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800/80">
                  <span>🛵 Yetkazib berish (O‘qchi filiali, 850m)</span>
                  <span class="font-mono text-emerald-400 font-bold">BEPUL (0 UZS)</span>
                </div>
                <div class="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-700">
                  <span>Jami to‘lov:</span>
                  <span class="font-mono text-emerald-400">57 000 UZS</span>
                </div>
              </div>

              <!-- Action Confirmation Buttons -->
              <div id="sim-actions-row" class="flex flex-wrap items-center gap-3 pt-2">
                <button onclick="confirmSimulatorOrder()" class="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-sans transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20">
                  <span>✓</span>
                  <span class="lang-uz">Buyurtmani Tasdiqlash</span>
                  <span class="lang-en">Confirm & Dispatch Order</span>
                </button>
                <button onclick="cancelSimulatorOrder()" class="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-sans transition">
                  <span class="lang-uz">Bekor qilish</span>
                  <span class="lang-en">Cancel</span>
                </button>
                <span class="text-[11px] text-slate-500 font-mono ml-auto">Foydalanuvchi tasdiqlamaguncha pul olinmaydi</span>
              </div>

              <!-- Success State Notice (Hidden by default) -->
              <div id="sim-success-alert" class="hidden p-4 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs font-sans space-y-2">
                <div class="flex items-center gap-2 font-bold text-emerald-300">
                  <span class="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black">✓</span>
                  <span>192ms: Buyurtma #315204 Kassa Planshetiga Yuborildi!</span>
                </div>
                <p class="text-[11px] text-emerald-200/80 leading-relaxed font-mono">
                  POST /api/1/deliveries/create muvaffaqiyatli yakunlandi. Oshxona KDS ekranida yangi chek chiqdi. Kuryerga SMS yo‘naltirildi.
                </p>
                <button onclick="resetSimulator()" class="mt-2 text-[11px] text-emerald-400 underline hover:text-white font-mono">
                  ↺ Boshqa stsenariyni sinash
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>

    <!-- ===================================================================== -->
    <!-- 3. THE CONNECTIVITY ENGINE: 4 POS & Commerce Pillars                   -->
    <!-- ===================================================================== -->
    <section id="ecosystem" class="py-20 lg:py-28 bg-slate-950 border-b border-slate-900">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-3xl mx-auto mb-16">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold uppercase mb-4">
            <span class="lang-uz">UNIVERSAL BIZNES INTEGRATSIYASI</span>
            <span class="lang-en">UNIVERSAL POS & COMMERCE LAYER</span>
          </div>
          <h2 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            <span class="lang-uz">Har bir do‘kon uchun dasturchi yollanmaydi. Bitta shlyuz butun bozorni ulaydi.</span>
            <span class="lang-en">No Custom Code Per Store. One Universal Gateway Connects the Market.</span>
          </h2>
          <p class="text-slate-400 mt-3 text-sm sm:text-base">
            <span class="lang-uz">O‘zbekistondagi 95% bizneslar allaqachon ishlatadigan kassa va ombor tizimlarining standart konnektorlari:</span>
            <span class="lang-en">Native adapters for standard POS, ERP, and commerce systems powering 95% of businesses in Uzbekistan:</span>
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <!-- Pillar 1: iiko Cloud & Restoranlar -->
          <div class="card-glass p-8 rounded-2xl relative overflow-hidden group">
            <div class="flex items-center justify-between mb-5">
              <span class="text-2xl">🍔</span>
              <span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                RESTORAN & FAST-FOOD
              </span>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">iiko Cloud & Jowi Connectors</h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
              <span class="lang-uz">EVOS, Feed Up, Chopar, Bellissimo, Wendy's va 10 000+ umumiy ovqatlanish joylari. Bitta apiLogin kaliti bilan barcha 30–80 ta filial menyusi, narxlari va to‘g‘ridan-to‘g‘ri oshxona kassa cheki (KDS) ulanadi.</span>
              <span class="lang-en">iiko Cloud adapter enabling multi-branch restaurant chains to receive orders directly into kitchen displays without third-party tablets.</span>
            </p>
            <ul class="space-y-2.5 text-xs text-slate-400 font-mono">
              <li class="flex items-center gap-2">✓ <span class="text-slate-300">Dinamik Stop-List (tugagan taomlar avtomat yashiriladi)</span></li>
              <li class="flex items-center gap-2">✓ <span class="text-slate-300">Filiallar geolokatsiyasi va avtomat poligon hisobi</span></li>
              <li class="flex items-center gap-2">✓ <span class="text-slate-300">To‘g‘ridan-to‘g‘ri kassa cheki va kuryer dispetcherligi</span></li>
            </ul>
          </div>

          <!-- Pillar 2: BILLZ Retail & Fashion -->
          <div class="card-glass p-8 rounded-2xl relative overflow-hidden group">
            <div class="flex items-center justify-between mb-5">
              <span class="text-2xl">👕</span>
              <span class="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-bold">
                RETAIL & FASHION
              </span>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">BILLZ POS Retail Connector</h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
              <span class="lang-uz">Terra Pro, Vicco, Just, Selfie, RedTag va O‘zbekistondagi 2 000+ brend do‘konlar. Har bir kiyimning o‘lchamlari (S/M/L), ranglari va qaysi savdo markazida borligini AI aniq biladi va bron qiladi.</span>
              <span class="lang-en">BILLZ POS connector mapping multi-store apparel inventories, SKU sizes (S/M/L/XL), real-time branch availability, and in-store reservations.</span>
            </p>
            <ul class="space-y-2.5 text-xs text-slate-400 font-mono">
              <li class="flex items-center gap-2">✓ <span class="text-slate-300">O‘lchamlar va ranglar bo‘yicha aniq filtr</span></li>
              <li class="flex items-center gap-2">✓ <span class="text-slate-300">Do‘kondan olib ketish (In-Store Pickup) yoki kuryer</span></li>
              <li class="flex items-center gap-2">✓ <span class="text-slate-300">Avtomatik vaqtincha rezervatsiya (hold stock)</span></li>
            </ul>
          </div>

          <!-- Pillar 3: Uzum Market & MoySklad -->
          <div class="card-glass p-8 rounded-2xl relative overflow-hidden group">
            <div class="flex items-center justify-between mb-5">
              <span class="text-2xl">📦</span>
              <span class="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-mono font-bold">
                MARKETPLACE & WAREHOUSE
              </span>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">Uzum Market Seller & MoySklad</h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
              <span class="lang-uz">Uzum sotuvchilari uchun rasmiy Seller API moduli. Tovarlar Zayunoning chaqmoqday tez Redis/Postgres bazasiga sinxronlashadi va mijoz qidirganda 10–20 millisoniyada chiqadi.</span>
              <span class="lang-en">Direct merchant sync for Uzum Market sellers and MoySklad ERP users, syncing catalog batches with local high-speed caching.</span>
            </p>
            <ul class="space-y-2.5 text-xs text-slate-400 font-mono">
              <li class="flex items-center gap-2">✓ <span class="text-slate-300">10ms ichida qidiruv va tovar tafsilotlari</span></li>
              <li class="flex items-center gap-2">✓ <span class="text-slate-300">100% rasmiy Seller API (bloklanish xavfisiz)</span></li>
              <li class="flex items-center gap-2">✓ <span class="text-slate-300">FBO va FBS qoldiqlari balansi</span></li>
            </ul>
          </div>

          <!-- Pillar 4: Yandex Delivery API -->
          <div class="card-glass p-8 rounded-2xl relative overflow-hidden group">
            <div class="flex items-center justify-between mb-5">
              <span class="text-2xl">🛵</span>
              <span class="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold">
                FULFILLMENT & COURIERS
              </span>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">Yandex Delivery Fulfillment Layer</h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
              <span class="lang-uz">O‘z kuryeriga ega bo‘lmagan kiyim do‘konlari, qandolatxonalar va qahvaxonalar uchun avtomat kuryer chaqirish qatlami. Buyurtma tushgach, Zayuno eng yaqin kuryerni avtomat marshrutga biriktiradi.</span>
              <span class="lang-en">Automated last-mile fulfillment via Yandex Delivery API for retail shops, cafes, and boutiques without their own courier fleet.</span>
            </p>
            <ul class="space-y-2.5 text-xs text-slate-400 font-mono">
              <li class="flex items-center gap-2">✓ <span class="text-slate-300">Daqiqalik masofa va tarif hisob-kitobi</span></li>
              <li class="flex items-center gap-2">✓ <span class="text-slate-300">Jonli GPS tracking (kuryer xaritasi)</span></li>
              <li class="flex items-center gap-2">✓ <span class="text-slate-300">Express va Door-to-Door yetkazish</span></li>
            </ul>
          </div>

        </div>

      </div>
    </section>

    <!-- ===================================================================== -->
    <!-- 4. LIVE TRANSPARENCY ROADMAP: Genuine Technical Achievements         -->
    <!-- ===================================================================== -->
    <section id="roadmap" class="py-20 lg:py-28 bg-slate-950 border-b border-slate-900 glow-cyan">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-3xl mx-auto mb-16">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase mb-4">
            <span class="lang-uz">SHAFFAF IJRO DOSKASI</span>
            <span class="lang-en">ENGINEERING STATUS & LIVE ROADMAP</span>
          </div>
          <h2 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            <span class="lang-uz">Biz shunchaki gapirmaymiz. Mana amalda isbotlangan haqiqiy status:</span>
            <span class="lang-en">Real Engineering, Not Hollow Promises. Live Deployment Status:</span>
          </h2>
          <p class="text-slate-400 mt-3 text-sm sm:text-base">
            <span class="lang-uz">Loyiha TASKS.md yo‘l xaritasi bo‘yicha bosqichma-bosqich sinovdan o‘tkazilmoqda:</span>
            <span class="lang-en">Auditable development milestones from our production execution logs:</span>
          </p>
        </div>

        <!-- Roadmap Table / Timeline Cards -->
        <div class="space-y-4 max-w-4xl mx-auto">
          
          <!-- Item 1: EVOS & Feed Up -->
          <div class="card-glass-static p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-emerald-500">
            <div class="space-y-1">
              <div class="flex items-center gap-2.5">
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-mono font-bold">
                  🟢 VERIFIED & PROVEN
                </span>
                <span class="text-white font-bold text-base">EVOS & Feed Up Direct Protocol</span>
              </div>
              <p class="text-xs text-slate-300">
                Toshkent City manziliga jonli buyurtma ijrosi (EVOS #119174768: 192ms, Feed Up #315204: 222ms) 100% muvaffaqiyatli sinovdan o‘tdi.
              </p>
            </div>
            <div class="shrink-0 text-left sm:text-right font-mono">
              <span class="text-emerald-400 text-sm font-bold">0.192s</span>
              <div class="text-[10px] text-slate-500">Live Kassa Handshake</div>
            </div>
          </div>

          <!-- Item 2: Uzum Market -->
          <div class="card-glass-static p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-emerald-500">
            <div class="space-y-1">
              <div class="flex items-center gap-2.5">
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-mono font-bold">
                  🟢 OPERATIONAL
                </span>
                <span class="text-white font-bold text-base">Uzum Market Seller Connector</span>
              </div>
              <p class="text-xs text-slate-300">
                Uzum sotuvchilari uchun tovarlar, qoldiqlar va narxlarni Zayuno tarmog‘iga avtomat sinxronlash moduli ishlab turibdi.
              </p>
            </div>
            <div class="shrink-0 text-left sm:text-right font-mono">
              <span class="text-emerald-400 text-sm font-bold">Production Ready</span>
              <div class="text-[10px] text-slate-500">@zayuno/provider-sdk</div>
            </div>
          </div>

          <!-- Item 3: iiko Cloud -->
          <div class="card-glass-static p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-amber-500">
            <div class="space-y-1">
              <div class="flex items-center gap-2.5">
                <span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-mono font-bold">
                  🟡 CERTIFICATION IN PROGRESS
                </span>
                <span class="text-white font-bold text-base">iiko Cloud Enterprise Adapter</span>
              </div>
              <p class="text-xs text-slate-300">
                iiko rasmiy texnik jamoasi bilan ariza (#ID-380770690) qabul qilindi. Zayuno uchun bepul NFR demo-stend va apiLogin faollashtirilmoqda.
              </p>
            </div>
            <div class="shrink-0 text-left sm:text-right font-mono">
              <span class="text-amber-400 text-sm font-bold">Ticket #380770690</span>
              <div class="text-[10px] text-slate-500">Official iiko Partner Flow</div>
            </div>
          </div>

          <!-- Item 4: Yandex Delivery -->
          <div class="card-glass-static p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-cyan-500">
            <div class="space-y-1">
              <div class="flex items-center gap-2.5">
                <span class="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[11px] font-mono font-bold">
                  🔵 PIPELINE NAVBATI: #2
                </span>
                <span class="text-white font-bold text-base">Yandex Delivery API Fulfillment</span>
              </div>
              <p class="text-xs text-slate-300">
                Kuryerlik shtati bo‘lmagan kichik do‘konlar va kafelar uchun Zayuno orqali avtomatik kuryer chaqirish moduli.
              </p>
            </div>
            <div class="shrink-0 text-left sm:text-right font-mono">
              <span class="text-cyan-400 text-sm font-bold">Quvurda Navbatdagi</span>
              <div class="text-[10px] text-slate-500">Post-iiko Sprint</div>
            </div>
          </div>

          <!-- Item 5: BILLZ Retail -->
          <div class="card-glass-static p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-purple-500">
            <div class="space-y-1">
              <div class="flex items-center gap-2.5">
                <span class="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[11px] font-mono font-bold">
                  🔵 PIPELINE NAVBATI: #3
                </span>
                <span class="text-white font-bold text-base">BILLZ POS Retail Adapter</span>
              </div>
              <p class="text-xs text-slate-300">
                O‘zbekistondagi 2 000+ kiyim-kechak do‘konlarini filiallar qoldiqlari va razmerlar kesimida AI orqali sotish imkoniyati.
              </p>
            </div>
            <div class="shrink-0 text-left sm:text-right font-mono">
              <span class="text-purple-400 text-sm font-bold">Planned</span>
              <div class="text-[10px] text-slate-500">Retail Ecosystem</div>
            </div>
          </div>

        </div>

      </div>
    </section>

    <!-- ===================================================================== -->
    <!-- 5. FOR MERCHANTS: 5-Minute Zero-Code Onboarding & Calculator          -->
    <!-- ===================================================================== -->
    <section id="for-businesses" class="py-20 lg:py-28 bg-slate-950 border-b border-slate-900">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div class="lg:col-span-7 space-y-6">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase">
              <span class="lang-uz">BIZNESLAR & PROVIDERLAR UCHUN</span>
              <span class="lang-en">FOR MERCHANTS & PROVIDERS</span>
            </div>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              <span class="lang-uz">5 daqiqada AI dunyosiga kiring. <br class="hidden sm:inline" />0 qator kod, 0 ortiqcha xodim.</span>
              <span class="lang-en">Join the AI Economy in 5 Minutes. <br class="hidden sm:inline" />Zero Code. Zero Headcount.</span>
            </h2>
            <p class="text-slate-300 text-sm sm:text-base leading-relaxed">
              <span class="lang-uz">Sizga yangi sayt yoki alohida operatorlar shart emas. Do‘kon yoki restoraningizdagi kassa tizimi (iiko, BILLZ, Uzum) API kalitini kiritasiz — Zayuno avtomat ravishda tovarlaringizni ChatGPT, Claude va Telegram xaridorlariga ochib beradi.</span>
              <span class="lang-en">No new websites or extra dispatchers needed. Simply enter your existing POS key, and Zayuno instantly exposes your live catalog to AI customers.</span>
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div class="text-emerald-400 font-extrabold text-lg mb-1">1. Ro‘yxatdan o‘ting</div>
                <div class="text-xs text-slate-400">Developer Portalda 1 daqiqada biznes profili ochiladi.</div>
              </div>
              <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div class="text-emerald-400 font-extrabold text-lg mb-1">2. Kalitni kiriting</div>
                <div class="text-xs text-slate-400">iiko, BILLZ yoki Uzum API kaliti kiritiladi.</div>
              </div>
              <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div class="text-emerald-400 font-extrabold text-lg mb-1">3. Tushumni qabul qiling</div>
                <div class="text-xs text-slate-400">Buyurtmalar to‘g‘ridan-to‘g‘ri kassa cheki bo‘lib tushadi.</div>
              </div>
            </div>

            <div class="pt-4">
              <a href="https://developers.zayuno.uz" class="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 transition-all">
                <span class="lang-uz">Zayuno Portaliga Kirish →</span>
                <span class="lang-en">Go to Provider Portal →</span>
              </a>
            </div>
          </div>

          <!-- Interactive Calculator Card -->
          <div class="lg:col-span-5 card-glass p-6 sm:p-8 rounded-2xl border border-slate-800">
            <h3 class="text-lg font-bold text-white mb-2">
              <span class="lang-uz">Qo‘shimcha Tushum Kalkulyatori</span>
              <span class="lang-en">Revenue & Efficiency Estimator</span>
            </h3>
            <p class="text-xs text-slate-400 mb-6">
              <span class="lang-uz">Zayuno orqali keladigan yangi AI xaridorlar oqimini hisoblang:</span>
              <span class="lang-en">Estimate additional monthly volume generated via AI agents:</span>
            </p>

            <div class="space-y-5">
              <div>
                <div class="flex justify-between text-xs text-slate-300 font-semibold mb-2">
                  <span>Kunlik yangi AI buyurtmalar:</span>
                  <span id="calc-orders-label" class="font-mono text-emerald-400 text-sm">30 ta</span>
                </div>
                <input type="range" id="calc-slider" min="5" max="200" step="5" value="30" oninput="updateCalculator(this.value)" class="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer">
              </div>

              <div class="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3 font-mono text-xs">
                <div class="flex justify-between text-slate-400">
                  <span>Oylik qo‘shimcha tushum:</span>
                  <span id="calc-revenue" class="text-emerald-400 font-bold text-sm">+45 000 000 UZS</span>
                </div>
                <div class="flex justify-between text-slate-400">
                  <span>Avtomat tejalgan vaqt:</span>
                  <span id="calc-hours" class="text-cyan-400 font-bold text-sm">~60 soat</span>
                </div>
                <div class="flex justify-between text-slate-400 pt-2 border-t border-slate-800">
                  <span>Operatorlar xarajati:</span>
                  <span class="text-emerald-400 font-bold text-sm">0 UZS (Avtomat)</span>
                </div>
              </div>

              <div class="text-[11px] text-slate-500 font-sans">
                * Hisob-kitob o‘rtacha 50 000 so‘mlik chek va avtomat kassa dispetcherligi asosida tuzilgan.
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>

    <!-- ===================================================================== -->
    <!-- 6. FOR DEVELOPERS & AI RESEARCHERS: Model Context Protocol (MCP)     -->
    <!-- ===================================================================== -->
    <section id="developers" class="py-20 lg:py-28 bg-slate-950 border-b border-slate-900 font-mono">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-3xl mx-auto mb-16 font-sans">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono font-bold uppercase mb-4">
            MODEL CONTEXT PROTOCOL (MCP)
          </div>
          <h2 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            <span class="lang-uz">Har qanday AI agentga 1 qatorda ulanish</span>
            <span class="lang-en">Connect Any AI Agent in a Single Line of Config</span>
          </h2>
          <p class="text-slate-400 mt-3 text-sm sm:text-base font-sans">
            <span class="lang-uz">Anthropic, Claude Desktop, Cursor va ChatGPT uchun rasmiy MCP server:</span>
            <span class="lang-en">Official remote SSE Model Context Protocol server for Claude, Cursor, and custom autonomous agents:</span>
          </p>
        </div>

        <div class="max-w-4xl mx-auto card-glass p-6 sm:p-8 rounded-2xl border border-slate-800 text-xs sm:text-sm">
          <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div class="flex items-center gap-2">
              <span class="text-slate-400">claude_desktop_config.json</span>
              <span class="text-slate-600">|</span>
              <span class="text-emerald-400 text-xs">SSE Transport</span>
            </div>
            <button onclick="copyMcpSnippet()" id="mcp-copy-btn" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition">
              Copy Config 📋
            </button>
          </div>

          <pre class="text-slate-300 overflow-x-auto p-4 rounded-xl bg-slate-950 border border-slate-900 leading-relaxed font-mono"><code>{
  "mcpServers": {
    "zayuno": {
      "url": "https://mcp.zayuno.uz/mcp",
      "headers": {
        "User-Agent": "Claude-Desktop/1.0"
      }
    }
  }
}</code></pre>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-800/80 font-sans text-xs text-slate-400">
            <div><span class="text-emerald-400 font-mono font-bold">tool:</span> zayuno_search</div>
            <div><span class="text-cyan-400 font-mono font-bold">tool:</span> zayuno_quote</div>
            <div><span class="text-purple-400 font-mono font-bold">tool:</span> zayuno_action</div>
            <div><span class="text-amber-400 font-mono font-bold">tool:</span> zayuno_status</div>
          </div>
        </div>

      </div>
    </section>

    <!-- ===================================================================== -->
    <!-- 7. SECURITY & ZERO-RISK GUARANTEE                                     -->
    <!-- ===================================================================== -->
    <section id="security" class="py-20 bg-slate-950 border-b border-slate-900">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-2xl mx-auto mb-16">
          <h2 class="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2 font-mono">
            <span class="lang-uz">XAVFSIZLIK VA ISHONCH</span>
            <span class="lang-en">SECURITY FIRST</span>
          </h2>
          <p class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            <span class="lang-uz">Har bir action to‘liq nazorat ostida</span>
            <span class="lang-en">Every Action Under Strict Control</span>
          </p>
          <p class="text-slate-400 mt-3 text-sm sm:text-base">
            <span class="lang-uz">AI agentlar va bizneslar uchun ishonchli va xavfsiz arxitektura.</span>
            <span class="lang-en">Robust boundaries ensure safety for both consumers and business providers.</span>
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div class="card-glass p-8 rounded-2xl">
            <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl mb-6">💳</div>
            <h3 class="text-lg font-bold text-white mb-3">
              <span class="lang-uz">Zero Card Data Policy</span>
              <span class="lang-en">Zero Card Data Policy</span>
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span class="lang-uz">Zayuno AI chatida karta raqamlari, CVV yoki maxfiy bank ma’lumotlari hech qachon saqlanmaydi va so‘ralmaydi. To‘lov faqat Payme/Click xavfsiz checkout sahifasida o‘tadi.</span>
              <span class="lang-en">Payment cards are never stored or parsed inside AI chats. All transactions route through PCI-DSS compliant direct merchant gateways.</span>
            </p>
          </div>

          <div class="card-glass p-8 rounded-2xl">
            <div class="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-2xl mb-6">🛡️</div>
            <h3 class="text-lg font-bold text-white mb-3">
              <span class="lang-uz">Mandatory Approval Gate</span>
              <span class="lang-en">Mandatory Approval Gate</span>
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span class="lang-uz">AI agent hech qachon o‘zboshimchalik bilan buyurtma berolmaydi. Aniq narx va kotirovka ko‘rsatilgach, foydalanuvchi "Tasdiqlayman" deb bosganidan keyingina kassa chaqiruvi yuboriladi.</span>
              <span class="lang-en">No hallucinated orders. An explicit user interaction is required before any financial or physical fulfillment payload is dispatched.</span>
            </p>
          </div>

          <div class="card-glass p-8 rounded-2xl">
            <div class="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-2xl mb-6">⚡</div>
            <h3 class="text-lg font-bold text-white mb-3">
              <span class="lang-uz">Idempotent POS Locks</span>
              <span class="lang-en">Idempotent POS Locks</span>
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span class="lang-uz">Tarmoq uzilishi yoki mijozning qayta bosishi natijasida bitta taom uchun 2 marta pul yechilmaydi yoki 2 marta kassa cheki chiqmaydi. Har bir harakat unikal kalit bilan himoyalangan.</span>
              <span class="lang-en">Every order carries a cryptographically unique idempotency key, preventing duplicate tickets or double billing during network timeouts.</span>
            </p>
          </div>

        </div>

      </div>
    </section>

    <!-- ===================================================================== -->
    <!-- 8. FREQUENTLY ASKED QUESTIONS (FAQ)                                   -->
    <!-- ===================================================================== -->
    <section id="faq" class="py-20 lg:py-28 bg-slate-950 border-b border-slate-900">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center mb-16">
          <h2 class="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 font-mono">FAQ</h2>
          <p class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            <span class="lang-uz">Ko‘p so‘raladigan savollar</span>
            <span class="lang-en">Frequently Asked Questions</span>
          </p>
        </div>

        <div class="space-y-4">
          
          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">Zayuno nima va u qanday ishlaydi?</span>
              <span class="lang-en">What is Zayuno and how does it work?</span>
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span class="lang-uz">Zayuno — bu O‘zbekistondagi real bizneslarni (restoranlar, kiyim do‘konlari, dorixonalar) sun’iy intellekt agentlariga (ChatGPT, Claude, Telegram) ulaydigan gibrid savdo infratuzilmasi. Mijoz chatda xohlagan narsasini aytadi, Zayuno esa eng yaqin kassadan narx olib, tasdiq bilan xavfsiz yetkazib beradi.</span>
              <span class="lang-en">Zayuno is an AI Commerce OS connecting local businesses in Uzbekistan with conversational AI agents using open protocols (MCP) and direct POS adapters.</span>
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">Biznesimni ulash uchun dasturchi kerakmi?</span>
              <span class="lang-en">Do I need developers to connect my business?</span>
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span class="lang-uz">Yo‘q! Agar siz iiko, BILLZ, Jowi yoki Uzum Market sotuvchisi bo‘lsangiz, Developer Portalga kirib o‘z kassa kalitingizni (apiLogin) kiritishingiz yetarli. Butun filiallar, menyular va narxlar 0 qator kod bilan avtomatik ulanadi.</span>
              <span class="lang-en">No! Standard POS users (iiko, BILLZ, Jowi, Uzum) can connect via our self-serve merchant portal simply by providing their API credentials.</span>
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">EVOS va Feed Up bilan sinov qanday o‘tdi?</span>
              <span class="lang-en">How did the EVOS and Feed Up test perform?</span>
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span class="lang-uz">2026-yil sentyabr oyida o‘tkazilgan jonli sinovda Toshkent City manziliga haqiqiy buyurtmalar (EVOS #119174768 va Feed Up #315204) tushirildi. O‘rtacha server javob vaqti 192 millisoniyani tashkil qildi va buyurtmalar to‘liq tasdiqlandi.</span>
              <span class="lang-en">Live end-to-end production orders executed in September 2026 achieved 192ms server response time and successfully verified kitchen fulfillment flows.</span>
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">Zayuno to‘lov kartalarimni saqlaydimi?</span>
              <span class="lang-en">Does Zayuno store payment card data?</span>
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span class="lang-uz">Mutlaqo yo‘q. Zayuno xavfsizlik standarti bo‘yicha chatda yoki bazada hech qachon karta raqamlari saqlanmaydi. To‘lovlar faqat Payme, Click yoki kuryerga naqd to‘lov orqali amalga oshiriladi.</span>
              <span class="lang-en">Never. Zayuno strictly enforces a Zero Card Data policy. Payments occur via direct checkout redirects or on-delivery cash.</span>
            </p>
          </div>

        </div>

      </div>
    </section>

    <!-- ===================================================================== -->
    <!-- 9. FINAL CALL TO ACTION                                               -->
    <!-- ===================================================================== -->
    <section class="py-20 lg:py-28 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div class="p-10 sm:p-16 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-cyan-950/70 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
          <div class="relative z-10 max-w-2xl mx-auto">
            <h2 class="text-3xl sm:text-5xl font-extrabold text-white mb-6 tracking-tight">
              <span class="lang-uz">Biznesingizni AI Davriga Olib Chiqing.</span>
              <span class="lang-en">Bring Your Business Into the AI Era.</span>
            </h2>
            <p class="text-sm sm:text-lg text-slate-300 mb-10 leading-relaxed">
              <span class="lang-uz">O‘zbekistondagi millionlab yangi AI foydalanuvchilariga birinchilardan bo‘lib o‘z mahsulotlaringizni taklif qiling. 5 daqiqada bepul ulaning.</span>
              <span class="lang-en">Be among the first in Uzbekistan to serve customers directly inside ChatGPT, Claude, and intelligent agents. Connect in 5 minutes.</span>
            </p>
            <div class="flex flex-wrap items-center justify-center gap-4">
              <a href="https://developers.zayuno.uz" class="px-9 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-base shadow-xl shadow-emerald-500/30 transition hover:scale-105">
                <span class="lang-uz">Biznesimni ulash →</span>
                <span class="lang-en">Connect Business Now →</span>
              </a>
              <a href="/support" class="px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition">
                <span class="lang-uz">Savollar bormi? Bog‘lanish</span>
                <span class="lang-en">Have Questions? Contact Us</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

  </main>

  ${sharedFooter}

  <!-- Interactive Simulator Client-Side Logic -->
  <script>
    const SCENARIOS = {
      feedup: {
        btnId: 'btn-scen-feedup',
        prompt: '"Toshkent City\'dagi ofisimga Feed Up\'dan bitta Donarchi burger va 0.5L muzdek kola olib kel"',
        geo: '📍 Geocoding: Toshkent City, Furqat 2 D17 (Geo: 41.3115, 69.2465)',
        pos: '🏢 POS Discovery: Eng yaqin filial -> [Feed Up O‘qchi, Terminal ID: 838c8e8f...]',
        stock: '📦 Live Stop-List: Donarchi (Mavjud), Pepsi 500ml (Mavjud). 192ms.',
        title: 'Feed Up Kotirovkasi (0.192s)',
        status: 'POS_SYNC: 0.192s',
        items: [
          { name: '🍔 1x Donarchi burger', price: '45 000 UZS' },
          { name: '🥤 1x Pepsi 500ml', price: '12 000 UZS' }
        ],
        delivery: 'BEPUL (0 UZS)',
        total: '57 000 UZS',
        successMsg: '192ms: Buyurtma #315204 Kassa Planshetiga Yuborildi!',
        successPayload: 'POST /api/1/deliveries/create muvaffaqiyatli yakunlandi. Oshxona KDS ekranida yangi chek chiqdi.'
      },
      evos: {
        btnId: 'btn-scen-evos',
        prompt: '"Menga EVOS\'dan mol go\'shtli lavash L va razliv Pepsi buyurtma qil"',
        geo: '📍 Geocoding: Navoiy ko‘chasi, Markaziy poligon (Geo: 41.3144, 69.2356)',
        pos: '🏢 POS Discovery: 070-A.Navoiy filiali (Filial ID: 80)',
        stock: '📦 Live Stop-List: Mol go‘shtli lavash L (Mavjud), Pepsi (Mavjud). 156ms.',
        title: 'EVOS Kotirovkasi (0.156s)',
        status: 'POS_SYNC: 0.156s',
        items: [
          { name: '🌯 1x Mol go‘shtli lavash L', price: '41 000 UZS' },
          { name: '🥤 1x Pepsi razliv', price: '10 000 UZS' }
        ],
        delivery: '9 000 UZS',
        total: '60 000 UZS',
        successMsg: '156ms: EVOS Buyurtma #119174768 Kassa Tizimiga Tushdi!',
        successPayload: 'POST /service/order-create muvaffaqiyatli qabul qilindi (code 200). Kuryer biriktirildi.'
      },
      terrapro: {
        btnId: 'btn-scen-terrapro',
        prompt: '"Terra Pro\'dan oq polo ko\'ylak M razmer qaysi filialda bor va qancha?"',
        geo: '📍 Geocoding: Foydalanuvchi joylashuvi -> Tashkent City Mall',
        pos: '🏢 BILLZ Retail Discovery: Terra Pro City Mall filiali (Do‘kon ID: 14)',
        stock: '📦 BILLZ Real-Time Stock: Oq Polo (Artikul: TP-402, Razmer: M) -> 3 dona mavjud.',
        title: 'BILLZ Do‘kon Rezervatsiyasi',
        status: 'BILLZ_API: 0.240s',
        items: [
          { name: '👕 1x Terra Pro Oq Polo (Razmer: M)', price: '189 000 UZS' }
        ],
        delivery: 'Do‘kondan olib ketish (Pick-up): 0 UZS',
        total: '189 000 UZS',
        successMsg: '240ms: Do‘konda 2 soatga bepul zaxiraga (Hold) olindi!',
        successPayload: 'BILLZ POS rezervatsiya kodi: #TP-8841. Kassaga borib kiyib ko‘rish mumkin.'
      }
    };

    let currentScenario = 'feedup';

    function switchSimulatorScenario(key) {
      currentScenario = key;
      const scen = SCENARIOS[key];
      ['btn-scen-feedup', 'btn-scen-evos', 'btn-scen-terrapro'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
          if (id === scen.btnId) {
            btn.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20';
          } else {
            btn.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 bg-slate-900 text-slate-300 hover:text-white border border-slate-800';
          }
        }
      });

      document.getElementById('sim-user-prompt').textContent = scen.prompt;
      document.getElementById('sim-step-geo').textContent = scen.geo;
      document.getElementById('sim-step-pos').textContent = scen.pos;
      document.getElementById('sim-step-stock').textContent = scen.stock;
      document.getElementById('sim-trace-status').textContent = scen.status;
      document.getElementById('sim-gate-title').textContent = scen.title;

      let itemsHtml = '';
      scen.items.forEach(it => {
        itemsHtml += \`<div class="flex justify-between text-slate-300"><span>\${it.name}</span><span class="font-mono text-white">\${it.price}</span></div>\`;
      });
      itemsHtml += \`<div class="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800/80"><span>Yetkazib berish</span><span class="font-mono text-emerald-400 font-bold">\${scen.delivery}</span></div>\`;
      itemsHtml += \`<div class="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-700"><span>Jami to‘lov:</span><span class="font-mono text-emerald-400">\${scen.total}</span></div>\`;

      document.getElementById('sim-order-items').innerHTML = itemsHtml;
      document.getElementById('sim-actions-row').classList.remove('hidden');
      document.getElementById('sim-success-alert').classList.add('hidden');
    }

    function confirmSimulatorOrder() {
      const scen = SCENARIOS[currentScenario];
      document.getElementById('sim-actions-row').classList.add('hidden');
      const alertBox = document.getElementById('sim-success-alert');
      alertBox.innerHTML = \`
        <div class="flex items-center gap-2 font-bold text-emerald-300">
          <span class="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black">✓</span>
          <span>\${scen.successMsg}</span>
        </div>
        <p class="text-[11px] text-emerald-200/80 leading-relaxed font-mono">\${scen.successPayload}</p>
        <button onclick="resetSimulator()" class="mt-2 text-[11px] text-emerald-400 underline hover:text-white font-mono">
          ↺ Boshqa stsenariyni sinash
        </button>
      \`;
      alertBox.classList.remove('hidden');
    }

    function cancelSimulatorOrder() {
      document.getElementById('sim-actions-row').classList.add('hidden');
      const alertBox = document.getElementById('sim-success-alert');
      alertBox.innerHTML = \`
        <div class="flex items-center gap-2 font-bold text-slate-300">
          <span class="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">✕</span>
          <span>Buyurtma bekor qilindi. Kassa va kartaga hech qanday so‘rov yuborilmadi.</span>
        </div>
        <button onclick="resetSimulator()" class="mt-2 text-[11px] text-slate-400 underline hover:text-white font-mono">
          ↺ Qaytadan boshlash
        </button>
      \`;
      alertBox.classList.remove('hidden');
    }

    function resetSimulator() {
      switchSimulatorScenario(currentScenario);
    }

    function updateCalculator(val) {
      const orders = parseInt(val, 10);
      document.getElementById('calc-orders-label').textContent = orders + ' ta';
      const monthlyRevenue = orders * 30 * 50000;
      const formattedRev = '+' + (monthlyRevenue).toLocaleString('uz-UZ') + ' UZS';
      document.getElementById('calc-revenue').textContent = formattedRev;
      const hoursSaved = Math.round(orders * 30 * 4 / 60);
      document.getElementById('calc-hours').textContent = '~' + hoursSaved + ' soat';
    }

    function copyMcpSnippet() {
      const snippet = '{\\n  "mcpServers": {\\n    "zayuno": {\\n      "url": "https://mcp.zayuno.uz/mcp",\\n      "headers": {\\n        "User-Agent": "Claude-Desktop/1.0"\\n      }\\n    }\\n  }\\n}';
      navigator.clipboard.writeText(snippet).then(() => {
        const btn = document.getElementById('mcp-copy-btn');
        btn.textContent = 'Copied! ✓';
        btn.className = 'px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs transition';
        setTimeout(() => {
          btn.textContent = 'Copy Config 📋';
          btn.className = 'px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition';
        }, 2000);
      });
    }
  </script>
</body>
</html>`;
}
