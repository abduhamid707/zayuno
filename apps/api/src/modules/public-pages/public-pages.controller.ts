import { Controller, Get, Res, Param, Req } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response, Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getOpenAiAppsChallengeToken } from '@zayuno/shared';

@Controller()
export class PublicPagesController {
  // 1. Health check: /health
  @Get('health')
  @ApiExcludeEndpoint()
  health() {
    return { status: 'ok', service: 'zayuno-api', timestamp: new Date().toISOString() };
  }

  // 2. Static Asset Serving: /assets/:filename
  @Get('assets/:filename')
  @ApiExcludeEndpoint()
  serveAsset(@Param('filename') filename: string, @Res() res: Response) {
    const safeName = path.basename(filename);
    const assetPath = path.join(process.cwd(), 'apps/api/public/assets', safeName);

    if (fs.existsSync(assetPath)) {
      if (safeName.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
      else if (safeName.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
      else if (safeName.endsWith('.ico')) res.setHeader('Content-Type', 'image/x-icon');
      else if (safeName.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
      
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      return res.sendFile(assetPath);
    }
    return res.status(404).send('Asset not found');
  }

  // 3. Favicon: /favicon.ico
  @Get('favicon.ico')
  @ApiExcludeEndpoint()
  serveFavicon(@Res() res: Response) {
    const faviconPath = path.join(process.cwd(), 'apps/api/public/assets/favicon.ico');
    if (fs.existsSync(faviconPath)) {
      res.setHeader('Content-Type', 'image/x-icon');
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      return res.sendFile(faviconPath);
    }
    return res.status(404).send('Not found');
  }

  // 3.1. Yandex Verification: /yandex_f58af2445b7b4bbf.html
  @Get('yandex_f58af2445b7b4bbf.html')
  @ApiExcludeEndpoint()
  getYandexVerification(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(`<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    </head>
    <body>Verification: f58af2445b7b4bbf</body>
</html>`);
  }

  // 3.2. OpenAI Apps Domain Verification Challenge: /.well-known/openai-apps-challenge
  @Get('.well-known/openai-apps-challenge')
  @ApiExcludeEndpoint()
  getOpenAiAppsChallenge(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(getOpenAiAppsChallengeToken());
  }

  // 4. Robots.txt: /robots.txt
  @Get('robots.txt')
  @ApiExcludeEndpoint()
  getRobotsTxt(@Req() req: Request, @Res() res: Response) {
    const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().toLowerCase();

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // api.zayuno.uz and mcp.zayuno.uz must not be indexed by search engines
    if (host.includes('api.zayuno.uz') || host.includes('mcp.zayuno.uz')) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return res.send(`User-agent: *\nDisallow: /\n`);
    }

    // zayuno.uz and public developer landing
    return res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /health

Sitemap: https://zayuno.uz/sitemap.xml
`);
  }

  // 5. Sitemap.xml: /sitemap.xml
  @Get('sitemap.xml')
  @ApiExcludeEndpoint()
  getSitemapXml(@Res() res: Response) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>https://zayuno.uz/</loc>
    <lastmod>2026-08-20</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://zayuno.uz/support</loc>
    <lastmod>2026-08-20</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://zayuno.uz/privacy</loc>
    <lastmod>2026-08-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://zayuno.uz/terms</loc>
    <lastmod>2026-08-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

    res.send(sitemap);
  }

  // 6. Main Landing Page: /
  @Get()
  @ApiExcludeEndpoint()
  getLandingPage(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.send(this.renderLandingHtml());
  }

  // 7. Privacy Policy: /privacy
  @Get('privacy')
  @ApiExcludeEndpoint()
  getPrivacyPolicy(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.send(this.renderPrivacyHtml());
  }

  // 8. Terms of Service: /terms
  @Get('terms')
  @ApiExcludeEndpoint()
  getTermsOfService(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.send(this.renderTermsHtml());
  }

  // 9. Customer Support: /support
  @Get('support')
  @ApiExcludeEndpoint()
  getCustomerSupport(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.send(this.renderSupportHtml());
  }

  // =========================================================================
  // SHARED TEMPLATES & SEO HEAD
  // =========================================================================

  private getSharedHead(
    title: string,
    description: string,
    canonicalPath: string,
    schemaObjects: object[] = [],
  ): string {
    const canonicalUrl = `https://zayuno.uz${canonicalPath === '/' ? '' : canonicalPath}`;
    const ogImageUrl = 'https://zayuno.uz/assets/og-image.png';

    // Base organization schema
    const orgSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Zayuno',
      url: 'https://zayuno.uz',
      logo: 'https://zayuno.uz/assets/logo.svg',
      description:
        'AI agentlar uchun biznes tarmog‘i. Xizmatingizni ChatGPT va boshqa AI agentlar bilan bog‘laydi.',
      sameAs: [
        'https://github.com/abduhamid707/zayuno',
        'https://developers.zayuno.uz',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'support@zayuno.uz',
        contactType: 'technical support',
        areaServed: 'UZ',
        availableLanguage: ['Uzbek', 'English', 'Russian'],
      },
    };

    const webSiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Zayuno — AI Agentlar Uchun Biznes Tarmog‘i',
      url: 'https://zayuno.uz',
      description: description,
      publisher: {
        '@type': 'Organization',
        name: 'Zayuno',
        logo: {
          '@type': 'ImageObject',
          url: 'https://zayuno.uz/assets/logo.svg',
        },
      },
    };

    const allSchemas = [orgSchema, webSiteSchema, ...schemaObjects];
    const schemaScriptTags = allSchemas
      .map(
        (schema) =>
          `  <script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n  </script>`,
      )
      .join('\n');

    return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="AI agentlar, biznes tarmog'i, Model Context Protocol, MCP server, ChatGPT integratsiya, Claude tools, AI delivery, AI xizmatlar, Uzbekistan AI">
  <meta name="author" content="Zayuno">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="google-site-verification" content="nFHDr-mb60LexlEBpCEqJWhMHzECXekSZRKJkbDtsRE">
  <meta name="yandex-verification" content="f58af2445b7b4bbf">
  <meta name="theme-color" content="#020617">

  <!-- Canonical URL -->
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Favicons & Icons -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="128x128" href="/assets/icon-128.png">
  <link rel="apple-touch-icon" sizes="512x512" href="/assets/icon-512.png">

  <!-- Open Graph / Facebook -->
  <meta property="og:site_name" content="Zayuno">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Zayuno — AI Agentlar Uchun Biznes Tarmog‘i">
  <meta property="og:locale" content="uz_UZ">

  <!-- Twitter Meta -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImageUrl}">
  <meta name="twitter:image:alt" content="Zayuno — AI Agentlar Uchun Biznes Tarmog‘i">

  <!-- Performance & Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          },
          colors: {
            brand: {
              50: '#ecfdf5',
              400: '#34d399',
              500: '#10b981',
              600: '#059669',
            }
          }
        }
      }
    }
  </script>

  <!-- Structured Data JSON-LD -->
${schemaScriptTags}

  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .glow-bg {
      background: radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.14) 0%, rgba(6, 182, 212, 0.07) 35%, transparent 70%);
    }
    .card-glass {
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(51, 65, 85, 0.6);
      transition: all 0.2s ease-in-out;
    }
    .card-glass:hover {
      border-color: rgba(52, 211, 153, 0.45);
      transform: translateY(-2px);
    }
    .card-glass-static {
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(51, 65, 85, 0.6);
    }
    /* Bilingual toggle visibility */
    body.lang-uz .lang-en { display: none !important; }
    body.lang-en .lang-uz { display: none !important; }
    body.lang-uz span.lang-en, body.lang-uz div.lang-en, body.lang-uz p.lang-en { display: none !important; }
    body.lang-en span.lang-uz, body.lang-en div.lang-uz, body.lang-en p.lang-uz { display: none !important; }
  </style>`;
  }

  private getSharedNavbar(): string {
    return `
  <header class="border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-3 group" aria-label="Zayuno Home">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
          Z
        </div>
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <span class="text-xl font-extrabold tracking-tight text-white">ZAYUNO</span>
            <span class="hidden sm:inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span class="lang-uz">BIZNES TARMOG‘I</span>
              <span class="lang-en">BUSINESS NETWORK</span>
            </span>
          </div>
        </div>
      </a>

      <!-- Desktop Nav Links -->
      <nav class="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
        <a href="/#for-businesses" class="hover:text-emerald-400 transition-colors">
          <span class="lang-uz">Bizneslar uchun</span>
          <span class="lang-en">For Businesses</span>
        </a>
        <a href="/#for-developers" class="hover:text-emerald-400 transition-colors">
          <span class="lang-uz">Developerlar uchun</span>
          <span class="lang-en">For Developers</span>
        </a>
        <a href="/#how-it-works" class="hover:text-emerald-400 transition-colors">
          <span class="lang-uz">Qanday ishlaydi</span>
          <span class="lang-en">How It Works</span>
        </a>
        <a href="/#security" class="hover:text-emerald-400 transition-colors">
          <span class="lang-uz">Xavfsizlik</span>
          <span class="lang-en">Security</span>
        </a>
        <a href="/#faq" class="hover:text-emerald-400 transition-colors">
          <span>FAQ</span>
        </a>
        <a href="https://developers.zayuno.uz/docs" class="hover:text-emerald-400 transition-colors flex items-center gap-1">
          <span>Docs</span> <span class="text-xs text-slate-500">↗</span>
        </a>
      </nav>

      <!-- Action Buttons & Language Switcher -->
      <div class="flex items-center gap-2.5 sm:gap-3">
        <!-- Language Switcher Toggle -->
        <div class="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-0.5 text-xs font-semibold">
          <button id="langUzBtn" onclick="switchLang('uz')" class="px-2.5 py-1 rounded-lg transition-all duration-150 text-emerald-400 bg-slate-800 shadow-sm" title="O‘zbekcha">UZ</button>
          <button id="langEnBtn" onclick="switchLang('en')" class="px-2.5 py-1 rounded-lg transition-all duration-150 text-slate-400 hover:text-slate-200" title="English">EN</button>
        </div>

        <a href="https://developers.zayuno.uz" class="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all duration-150">
          <span class="lang-uz">Provider bo‘lish</span>
          <span class="lang-en">Become a Provider</span>
          <span>→</span>
        </a>

        <a href="https://mcp.zayuno.uz/mcp" class="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono font-medium transition flex items-center gap-1.5" title="Model Context Protocol Endpoint">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="hidden xs:inline">MCP</span>
          <span class="xs:hidden">/mcp</span>
        </a>

        <!-- Mobile Menu Toggle -->
        <button id="mobileMenuBtn" aria-label="Toggle Navigation" class="lg:hidden p-2 text-slate-400 hover:text-white focus:outline-none">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Nav Drawer -->
    <div id="mobileMenu" class="hidden lg:hidden border-t border-slate-800 bg-slate-950/95 px-4 pt-3 pb-5 space-y-3 text-sm font-medium">
      <a href="/#for-businesses" class="block text-slate-300 hover:text-emerald-400 py-1">
        <span class="lang-uz">Bizneslar uchun</span>
        <span class="lang-en">For Businesses</span>
      </a>
      <a href="/#for-developers" class="block text-slate-300 hover:text-emerald-400 py-1">
        <span class="lang-uz">Developerlar uchun</span>
        <span class="lang-en">For Developers</span>
      </a>
      <a href="/#how-it-works" class="block text-slate-300 hover:text-emerald-400 py-1">
        <span class="lang-uz">Qanday ishlaydi</span>
        <span class="lang-en">How It Works</span>
      </a>
      <a href="/#security" class="block text-slate-300 hover:text-emerald-400 py-1">
        <span class="lang-uz">Xavfsizlik</span>
        <span class="lang-en">Security</span>
      </a>
      <a href="/#faq" class="block text-slate-300 hover:text-emerald-400 py-1">FAQ</a>
      <a href="/support" class="block text-slate-300 hover:text-emerald-400 py-1">
        <span class="lang-uz">Mijozlarni qo‘llab-quvvatlash</span>
        <span class="lang-en">Customer Support</span>
      </a>
      <a href="https://developers.zayuno.uz/docs" class="block text-emerald-400 font-semibold py-1">
        <span class="lang-uz">Developer hujjatlari ↗</span>
        <span class="lang-en">Developer Documentation ↗</span>
      </a>
      <a href="https://developers.zayuno.uz" class="block w-full text-center py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs mt-2">
        <span class="lang-uz">Provider bo‘lish →</span>
        <span class="lang-en">Become a Provider →</span>
      </a>
    </div>
  </header>
  <script>
    function switchLang(lang) {
      if (lang === 'en') {
        document.body.classList.remove('lang-uz');
        document.body.classList.add('lang-en');
        const uzBtn = document.getElementById('langUzBtn');
        const enBtn = document.getElementById('langEnBtn');
        if (uzBtn && enBtn) {
          uzBtn.className = 'px-2.5 py-1 rounded-lg transition-all duration-150 text-slate-400 hover:text-slate-200';
          enBtn.className = 'px-2.5 py-1 rounded-lg transition-all duration-150 text-emerald-400 bg-slate-800 shadow-sm';
        }
        localStorage.setItem('zayuno_lang', 'en');
        document.documentElement.lang = 'en';
      } else {
        document.body.classList.remove('lang-en');
        document.body.classList.add('lang-uz');
        const uzBtn = document.getElementById('langUzBtn');
        const enBtn = document.getElementById('langEnBtn');
        if (uzBtn && enBtn) {
          uzBtn.className = 'px-2.5 py-1 rounded-lg transition-all duration-150 text-emerald-400 bg-slate-800 shadow-sm';
          enBtn.className = 'px-2.5 py-1 rounded-lg transition-all duration-150 text-slate-400 hover:text-slate-200';
        }
        localStorage.setItem('zayuno_lang', 'uz');
        document.documentElement.lang = 'uz';
      }
    }
    // Initialize language from localStorage or URL param
    (function() {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang');
      const savedLang = urlLang || localStorage.getItem('zayuno_lang') || 'uz';
      if (savedLang === 'en') {
        switchLang('en');
      } else {
        switchLang('uz');
      }
    })();

    const menuBtn = document.getElementById('mobileMenuBtn');
    const menuDrawer = document.getElementById('mobileMenu');
    if (menuBtn && menuDrawer) {
      menuBtn.addEventListener('click', () => menuDrawer.classList.toggle('hidden'));
    }
  </script>`;
  }

  private getSharedFooter(): string {
    return `
  <footer class="border-t border-slate-800/80 bg-slate-950 text-slate-400 py-14">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
        
        <!-- Brand Summary -->
        <div class="space-y-4 md:col-span-1">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm">Z</div>
            <span class="text-lg font-bold text-white tracking-tight">ZAYUNO</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            <span class="lang-uz">AI agentlar uchun biznes tarmog‘i. Bizneslarni ChatGPT, Claude va boshqa AI agentlar bilan xavfsiz bog‘laydi.</span>
            <span class="lang-en">Business network for AI agents. Connecting real-world businesses to ChatGPT, Claude, and autonomous agents securely.</span>
          </p>
          <div class="text-xs text-slate-500 font-mono">
            <span>Tashkent, Uzbekistan</span>
          </div>
        </div>

        <!-- Solutions & Portals -->
        <div>
          <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">
            <span class="lang-uz">Xizmatlar & Portallar</span>
            <span class="lang-en">Services & Portals</span>
          </h4>
          <ul class="space-y-2.5 text-xs">
            <li>
              <a href="https://developers.zayuno.uz" class="hover:text-emerald-400 transition-colors">
                <span class="lang-uz">Biznesimni ulash</span>
                <span class="lang-en">Connect Business</span>
              </a>
            </li>
            <li>
              <a href="https://developers.zayuno.uz/docs" class="hover:text-emerald-400 transition-colors">
                <span class="lang-uz">Developer hujjatlari</span>
                <span class="lang-en">Developer Docs</span>
              </a>
            </li>
            <li>
              <a href="https://developers.zayuno.uz/docs#sandbox" class="hover:text-emerald-400 transition-colors">
                <span class="lang-uz">Sandbox muhiti</span>
                <span class="lang-en">Sandbox Environment</span>
              </a>
            </li>
            <li>
              <a href="https://mcp.zayuno.uz/mcp" class="hover:text-emerald-400 transition-colors font-mono">MCP Endpoint (/mcp)</a>
            </li>
          </ul>
        </div>

        <!-- Trust & Governance -->
        <div>
          <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">
            <span class="lang-uz">Xavfsizlik & Huquqiy</span>
            <span class="lang-en">Trust & Governance</span>
          </h4>
          <ul class="space-y-2.5 text-xs">
            <li>
              <a href="/privacy" class="hover:text-emerald-400 transition-colors">
                <span class="lang-uz">Maxfiylik siyosati</span>
                <span class="lang-en">Privacy Policy</span>
              </a>
            </li>
            <li>
              <a href="/terms" class="hover:text-emerald-400 transition-colors">
                <span class="lang-uz">Foydalanish shartlari</span>
                <span class="lang-en">Terms of Service</span>
              </a>
            </li>
            <li>
              <a href="/support" class="hover:text-emerald-400 transition-colors">
                <span class="lang-uz">Qo‘llab-quvvatlash</span>
                <span class="lang-en">Customer Support</span>
              </a>
            </li>
            <li>
              <a href="/#security" class="hover:text-emerald-400 transition-colors">
                <span class="lang-uz">Karta ma'lumotlari xavfsizligi</span>
                <span class="lang-en">Zero Card Data Policy</span>
              </a>
            </li>
          </ul>
        </div>

        <!-- Architecture Guarantee -->
        <div>
          <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">
            <span class="lang-uz">Xavfsizlik kafolati</span>
            <span class="lang-en">Security Boundary</span>
          </h4>
          <p class="text-xs text-slate-400 leading-relaxed mb-3">
            <span class="lang-uz">Zayuno AI chatida karta raqamlari yoki bank ma’lumotlarini saqlamaydi. To‘lovlar faqat provider tomonidan taqdim etilgan xavfsiz sahifada amalga oshiriladi.</span>
            <span class="lang-en">Zayuno never stores payment card data in chat. Payments occur exclusively on provider-owned secure checkout links.</span>
          </p>
          <div class="text-[11px] font-mono text-slate-500">
            Standard: <span class="text-slate-400">Model Context Protocol (MCP)</span>
          </div>
        </div>
      </div>

      <div class="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <p>© 2026 Zayuno. <span class="lang-uz">Barcha huquqlar himoyalangan.</span><span class="lang-en">All rights reserved.</span></p>
        <div class="flex items-center gap-6">
          <span class="font-mono">Tashkent, Uzbekistan</span>
          <span class="font-mono text-slate-600">•</span>
          <a href="https://github.com/abduhamid707/zayuno" target="_blank" rel="noopener noreferrer" class="hover:text-slate-300 transition-colors">GitHub Repository</a>
        </div>
      </div>
    </div>
  </footer>`;
  }

  // =========================================================================
  // PAGE RENDERERS
  // =========================================================================

  private renderLandingHtml(): string {
    const landingFaqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Zayuno nima va u qanday ishlaydi?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Zayuno — AI agentlar uchun biznes tarmog‘i. U real biznes xizmatlarini Model Context Protocol (MCP) orqali ChatGPT, Claude va boshqa AI agentlarga ulaydi. Mijozlar AI orqali xizmatlarni topadi, aniq narx hisob-kitobini oladi va faqat tasdiqlaganidan so‘ng buyurtma yoki to‘lov amalga oshiriladi.',
          },
        },
        {
          '@type': 'Question',
          name: 'Biznesimni Zayuno tarmog‘iga qanday ulayman?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Biznesingizning katalogi yoki buyurtma API-sini @zayuno/provider-sdk orqali ulab, Developer Portal orqali ariza topshirasiz. Integratsiya tekshirilib tasdiqlangandan so‘ng, xizmatingiz AI agentlar qidiruvida faollashadi.',
          },
        },
        {
          '@type': 'Question',
          name: 'Provider qachon public qidiruvga chiqadi?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Provider approval (moderatsiya tekshiruvi), publication va certification talablaridan o‘tgach discovery’da ko‘rinadi.',
          },
        },
        {
          '@type': 'Question',
          name: 'Sandbox va real provider farqi nima?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sandbox — bu xavfsiz sinov muhiti bo‘lib, test katalog va test checkout bilan ishlaydi, unda real to‘lov yoki buyurtma bo‘lmaydi. Real provider esa tasdiqlangan haqiqiy biznes integratsiyasi bo‘lib, real xizmatlarni taqdim etadi.',
          },
        },
        {
          '@type': 'Question',
          name: 'Zayuno to‘lov ma’lumotlarini saqlaydimi?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yo‘q. Zayuno chatida karta raqamlari, CVV yoki maxfiy bank ma’lumotlari saqlanmaydi va so‘ralmaydi. To‘lov faqat providerning o‘z checkout sahifasida amalga oshiriladi.',
          },
        },
        {
          '@type': 'Question',
          name: 'Qanday AI agentlar bilan ishlaydi?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Model Context Protocol (MCP) va standart HTTP API qo‘llab-quvvatlaydigan barcha AI vositalari (ChatGPT, Claude, Cursor, maxsus avtonom agentlar) bilan ishlaydi.',
          },
        },
        {
          '@type': 'Question',
          name: 'Provider API’si bo‘lmasa nima qilaman?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Biznesingizda hozircha to‘liq API bo‘lmasa, Developer Portal orqali katalogingizni strukturaviy formatda joylash yoki biz bilan bog‘lanib tayyor integratsiya yechimlaridan foydalanishingiz mumkin.',
          },
        },
        {
          '@type': 'Question',
          name: 'Support bilan qayerdan bog‘lanaman?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'support@zayuno.uz yoki dev@zayuno.uz elektron pochtasi orqali yoki saytdagi /support sahifasidan murojaat qilishingiz mumkin.',
          },
        },
      ],
    };

    const softwareAppSchema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Zayuno Business Network for AI',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Cloud / Remote MCP / REST',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description:
        'Business network connecting conversational AI agents with verified real-world service providers.',
    };

    return `<!DOCTYPE html>
<html lang="uz" class="dark scroll-smooth">
<head>
  ${this.getSharedHead(
    'Zayuno — AI Agentlar Uchun Biznes Tarmog‘i',
    'Xizmatingizni AI orqali topiladigan va boshqariladigan qiling. Zayuno bizneslaringizni ChatGPT va AI agentlar bilan bog‘laydi.',
    '/',
    [softwareAppSchema, landingFaqSchema],
  )}
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased lang-uz">
  ${this.getSharedNavbar()}

  <main class="flex-grow">
    
    <!-- 1. Hero Section -->
    <section class="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28 border-b border-slate-900 glow-bg">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        <!-- Eyebrow Badge -->
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6 shadow-sm">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="lang-uz font-mono uppercase tracking-wide">AI AGENTLAR UCHUN BIZNES TARMOG‘I</span>
          <span class="lang-en font-mono uppercase tracking-wide">BUSINESS NETWORK FOR AI AGENTS</span>
        </div>

        <!-- Primary Hero H1 -->
        <h1 class="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.18] mb-6">
          <span class="lang-uz">Xizmatingizni AI orqali topiladigan va boshqariladigan qiling.</span>
          <span class="lang-en">Make your services discoverable and actionable by AI.</span>
        </h1>

        <!-- Subtitle -->
        <p class="max-w-3xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed mb-8 font-normal">
          <span class="lang-uz">Zayuno bizneslaringizni ChatGPT va boshqa AI agentlar bilan bog‘laydi. Mijozlar katalogni ko‘radi, aniq narx oladi va faqat tasdiqlagandan keyin buyurtma yoki xizmat oqimi boshlanadi.</span>
          <span class="lang-en">Zayuno connects your business to ChatGPT and leading AI agents. Customers explore catalogs, get exact quotes, and initiate orders or service flows only after explicit confirmation.</span>
        </p>

        <!-- Primary Call to Actions -->
        <div class="flex flex-wrap items-center justify-center gap-4 mb-8">
          <a href="https://developers.zayuno.uz" class="px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all duration-150 flex items-center gap-2">
            <span class="lang-uz">Biznesimni ulash</span>
            <span class="lang-en">Connect My Business</span>
            <span>→</span>
          </a>
          <a href="https://developers.zayuno.uz/docs" class="px-7 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition-all duration-150 flex items-center gap-2">
            <span class="lang-uz">MCP’ni sinab ko‘rish</span>
            <span class="lang-en">Try MCP Protocol</span>
            <span class="text-slate-400">↗</span>
          </a>
        </div>

        <!-- Trust Line -->
        <p class="text-xs sm:text-sm text-slate-400 font-medium">
          <span class="lang-uz">Sandbox’da sinang. Real providerlar approval va certification’dan keyin public chiqadi.</span>
          <span class="lang-en">Test in sandbox. Real providers go public after review, approval, and certification.</span>
        </p>

      </div>
    </section>

    <!-- 2. Dual Audience Section: Kim uchun ekanini darhol ko'rsatish -->
    <section class="py-16 bg-slate-950 border-b border-slate-900">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <!-- Card 1: Bizneslar uchun -->
          <div id="for-businesses" class="card-glass p-8 sm:p-10 rounded-2xl relative overflow-hidden flex flex-col justify-between">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-5">
                <span class="lang-uz">BIZNESLAR & PROVIDERLAR</span>
                <span class="lang-en">FOR BUSINESSES & PROVIDERS</span>
              </div>
              <h2 class="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                <span class="lang-uz">Xizmatingizni AI’ga ulang</span>
                <span class="lang-en">Connect Your Business to AI</span>
              </h2>
              <p class="text-sm text-slate-300 leading-relaxed mb-6">
                <span class="lang-uz">Restoran, delivery, booking, marketplace yoki boshqa biznes API’ingizni Zayuno orqali AI agentlarga oching.</span>
                <span class="lang-en">Expose your restaurant, delivery, booking, marketplace, or custom API to AI agents through Zayuno.</span>
              </p>

              <ul class="space-y-3 text-sm text-slate-300 mb-8">
                <li class="flex items-start gap-3">
                  <div class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs mt-0.5 font-bold">✓</div>
                  <span>
                    <strong class="text-white lang-uz">Katalog va mavjudlikni ulash</strong>
                    <strong class="text-white lang-en">Catalog & live availability</strong>
                    <span class="block text-xs text-slate-400 lang-uz">Menyu, narxlar va ish vaqtini real vaqtda yangilang.</span>
                    <span class="block text-xs text-slate-400 lang-en">Sync offerings, pricing, and operating hours dynamically.</span>
                  </span>
                </li>
                <li class="flex items-start gap-3">
                  <div class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs mt-0.5 font-bold">✓</div>
                  <span>
                    <strong class="text-white lang-uz">Aniq quote va narx hisoblash</strong>
                    <strong class="text-white lang-en">Deterministic quote calculation</strong>
                    <span class="block text-xs text-slate-400 lang-uz">Yetkazib berish haqi va chegirmalarni to‘g‘ri hisoblang.</span>
                    <span class="block text-xs text-slate-400 lang-en">Itemized calculation of taxes, fees, and exact subtotals.</span>
                  </span>
                </li>
                <li class="flex items-start gap-3">
                  <div class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs mt-0.5 font-bold">✓</div>
                  <span>
                    <strong class="text-white lang-uz">Tasdiqlangan action oqimi</strong>
                    <strong class="text-white lang-en">Confirmed action execution</strong>
                    <span class="block text-xs text-slate-400 lang-uz">Foydalanuvchi roziligisiz hech qanday buyurtma yaratilmaydi.</span>
                    <span class="block text-xs text-slate-400 lang-en">Actions are created only after explicit user approval.</span>
                  </span>
                </li>
                <li class="flex items-start gap-3">
                  <div class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs mt-0.5 font-bold">✓</div>
                  <span>
                    <strong class="text-white lang-uz">Provider-owned checkout</strong>
                    <strong class="text-white lang-en">Provider-owned checkout</strong>
                    <span class="block text-xs text-slate-400 lang-uz">To‘lov o‘zingizning mavjud to‘lov tizimingizda amalga oshadi.</span>
                    <span class="block text-xs text-slate-400 lang-en">Payments occur via your own existing payment flow.</span>
                  </span>
                </li>
              </ul>
            </div>

            <a href="https://developers.zayuno.uz" class="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md transition">
              <span class="lang-uz">Provider bo‘lish →</span>
              <span class="lang-en">Become a Provider →</span>
            </a>
          </div>

          <!-- Card 2: Developerlar uchun -->
          <div id="for-developers" class="card-glass p-8 sm:p-10 rounded-2xl relative overflow-hidden flex flex-col justify-between">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-5">
                <span class="lang-uz">DEVELOPERLAR & AI BUILDERLAR</span>
                <span class="lang-en">FOR DEVELOPERS & AI BUILDERS</span>
              </div>
              <h2 class="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                <span class="lang-uz">Agentingizga real xizmatlar bering</span>
                <span class="lang-en">Give Your Agent Real Services</span>
              </h2>
              <p class="text-sm text-slate-300 leading-relaxed mb-6">
                <span class="lang-uz">MCP orqali AI agentingizga provider qidiruvi, katalog, quote, action va status oqimlarini ulang.</span>
                <span class="lang-en">Connect provider search, catalogs, quotes, actions, and status tracking to your agent via MCP.</span>
              </p>

              <ul class="space-y-3 text-sm text-slate-300 mb-8">
                <li class="flex items-start gap-3">
                  <div class="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs mt-0.5 font-bold">✓</div>
                  <span>
                    <strong class="text-white lang-uz">Streamable HTTP MCP</strong>
                    <strong class="text-white lang-en">Streamable HTTP MCP</strong>
                    <span class="block text-xs text-slate-400 lang-uz">ChatGPT va Claude uchun yagona standart MCP protokoli.</span>
                    <span class="block text-xs text-slate-400 lang-en">Standardized MCP endpoint compatible with major AI tools.</span>
                  </span>
                </li>
                <li class="flex items-start gap-3">
                  <div class="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs mt-0.5 font-bold">✓</div>
                  <span>
                    <strong class="text-white lang-uz">Sandbox environment</strong>
                    <strong class="text-white lang-en">Sandbox environment</strong>
                    <span class="block text-xs text-slate-400 lang-uz">Xavfsiz test ma’lumotlari bilan agentingizni sinab ko‘ring.</span>
                    <span class="block text-xs text-slate-400 lang-en">Test your agent against simulated providers with zero risk.</span>
                  </span>
                </li>
                <li class="flex items-start gap-3">
                  <div class="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs mt-0.5 font-bold">✓</div>
                  <span>
                    <strong class="text-white lang-uz">Typed contracts</strong>
                    <strong class="text-white lang-en">Typed contracts</strong>
                    <span class="block text-xs text-slate-400 lang-uz">TypeScript SDK va aniq belgilangan JSON sxemalar.</span>
                    <span class="block text-xs text-slate-400 lang-en">Strictly typed schemas for offerings, quotes, and webhooks.</span>
                  </span>
                </li>
                <li class="flex items-start gap-3">
                  <div class="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs mt-0.5 font-bold">✓</div>
                  <span>
                    <strong class="text-white lang-uz">Confirmation guardrails</strong>
                    <strong class="text-white lang-en">Confirmation guardrails</strong>
                    <span class="block text-xs text-slate-400 lang-uz">AI o‘zboshimchalik bilan xarid qilmasligi kafolatlangan.</span>
                    <span class="block text-xs text-slate-400 lang-en">Strict guardrails preventing unintentional actions.</span>
                  </span>
                </li>
              </ul>
            </div>

            <a href="https://developers.zayuno.uz/docs" class="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm transition">
              <span class="lang-uz">Developer docs →</span>
              <span class="lang-en">Developer Docs →</span>
            </a>
          </div>

        </div>
      </div>
    </section>

    <!-- 3. "Qanday ishlaydi?" (How It Works) Section -->
    <section id="how-it-works" class="py-20 bg-slate-950 border-b border-slate-900">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-2xl mx-auto mb-16">
          <h2 class="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 font-mono">
            <span class="lang-uz">ISH JARAYONI</span>
            <span class="lang-en">HOW IT WORKS</span>
          </h2>
          <p class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            <span class="lang-uz">3 bosqichli xavfsiz harakat</span>
            <span class="lang-en">3-Step Deterministic Flow</span>
          </p>
          <p class="text-slate-400 mt-3 text-sm sm:text-base">
            <span class="lang-uz">Foydalanuvchi to‘liq nazoratida bo‘lgan aniq va shaffof tizim.</span>
            <span class="lang-en">Deterministic pricing, complete user control, and secure provider handoff.</span>
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <!-- Step 1: Topadi -->
          <div class="card-glass p-8 rounded-2xl relative overflow-hidden flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg mb-6">
                01
              </div>
              <h3 class="text-xl font-bold text-white mb-2 flex items-center justify-between">
                <span class="lang-uz">1. Topadi</span>
                <span class="lang-en">1. Discover</span>
                <span class="text-[11px] font-mono font-normal text-blue-400 px-2 py-0.5 bg-blue-500/10 rounded">find_providers</span>
              </h3>
              <p class="text-sm text-slate-300 leading-relaxed mt-3 mb-4">
                <span class="lang-uz">AI mos provider, katalog yoki e’lonlarni qidiradi.</span>
                <span class="lang-en">AI finds relevant providers, active catalogs, or public listings.</span>
              </p>
            </div>
            <div class="text-xs text-slate-500 font-mono pt-4 border-t border-slate-800">
              <span class="text-blue-400">Step 1:</span> get_catalog / search
            </div>
          </div>

          <!-- Step 2: Aniq hisoblaydi -->
          <div class="card-glass p-8 rounded-2xl relative overflow-hidden flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg mb-6">
                02
              </div>
              <h3 class="text-xl font-bold text-white mb-2 flex items-center justify-between">
                <span class="lang-uz">2. Aniq hisoblaydi</span>
                <span class="lang-en">2. Calculate Quote</span>
                <span class="text-[11px] font-mono font-normal text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded">request_quote</span>
              </h3>
              <p class="text-sm text-slate-300 leading-relaxed mt-3 mb-4">
                <span class="lang-uz">Provider’dan narx, mavjudlik va shartlarni tekshiradi.</span>
                <span class="lang-en">Calculates real-time prices, availability, delivery fees, and conditions directly from provider APIs.</span>
              </p>
            </div>
            <div class="text-xs text-slate-500 font-mono pt-4 border-t border-slate-800">
              <span class="text-amber-400">Step 2:</span> verified quote breakdown
            </div>
          </div>

          <!-- Step 3: Siz tasdiqlaysiz -->
          <div class="card-glass p-8 rounded-2xl relative overflow-hidden flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg mb-6">
                03
              </div>
              <h3 class="text-xl font-bold text-white mb-2 flex items-center justify-between">
                <span class="lang-uz">3. Siz tasdiqlaysiz</span>
                <span class="lang-en">3. You Confirm</span>
                <span class="text-[11px] font-mono font-normal text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded">create_action</span>
              </h3>
              <p class="text-sm text-slate-300 leading-relaxed mt-3 mb-4">
                <span class="lang-uz">Faqat siz rozilik berganingizdan keyin action yaratiladi va xavfsiz to‘lov/buyurtma havolasi beriladi.</span>
                <span class="lang-en">Actions are created only after explicit user approval, returning a secure provider-owned checkout link.</span>
              </p>
            </div>
            <div class="text-xs text-slate-500 font-mono pt-4 border-t border-slate-800">
              <span class="text-emerald-400">Step 3:</span> user-confirmed handoff
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- 4. Visual Conversation Flow (Replacing fake JSON inspector) -->
    <section class="py-20 bg-slate-900/30 border-b border-slate-900">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-2xl mx-auto mb-12">
          <h2 class="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2 font-mono">
            <span class="lang-uz">FOYDALANUVCHI TAJRIBASI</span>
            <span class="lang-en">CONVERSATIONAL EXPERIENCE</span>
          </h2>
          <p class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            <span class="lang-uz">AI chatda qanday ko‘rinadi?</span>
            <span class="lang-en">How It Looks in AI Chat</span>
          </p>
          <p class="text-xs sm:text-sm text-slate-400 mt-2">
            <span class="lang-uz">Foydalanuvchi oddiy tilda so‘raydi, Zayuno orqali agent aniq javob beradi.</span>
            <span class="lang-en">User asks in plain language; AI queries verified providers and presents structured results.</span>
          </p>
        </div>

        <!-- Chat Mockup Window -->
        <div class="card-glass-static rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
          
          <!-- Window Header -->
          <div class="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-slate-700"></span>
              <span class="w-3 h-3 rounded-full bg-slate-700"></span>
              <span class="w-3 h-3 rounded-full bg-slate-700"></span>
              <span class="text-xs font-medium text-slate-300 ml-2">ChatGPT / AI Assistant</span>
            </div>
            <span class="text-[11px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10">
              <span class="lang-uz">Ko‘rgazmali misol</span>
              <span class="lang-en">Illustrative Example</span>
            </span>
          </div>

          <!-- Chat Messages -->
          <div class="p-6 sm:p-8 space-y-6 text-sm">
            
            <!-- User Message -->
            <div class="flex items-start justify-end gap-3">
              <div class="bg-emerald-600 text-white px-4 py-3 rounded-2xl rounded-tr-none max-w-lg shadow-sm">
                <p class="font-medium">
                  <span class="lang-uz">“Toshkentda NestJS developer top.”</span>
                  <span class="lang-en">“Find a NestJS developer in Tashkent.”</span>
                </p>
              </div>
              <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                U
              </div>
            </div>

            <!-- Agent Thinking / Query -->
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-xs">
                Z
              </div>
              <div class="bg-slate-900 border border-slate-800 text-slate-300 px-4 py-3 rounded-2xl rounded-tl-none max-w-xl space-y-3">
                <div class="flex items-center gap-2 text-xs text-cyan-400 font-mono">
                  <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span class="lang-uz">Mos nomzodlarni qidiryapman...</span>
                  <span class="lang-en">Searching for matching candidates...</span>
                </div>
                <p class="text-slate-200">
                  <span class="lang-uz">3 ta mos e’lon topildi. Skill, tajriba va Telegram post havolasini ko‘rsataman:</span>
                  <span class="lang-en">Found 3 matching listings with verified skills, experience, and direct Telegram links:</span>
                </p>

                <!-- Candidate Results Cards -->
                <div class="space-y-2.5 pt-1">
                  <div class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                    <div class="flex items-center justify-between font-bold text-white mb-1">
                      <span>Senior NestJS Engineer</span>
                      <span class="text-emerald-400 font-mono">$2,500 – $3,500</span>
                    </div>
                    <p class="text-slate-400 text-[11px] mb-1.5">
                      <span class="lang-uz">5 yillik tajriba • TypeScript, Microservices, PostgreSQL, Redis</span>
                      <span class="lang-en">5+ years exp • TypeScript, Microservices, PostgreSQL, Redis</span>
                    </p>
                    <span class="text-cyan-400 font-mono text-[10px]">t.me/dev_channel/4129 ↗</span>
                  </div>

                  <div class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                    <div class="flex items-center justify-between font-bold text-white mb-1">
                      <span>Fullstack NestJS + React Dev</span>
                      <span class="text-emerald-400 font-mono">$1,800 – $2,400</span>
                    </div>
                    <p class="text-slate-400 text-[11px] mb-1.5">
                      <span class="lang-uz">3 yillik tajriba • Next.js, NestJS, Tailwind, Prisma</span>
                      <span class="lang-en">3 years exp • Next.js, NestJS, Tailwind, Prisma</span>
                    </p>
                    <span class="text-cyan-400 font-mono text-[10px]">t.me/dev_channel/4088 ↗</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

          <!-- Bottom link -->
          <div class="bg-slate-900/60 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span class="text-slate-400">
              <span class="lang-uz">Dasturchilar uchun MCP integratsiya standarti</span>
              <span class="lang-en">MCP integration standard for developers</span>
            </span>
            <a href="https://developers.zayuno.uz/docs" class="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1">
              <span class="lang-uz">Texnik MCP kontraktini ko‘rish →</span>
              <span class="lang-en">View technical MCP contracts →</span>
            </a>
          </div>

        </div>

      </div>
    </section>

    <!-- 5. Use Cases: "Zayuno bilan nimalar qilish mumkin?" -->
    <section class="py-20 bg-slate-950 border-b border-slate-900">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-2xl mx-auto mb-16">
          <h2 class="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 font-mono">
            <span class="lang-uz">FOYDALANISH SOHALARI</span>
            <span class="lang-en">USE CASES</span>
          </h2>
          <p class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            <span class="lang-uz">Zayuno bilan nimalar qilish mumkin?</span>
            <span class="lang-en">What Can You Build with Zayuno?</span>
          </p>
          <p class="text-slate-400 mt-3 text-sm sm:text-base">
            <span class="lang-uz">Barcha misollar ko‘rgazmali bo‘lib, har bir integratsiya provider tomonidan mustaqil boshqariladi.</span>
            <span class="lang-en">All use cases are illustrative; every integration is managed directly by the provider.</span>
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <!-- Use Case 1 -->
          <div class="card-glass p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl mb-4">
                🍔
              </div>
              <h3 class="text-lg font-bold text-white mb-2">
                <span class="lang-uz">Ovqat va delivery</span>
                <span class="lang-en">Food & Delivery</span>
              </h3>
              <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                <span class="lang-uz">Menyu ko‘rish, narx hisoblash va buyurtma oqimi.</span>
                <span class="lang-en">Browse menus, calculate real-time quotes, and initiate food orders.</span>
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
              <span class="lang-uz">Misol: Restoran menyusi</span>
              <span class="lang-en">Example: Restaurant menu</span>
            </div>
          </div>

          <!-- Use Case 2 -->
          <div class="card-glass p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-2xl mb-4">
                💼
              </div>
              <h3 class="text-lg font-bold text-white mb-2">
                <span class="lang-uz">Xodim topish</span>
                <span class="lang-en">Recruitment & Jobs</span>
              </h3>
              <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                <span class="lang-uz">Mos nomzodlar yoki vakansiyalarni public recruitment feed’lardan qidirish.</span>
                <span class="lang-en">Search qualified candidates or job postings from public feeds.</span>
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
              <span class="lang-uz">Misol: Vakansiyalar qidiruvi</span>
              <span class="lang-en">Example: Candidate search</span>
            </div>
          </div>

          <!-- Use Case 3 -->
          <div class="card-glass p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-2xl mb-4">
                🎫
              </div>
              <h3 class="text-lg font-bold text-white mb-2">
                <span class="lang-uz">Chipta va booking</span>
                <span class="lang-en">Ticketing & Booking</span>
              </h3>
              <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                <span class="lang-uz">Yo‘nalish, mavjud joy va narxni tekshirish.</span>
                <span class="lang-en">Check routes, seat availability, and verified ticket pricing.</span>
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
              <span class="lang-uz">Misol: Chiptalar bron qilish</span>
              <span class="lang-en">Example: Reservation check</span>
            </div>
          </div>

          <!-- Use Case 4 -->
          <div class="card-glass p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl mb-4">
                ⚡
              </div>
              <h3 class="text-lg font-bold text-white mb-2">
                <span class="lang-uz">Sizning biznesingiz</span>
                <span class="lang-en">Your Business API</span>
              </h3>
              <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                <span class="lang-uz">Mavjud API’ingizni provider sifatida ulang.</span>
                <span class="lang-en">Connect your custom API or backend as a verified provider.</span>
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
              <span class="lang-uz">Misol: Maxsus API adapter</span>
              <span class="lang-en">Example: Custom adapter</span>
            </div>
          </div>

        </div>

      </div>
    </section>

    <!-- 6. Live vs Sandbox Strict Separation Section -->
    <section class="py-20 bg-slate-900/30 border-b border-slate-900">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-2xl mx-auto mb-16">
          <h2 class="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2 font-mono">
            <span class="lang-uz">MUHITLAR AJRATILISHI</span>
            <span class="lang-en">ENVIRONMENT SEPARATION</span>
          </h2>
          <p class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            <span class="lang-uz">Sinov va real integratsiya — alohida oqimlar</span>
            <span class="lang-en">Testing vs. Production — Distinct Flows</span>
          </p>
          <p class="text-slate-400 mt-3 text-sm sm:text-base">
            <span class="lang-uz">Test muhiti real mablag‘ va buyurtmalarga mutlaqo ta’sir qilmaydi.</span>
            <span class="lang-en">Simulations run in isolated environments with zero risk to live business operations.</span>
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <!-- Sandbox Card -->
          <div class="card-glass p-8 rounded-2xl flex flex-col justify-between border-slate-800">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold font-mono">
                  🧪 SANDBOX ENVIRONMENT
                </span>
              </div>
              <h3 class="text-2xl font-bold text-white mb-3">
                <span class="lang-uz">Integratsiyani xavfsiz sinang</span>
                <span class="lang-en">Test Integrations Safely</span>
              </h3>
              <p class="text-sm text-slate-300 mb-6 leading-relaxed">
                <span class="lang-uz">Dasturchilar uchun maxsus simulyatsiya muhiti. MCP va action oqimlarini tekshirish uchun qulay.</span>
                <span class="lang-en">Isolated simulator environment for testing MCP agents, catalog browsing, and mock checkouts.</span>
              </p>

              <ul class="space-y-3 text-sm text-slate-300 mb-8">
                <li class="flex items-center gap-3">
                  <span class="text-cyan-400 font-bold">•</span>
                  <span class="lang-uz">Integratsiyani xavfsiz sinang</span>
                  <span class="lang-en">Test integrations safely with mock data</span>
                </li>
                <li class="flex items-center gap-3">
                  <span class="text-cyan-400 font-bold">•</span>
                  <span class="lang-uz">Test kataloglar va test checkout</span>
                  <span class="lang-en">Simulated catalogs and mock checkout flows</span>
                </li>
                <li class="flex items-center gap-3">
                  <span class="text-cyan-400 font-bold">•</span>
                  <span class="lang-uz">Haqiqiy to‘lov yoki buyurtma emas</span>
                  <span class="lang-en">No real money or live orders involved</span>
                </li>
              </ul>
            </div>

            <a href="https://developers.zayuno.uz/docs#sandbox" class="inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 font-bold text-sm transition">
              <span class="lang-uz">Sandbox docs →</span>
              <span class="lang-en">Sandbox Docs →</span>
            </a>
          </div>

          <!-- Real Provider Card -->
          <div class="card-glass p-8 rounded-2xl flex flex-col justify-between border-slate-800">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
                  ⚡ PRODUCTION PROVIDER
                </span>
              </div>
              <h3 class="text-2xl font-bold text-white mb-3">
                <span class="lang-uz">Haqiqiy biznes integratsiyasi</span>
                <span class="lang-en">Production Business Integration</span>
              </h3>
              <p class="text-sm text-slate-300 mb-6 leading-relaxed">
                <span class="lang-uz">Tasdiqlangan va sertifikatlangan real providerlar orqali mijozlarga xizmat ko‘rsatish.</span>
                <span class="lang-en">Real-world business integration providing actual services to users through AI agents.</span>
              </p>

              <ul class="space-y-3 text-sm text-slate-300 mb-8">
                <li class="flex items-center gap-3">
                  <span class="text-emerald-400 font-bold">•</span>
                  <span class="lang-uz">Haqiqiy biznes integratsiyasi</span>
                  <span class="lang-en">Production integration with live business APIs</span>
                </li>
                <li class="flex items-center gap-3">
                  <span class="text-emerald-400 font-bold">•</span>
                  <span class="lang-uz">Approval + certification’dan keyin AI discovery’ga chiqadi</span>
                  <span class="lang-en">Public discovery enabled after review, approval, and certification</span>
                </li>
                <li class="flex items-center gap-3">
                  <span class="text-emerald-400 font-bold">•</span>
                  <span class="lang-uz">Provider o‘zining katalogi, narxi va checkout flow’ini nazorat qiladi</span>
                  <span class="lang-en">Provider retains full control over catalog, pricing, and checkout</span>
                </li>
              </ul>
            </div>

            <a href="https://developers.zayuno.uz" class="inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md transition">
              <span class="lang-uz">Provider bo‘lish →</span>
              <span class="lang-en">Become a Provider →</span>
            </a>
          </div>

        </div>

      </div>
    </section>

    <!-- 7. Trust & Security Section -->
    <section id="security" class="py-20 bg-slate-950 border-b border-slate-900">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-2xl mx-auto mb-16">
          <h2 class="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2 font-mono">
            <span class="lang-uz">XAVFSIZLIK VA ISHONCH</span>
            <span class="lang-en">SECURITY FIRST</span>
          </h2>
          <p class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            <span class="lang-uz">Har bir action nazorat ostida</span>
            <span class="lang-en">Every Action Under Control</span>
          </p>
          <p class="text-slate-400 mt-3 text-sm sm:text-base">
            <span class="lang-uz">AI agentlar va bizneslar uchun ishonchli va xavfsiz arxitektura.</span>
            <span class="lang-en">Robust boundaries ensure safety for both consumers and business providers.</span>
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div class="card-glass p-6 rounded-2xl">
            <div class="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg mb-4">🛡️</div>
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">Tasdiqlashsiz action yo‘q</span>
              <span class="lang-en">No Action Without Confirmation</span>
            </h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              <span class="lang-uz">Foydalanuvchi chatda narx va shartlarni tasdiqlamaguncha buyurtma yaratilmaydi.</span>
              <span class="lang-en">Actions require itemized quote calculation and explicit affirmative confirmation in chat.</span>
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg mb-4">🔒</div>
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">Karta ma’lumoti saqlanmaydi</span>
              <span class="lang-en">Zero Card Data in Chat</span>
            </h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              <span class="lang-uz">Karta raqamlari yoki bank ma'lumotlari chatda so'ralmaydi. To'lov faqat providerning xavfsiz checkout sahifasida bo'ladi.</span>
              <span class="lang-en">Zayuno never requests or stores payment card data. Payment occurs via provider HTTPS redirection.</span>
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-lg mb-4">🔑</div>
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">Imzoli webhook’lar</span>
              <span class="lang-en">HMAC Signed Webhooks</span>
            </h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              <span class="lang-uz">Provider webhook’lari kriptografik SHA-256 HMAC imzosi bilan tekshiriladi.</span>
              <span class="lang-en">Provider callbacks are verified with constant-time SHA-256 HMAC signatures.</span>
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <div class="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-lg mb-4">⚡</div>
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">Takroriy so‘rovdan himoya</span>
              <span class="lang-en">Idempotent Protection</span>
            </h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              <span class="lang-uz">Takroriy so‘rovlar duplicate action yaratmasligi uchun himoyalangan.</span>
              <span class="lang-en">Actions are strictly protected against duplicate charges during network retries.</span>
            </p>
          </div>

        </div>
      </div>
    </section>

    <!-- 8. Real FAQ Section -->
    <section id="faq" class="py-20 bg-slate-950 border-b border-slate-900">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center mb-16">
          <h2 class="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 font-mono">FAQ</h2>
          <p class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            <span class="lang-uz">Ko‘p beriladigan savollar</span>
            <span class="lang-en">Frequently Asked Questions</span>
          </p>
        </div>

        <div class="space-y-4">
          
          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">Zayuno nima?</span>
              <span class="lang-en">What is Zayuno?</span>
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span class="lang-uz">Zayuno — bu AI agentlar (masalan, ChatGPT, Claude) bilan real biznes xizmatlarini Model Context Protocol (MCP) orqali bog‘lovchi biznes tarmog‘i. U AI modellarga katalogni ko‘rish, aniq narx hisoblash va tasdiqlangan buyurtmalarni amalga oshirish imkonini beradi.</span>
              <span class="lang-en">Zayuno is a business network connecting conversational AI agents (such as ChatGPT, Claude, and autonomous agents) to real-world business services through the Model Context Protocol (MCP) and verified capability contracts.</span>
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">Biznesimni qanday ulayman?</span>
              <span class="lang-en">How do I connect my business?</span>
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span class="lang-uz">Biznesingizning katalogi yoki API’sini <code>@zayuno/provider-sdk</code> yordamida ulab, Developer Portal orqali ariza topshirasiz. Tekshiruvdan so‘ng xizmatingiz AI agentlar qidiruvida faollashadi.</span>
              <span class="lang-en">Implement the lightweight adapter interface defined in <code>@zayuno/provider-sdk</code> and submit your integration for review via the Developer Portal.</span>
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">Provider qachon public qidiruvga chiqadi?</span>
              <span class="lang-en">When does a provider become publicly discoverable?</span>
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span class="lang-uz">Provider approval (moderatsiya tekshiruvi), publication va certification talablaridan o‘tgach discovery’da ko‘rinadi.</span>
              <span class="lang-en">A provider becomes publicly discoverable only after passing moderation review, meeting publication criteria, and completing certification.</span>
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">Sandbox va real provider farqi nima?</span>
              <span class="lang-en">What is the difference between Sandbox and Real Providers?</span>
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span class="lang-uz">Sandbox — bu dasturchilar uchun xavfsiz test muhiti bo‘lib, unda test katalog va test checkout ishlaydi, hech qanday real to‘lov yoki buyurtma bo‘lmaydi. Real provider esa tasdiqlangan haqiqiy biznes integratsiyasidir.</span>
              <span class="lang-en">Sandbox is an isolated testing environment with simulated data and test checkouts with zero real money risk. Real providers are verified production integrations that fulfill real services.</span>
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">Zayuno to‘lov ma’lumotlarini saqlaydimi?</span>
              <span class="lang-en">Does Zayuno store payment card details?</span>
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span class="lang-uz">Yo‘q. Zayuno chatida karta raqamlari, CVV yoki bank hisob ma’lumotlari saqlanmaydi va so‘ralmaydi. To‘lov faqat providerning o‘z checkout sahifasida amalga oshiriladi.</span>
              <span class="lang-en">No. Zayuno enforces a strict Zero Card Data Policy. Card numbers and banking credentials are never handled in chat; payments occur directly on provider checkout pages.</span>
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">Qanday AI agentlar bilan ishlaydi?</span>
              <span class="lang-en">Which AI agents does Zayuno work with?</span>
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span class="lang-uz">Zayuno Model Context Protocol (MCP) standartini qo‘llab-quvvatlaydigan barcha AI vositalari (ChatGPT, Claude, Cursor, avtonom agentlar) bilan ishlaydi.</span>
              <span class="lang-en">Zayuno works with any AI system supporting the Model Context Protocol (MCP) and standard HTTP APIs, including ChatGPT, Claude, and custom autonomous agents.</span>
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">Provider API’si bo‘lmasa nima qilaman?</span>
              <span class="lang-en">What if a provider doesn't have an API yet?</span>
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span class="lang-uz">Agar biznesingizda tayyor API bo‘lmasa, Developer Portal orqali katalogingizni strukturaviy formatda kiritish yoki biz bilan bog‘lanib integratsiya yordamini olishingiz mumkin.</span>
              <span class="lang-en">If you do not have a dedicated API, you can publish structured catalogs via the Developer Portal or reach out to our team for integration assistance.</span>
            </p>
          </div>

          <div class="card-glass p-6 rounded-2xl">
            <h3 class="text-base font-bold text-white mb-2">
              <span class="lang-uz">Support bilan qayerdan bog‘lanaman?</span>
              <span class="lang-en">Where can I reach support?</span>
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span class="lang-uz">Biz bilan <a href="mailto:support@zayuno.uz" class="text-emerald-400 underline">support@zayuno.uz</a> (umumiy) yoki <a href="mailto:dev@zayuno.uz" class="text-cyan-400 underline">dev@zayuno.uz</a> (developerlar) orqali yoki <a href="/support" class="text-emerald-400 underline">/support</a> sahifasidan bog‘lanishingiz mumkin.</span>
              <span class="lang-en">Reach us at <a href="mailto:support@zayuno.uz" class="text-emerald-400 underline">support@zayuno.uz</a>, <a href="mailto:dev@zayuno.uz" class="text-cyan-400 underline">dev@zayuno.uz</a>, or via our <a href="/support" class="text-emerald-400 underline">Support Desk</a>.</span>
            </p>
          </div>

        </div>

      </div>
    </section>

    <!-- 9. Call To Action Banner -->
    <section class="py-20 bg-gradient-to-b from-slate-950 to-slate-900">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div class="p-10 sm:p-14 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-cyan-950/60 border border-emerald-500/20 shadow-2xl relative overflow-hidden">
          <div class="relative z-10 max-w-2xl mx-auto">
            <h2 class="text-2xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">
              <span class="lang-uz">Xizmatingizni AI agentlarga ulashga tayyormisiz?</span>
              <span class="lang-en">Ready to Connect Your Service to AI Agents?</span>
            </h2>
            <p class="text-sm sm:text-base text-slate-300 mb-8 leading-relaxed">
              <span class="lang-uz">Sandbox’da sinab ko‘ring yoki biznesingizni provider sifatida ro‘yxatdan o‘tkazing.</span>
              <span class="lang-en">Explore the developer sandbox or register your business as a verified provider.</span>
            </p>
            <div class="flex flex-wrap items-center justify-center gap-4">
              <a href="https://developers.zayuno.uz" class="px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition">
                <span class="lang-uz">Biznesimni ulash →</span>
                <span class="lang-en">Connect Business →</span>
              </a>
              <a href="/support" class="px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition">
                <span class="lang-uz">Bog‘lanish / Support</span>
                <span class="lang-en">Contact Support</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

  </main>

  ${this.getSharedFooter()}
</body>
</html>`;
  }

  private renderPrivacyHtml(): string {
    const privacySchema = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Maxfiylik Siyosati — Zayuno',
      url: 'https://zayuno.uz/privacy',
      description:
        'Zayuno maxfiylik siyosati: operatsion ma’lumotlar, aloqa detallari va xavfsiz to‘lov oqimi qanday boshqariladi.',
    };

    return `<!DOCTYPE html>
<html lang="uz" class="dark">
<head>
  ${this.getSharedHead(
    'Maxfiylik Siyosati — Zayuno',
    'Zayuno maxfiylik siyosati: Zero-Card-Data siyosati, operatsion ma’lumotlar va xavfsiz to‘lov oqimi.',
    '/privacy',
    [privacySchema],
  )}
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased lang-uz">
  ${this.getSharedNavbar()}

  <main class="flex-grow py-12 lg:py-16">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

      <div class="mb-10">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          <span class="lang-uz">Maxfiylik Siyosati</span>
          <span class="lang-en">Privacy Policy</span>
        </h1>
        <p class="text-xs text-slate-400 mt-2 font-mono">
          <span class="lang-uz">Kuchga kirish sanasi: 2026-yil 20-avgust</span>
          <span class="lang-en">Effective Date: August 20, 2026</span>
        </p>
      </div>

      <div class="prose prose-invert max-w-none text-slate-300 text-sm space-y-8 leading-relaxed">
        
        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">
            <span class="lang-uz">1. Umumiy qoidalar</span>
            <span class="lang-en">1. Overview & Scope</span>
          </h2>
          <p class="lang-uz">
            Zayuno ("biz") AI agentlar (ChatGPT, Claude va boshqalar) bilan real biznes providerlarni bog‘lovchi texnologik tarmoq xizmatini taqdim etadi.
          </p>
          <p class="lang-en">
            Zayuno ("we", "us", "our") provides business network and middleware connecting conversational AI applications with integrated external provider adapters.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">
            <span class="lang-uz">2. Qayta ishlanadigan ma’lumotlar</span>
            <span class="lang-en">2. Information We Process</span>
          </h2>
          <p class="lang-uz">AI agent orqali xizmat yoki quote so‘ralganda, buyurtmani bajarish uchun minimal zarur ma’lumotlar qayta ishlanadi:</p>
          <p class="lang-en">When an AI agent executes an action or requests a quote on your behalf, Zayuno processes minimal operational data necessary for fulfillment:</p>
          <ul class="list-disc pl-5 space-y-1.5 text-slate-300">
            <li class="lang-uz"><strong>Aloqa ma’lumotlari:</strong> Ism, telefon raqami yoki xizmatni bajarish uchun taqdim etilgan kontakt.</li>
            <li class="lang-en"><strong>Customer Contact Details:</strong> Name, phone number, and optional email provided for action fulfillment.</li>
            <li class="lang-uz"><strong>Buyurtma parametrlari:</strong> Tanlangan xizmat yoki mahsulot, miqdor va manzil.</li>
            <li class="lang-en"><strong>Action Specifications:</strong> Selected offerings, options, quantity, and destination.</li>
            <li class="lang-uz"><strong>Texnik ma’lumotlar:</strong> Idempotency kaliti, buyurtma ID va vaqt belgilari.</li>
            <li class="lang-en"><strong>Technical Interaction Data:</strong> Unique action identifiers, idempotency keys, and server timestamps.</li>
          </ul>
        </section>

        <section class="space-y-3 p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <h2 class="text-base font-bold text-emerald-400 flex items-center gap-2">
            <span>🔒</span>
            <span class="lang-uz">3. To‘lovlar va Karta Ma’lumotlari Xavfsizligi</span>
            <span class="lang-en">3. Payment Processing & Zero Card Data Policy</span>
          </h2>
          <p class="text-slate-300 lang-uz">
            <strong>Zayuno HECH QACHON to‘lov karta raqamlari, CVV/CVC kodlari yoki bank parollarini chatda saqlamaydi va so‘ramaydi.</strong>
          </p>
          <p class="text-slate-300 lang-en">
            <strong>Zayuno NEVER collects, processes, or stores sensitive payment card credentials</strong> (including card numbers, CVVs, passwords, or banking logins).
          </p>
          <p class="text-slate-300 lang-uz">
            To‘lovlar faqat providerning o‘z xavfsiz HTTPS checkout sahifasida amalga oshiriladi.
          </p>
          <p class="text-slate-300 lang-en">
            Payment transactions occur exclusively on provider-supplied external checkout links via secure HTTPS redirection.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">
            <span class="lang-uz">4. Ma’lumotlarni uchinchi tomonga uzatish</span>
            <span class="lang-en">4. Third-Party Data Transmission</span>
          </h2>
          <p class="lang-uz">
            Buyurtmani bajarish uchun zarur bo‘lgan parametrlar faqat siz tanlagan rasmiy providerga uzatiladi. Ma’lumotlar hech qachon reklama kompaniyalariga sotilmaydi.
          </p>
          <p class="lang-en">
            Contact details and action parameters are transmitted strictly to the designated provider adapter chosen by the user. We do not monetize personal information.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">
            <span class="lang-uz">5. Aloqa va murojaat</span>
            <span class="lang-en">5. Contact & Inquiries</span>
          </h2>
          <p class="lang-uz">Maxfiylik bo‘yicha savollar va murojaatlar uchun:</p>
          <p class="lang-en">For questions or privacy requests regarding the platform, contact our desk at:</p>
          <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
            <p>Zayuno Operations Desk</p>
            <p>Email: <span class="text-emerald-400 font-bold">support@zayuno.uz</span></p>
            <p>Tashkent, Uzbekistan</p>
          </div>
        </section>

      </div>
    </div>
  </main>

  ${this.getSharedFooter()}
</body>
</html>`;
  }

  private renderTermsHtml(): string {
    const termsSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Foydalanish Shartlari — Zayuno',
      url: 'https://zayuno.uz/terms',
      description:
        'Zayuno foydalanish shartlari: AI agentlar orqali xizmat ko‘rsatish va provider integratsiyasi shartlari.',
    };

    return `<!DOCTYPE html>
<html lang="uz" class="dark">
<head>
  ${this.getSharedHead(
    'Foydalanish Shartlari — Zayuno',
    'Zayuno tarmog‘idan foydalanish shartlari va provider integratsiyasi qoidalari.',
    '/terms',
    [termsSchema],
  )}
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased lang-uz">
  ${this.getSharedNavbar()}

  <main class="flex-grow py-12 lg:py-16">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

      <div class="mb-10">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          <span class="lang-uz">Foydalanish Shartlari</span>
          <span class="lang-en">Terms of Service</span>
        </h1>
        <p class="text-xs text-slate-400 mt-2 font-mono">
          <span class="lang-uz">Kuchga kirish sanasi: 2026-yil 20-avgust</span>
          <span class="lang-en">Effective Date: August 20, 2026</span>
        </p>
      </div>

      <div class="prose prose-invert max-w-none text-slate-300 text-sm space-y-8 leading-relaxed">
        
        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">
            <span class="lang-uz">1. Shartlarga rozilik</span>
            <span class="lang-en">1. Agreement to Terms</span>
          </h2>
          <p class="lang-uz">
            Zayuno xizmatlaridan AI chat interfeyslari, ChatGPT plaginlari, Claude vositalari yoki to‘g‘ridan-to‘g‘ri API orqali foydalanish orqali siz ushbu Foydalanish Shartlariga rozilik bildirasiz.
          </p>
          <p class="lang-en">
            By accessing or using the Zayuno infrastructure through conversational AI plugins, ChatGPT apps, Claude tools, or direct developer APIs, you agree to these Terms of Service.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">
            <span class="lang-uz">2. Platformaning vositachilik roli</span>
            <span class="lang-en">2. Platform Intermediary Role</span>
          </h2>
          <p class="lang-uz">
            Zayuno AI agentlar va xizmat ko‘rsatuvchi mustaqil providerlar o‘rtasida texnologik bog‘lovchi vositachi sifatida ishlaydi. Mahsulotlar sifati, yetkazib berish va xizmat ko‘rsatish bevosita providerning javobgarligida bo‘ladi.
          </p>
          <p class="lang-en">
            Zayuno operates strictly as a technology platform and action protocol intermediary. Goods, professional services, scheduling, and fulfillment are the responsibility of the executing provider.
          </p>
        </section>

        <section class="space-y-3 p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <h2 class="text-base font-bold text-amber-400 flex items-center gap-2">
            <span>🛡️</span>
            <span class="lang-uz">3. Tasdiqlash va Aniq Hisob-kitob Qoidasi</span>
            <span class="lang-en">3. Quotation & Explicit Confirmation</span>
          </h2>
          <p class="text-slate-300 lang-uz">
            AI orqali xato buyurtmalar yaratilishining oldini olish uchun Zayuno qat’iy protokolni talab qiladi:
          </p>
          <p class="text-slate-300 lang-en">
            To prevent unintended action execution through conversational AI, all integrations enforce mandatory guardrails:
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-slate-300">
            <li class="lang-uz">AI model avval providerdan aniq quote (narx, xizmat haqi, yetkazib berish) hisoblaydi.</li>
            <li class="lang-en">The model must first compute an itemized <code>request_quote</code> with exact fees and totals.</li>
            <li class="lang-uz">Foydalanuvchi chatda aniq tasdiqlamaguncha (masalan, "Ha, buyurtma qilinsin") hech qanday buyurtma yaratilmaydi.</li>
            <li class="lang-en">No action is executed until the user provides explicit affirmative confirmation in chat.</li>
          </ol>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">
            <span class="lang-uz">4. Sandbox va Sinov Qoidalari</span>
            <span class="lang-en">4. Sandbox & Testing Notice</span>
          </h2>
          <p class="lang-uz">
            Sandbox muhitidagi simulyatorlar faqat texnik integratsiyani sinash uchun mo‘ljallangan bo‘lib, unda haqiqiy to‘lovlar amalga oshirilmaydi.
          </p>
          <p class="lang-en">
            Demonstrations utilizing the sandbox provider operate within a simulated testing environment for protocol verification.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">
            <span class="lang-uz">5. Murojaat va Savollar</span>
            <span class="lang-en">5. Inquiries & Support</span>
          </h2>
          <p class="lang-uz">
            Foydalanish shartlari yuzasidan savollar bo‘yicha <a href="mailto:support@zayuno.uz" class="text-emerald-400 underline">support@zayuno.uz</a> manziliga murojaat qilishingiz mumkin.
          </p>
          <p class="lang-en">
            For questions regarding these Terms, contact our help desk at <a href="mailto:support@zayuno.uz" class="text-emerald-400 underline">support@zayuno.uz</a>.
          </p>
        </section>

      </div>
    </div>
  </main>

  ${this.getSharedFooter()}
</body>
</html>`;
  }

  private renderSupportHtml(): string {
    const supportSchema = {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Mijozlarni Qo‘llab-quvvatlash — Zayuno',
      url: 'https://zayuno.uz/support',
      description:
        'Zayuno mijozlarni qo‘llab-quvvatlash markazi: buyurtma holatini tekshirish, integratsiya va texnik yordam.',
    };

    return `<!DOCTYPE html>
<html lang="uz" class="dark">
<head>
  ${this.getSharedHead(
    'Mijozlarni Qo‘llab-quvvatlash — Zayuno',
    'Zayuno qo‘llab-quvvatlash markazi: buyurtma holatini tekshirish, texnik savollar va provider integratsiyasi.',
    '/support',
    [supportSchema],
  )}
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased lang-uz">
  ${this.getSharedNavbar()}

  <main class="flex-grow py-12 lg:py-16">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <div class="mb-10 text-center sm:text-left">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          <span class="lang-uz">Qo‘llab-quvvatlash Markazi</span>
          <span class="lang-en">Customer Support & Help Desk</span>
        </h1>
        <p class="text-sm text-slate-400 mt-2">
          <span class="lang-uz">AI agentlar orqali amalga oshirilgan harakatlar va texnik integratsiyalar bo‘yicha yordam.</span>
          <span class="lang-en">Assistance with actions, orders, and technical integrations placed through AI agents.</span>
        </p>
      </div>

      <!-- Quick Contact Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span class="text-2xl mb-2 block">✉️</span>
          <h3 class="font-bold text-white text-sm">
            <span class="lang-uz">Umumiy yordam</span>
            <span class="lang-en">General Support</span>
          </h3>
          <p class="text-xs text-slate-400 mt-1 font-mono text-emerald-400 font-bold">support@zayuno.uz</p>
          <p class="text-[11px] text-slate-500 mt-2">
            <span class="lang-uz">Buyurtma va xizmatlar bo‘yicha</span>
            <span class="lang-en">Action & order assistance</span>
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span class="text-2xl mb-2 block">💬</span>
          <h3 class="font-bold text-white text-sm">
            <span class="lang-uz">Developer & Providerlar</span>
            <span class="lang-en">Developer & Provider Desk</span>
          </h3>
          <p class="text-xs text-slate-400 mt-1 font-mono text-cyan-400 font-bold">dev@zayuno.uz</p>
          <p class="text-[11px] text-slate-500 mt-2">
            <span class="lang-uz">SDK va MCP integratsiya</span>
            <span class="lang-en">SDK & MCP integration</span>
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span class="text-2xl mb-2 block">📍</span>
          <h3 class="font-bold text-white text-sm">
            <span class="lang-uz">Bosh ofis</span>
            <span class="lang-en">Headquarters</span>
          </h3>
          <p class="text-xs text-slate-400 mt-1">Tashkent, Uzbekistan</p>
          <p class="text-[11px] text-slate-500 mt-2">Zayuno Network</p>
        </div>
      </div>

      <!-- FAQ Section -->
      <div class="space-y-6">
        <h2 class="text-xl font-bold text-white tracking-tight mb-4">
          <span class="lang-uz">Ko‘p so‘raladigan savollar</span>
          <span class="lang-en">Frequently Asked Questions</span>
        </h2>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 class="font-bold text-white text-sm mb-1.5">
            <span class="lang-uz">Buyurtma holatini qanday tekshiraman?</span>
            <span class="lang-en">How do I track my active action or order?</span>
          </h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            <span class="lang-uz">ChatGPT yoki AI agentingizda <code>get_action</code> buyrug‘i orqali (masalan, <em>"Buyurtmam holatini tekshir"</em>) real vaqtda yangilanishlarni ko‘rishingiz mumkin.</span>
            <span class="lang-en">You can query status directly through ChatGPT using the <code>get_action</code> tool to see real-time timeline events.</span>
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 class="font-bold text-white text-sm mb-1.5">
            <span class="lang-uz">To‘lovlar qanday amalga oshiriladi?</span>
            <span class="lang-en">How are payments handled?</span>
          </h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            <span class="lang-uz">To‘lovlar faqat providerning o‘z rasmiy HTTPS checkout sahifasida amalga oshiriladi. Zayuno karta ma’lumotlarini saqlamaydi.</span>
            <span class="lang-en">Payments occur directly on provider-supplied external checkout links via secure HTTPS redirection.</span>
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 class="font-bold text-white text-sm mb-1.5">
            <span class="lang-uz">Buyurtmani bekor qilish mumkinmi?</span>
            <span class="lang-en">Can I cancel an action?</span>
          </h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            <span class="lang-uz">Provider hali buyurtmani yakunlamagan yoki jo‘natmagan bo‘lsa, AI agent orqali <code>cancel_action</code> buyrug‘i bilan bekor qilish mumkin.</span>
            <span class="lang-en">Actions can be cancelled prior to fulfillment lock using the <code>cancel_action</code> tool in ChatGPT or via API.</span>
          </p>
        </div>
      </div>

    </div>
  </main>

  ${this.getSharedFooter()}
</body>
</html>`;
  }
}
