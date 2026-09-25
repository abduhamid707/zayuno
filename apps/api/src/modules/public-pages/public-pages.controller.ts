import { Controller, Get, Res, Param, Req } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response, Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getOpenAiAppsChallengeToken } from '@zayuno/shared';
import { RedisService } from '../../common/services/redis.service';
import { renderLandingPageHtml } from './landing-page.template';

@Controller()
export class PublicPagesController {
  constructor(private readonly redisService: RedisService) {}

  // 1. Health check: /health
  @Get('health')
  @ApiExcludeEndpoint()
  async health() {
    const redis = await this.redisService.health();
    return {
      status: redis.status === 'up' ? 'ok' : 'degraded',
      service: 'zayuno-api',
      timestamp: new Date().toISOString(),
      dependencies: { redis },
    };
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
      else if (safeName.endsWith('.jpg') || safeName.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
      else if (safeName.endsWith('.webmanifest') || safeName.endsWith('.json')) res.setHeader('Content-Type', 'application/manifest+json');
      
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      return res.sendFile(assetPath);
    }
    return res.status(404).send('Asset not found');
  }

  // 2.1. Static Gift Images Serving: /assets/gifts/:filename
  @Get('assets/gifts/:filename')
  @ApiExcludeEndpoint()
  serveGiftAsset(@Param('filename') filename: string, @Res() res: Response) {
    const safeName = path.basename(filename);
    const assetPath = path.join(process.cwd(), 'apps/api/public/assets/gifts', safeName);

    if (fs.existsSync(assetPath)) {
      if (safeName.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
      else if (safeName.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
      else if (safeName.endsWith('.ico')) res.setHeader('Content-Type', 'image/x-icon');
      else if (safeName.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
      else if (safeName.endsWith('.jpg') || safeName.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
      else if (safeName.endsWith('.webmanifest') || safeName.endsWith('.json')) res.setHeader('Content-Type', 'application/manifest+json');

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
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

  // 3.0. Web Manifest: /site.webmanifest
  @Get('site.webmanifest')
  @ApiExcludeEndpoint()
  serveManifest(@Res() res: Response) {
    const manifestPath = path.join(process.cwd(), 'apps/api/public/assets/site.webmanifest');
    if (fs.existsSync(manifestPath)) {
      res.setHeader('Content-Type', 'application/manifest+json');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(manifestPath);
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
  <url>
    <loc>https://zayuno.uz/delete-account</loc>
    <lastmod>2026-09-09</lastmod>
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

  // Public account deletion page required by Google Play's User Data policy.
  @Get('delete-account')
  @ApiExcludeEndpoint()
  getAccountDeletion(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.send(this.renderAccountDeletionHtml());
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
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/assets/icon-192.png">
  <link rel="icon" type="image/png" sizes="512x512" href="/assets/icon-512.png">
  <link rel="manifest" href="/assets/site.webmanifest">

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
      background: radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.16) 0%, rgba(6, 182, 212, 0.08) 35%, transparent 70%);
    }
    .glow-cyan {
      background: radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.12) 0%, transparent 70%);
    }
    .card-glass {
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(51, 65, 85, 0.6);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .card-glass:hover {
      border-color: rgba(52, 211, 153, 0.45);
      transform: translateY(-2px);
      box-shadow: 0 12px 30px -10px rgba(16, 185, 129, 0.12);
    }
    .card-glass-static {
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(51, 65, 85, 0.6);
    }
    .text-gradient {
      background: linear-gradient(135deg, #ffffff 30%, #34d399 70%, #06b6d4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .text-gradient-cyan {
      background: linear-gradient(135deg, #38bdf8 0%, #34d399 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    @keyframes pulse-subtle {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.96); }
    }
    .animate-pulse-subtle {
      animation: pulse-subtle 2.5s infinite ease-in-out;
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
        <a href="/#simulator" class="hover:text-emerald-400 transition-colors">
          <span class="lang-uz">Simulyator</span>
          <span class="lang-en">Simulator</span>
        </a>
        <a href="/#ecosystem" class="hover:text-emerald-400 transition-colors">
          <span class="lang-uz">Ekosistema</span>
          <span class="lang-en">Ecosystem</span>
        </a>
        <a href="/#roadmap" class="hover:text-emerald-400 transition-colors">
          <span class="lang-uz">Status & Reja</span>
          <span class="lang-en">Live Status</span>
        </a>
        <a href="/#for-businesses" class="hover:text-emerald-400 transition-colors">
          <span class="lang-uz">Bizneslar uchun</span>
          <span class="lang-en">For Merchants</span>
        </a>
        <a href="/#developers" class="hover:text-emerald-400 transition-colors">
          <span class="lang-uz">MCP & API</span>
          <span class="lang-en">MCP Protocol</span>
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
      <a href="/#simulator" class="block text-slate-300 hover:text-emerald-400 py-1">
        <span class="lang-uz">Simulyator</span>
        <span class="lang-en">Simulator</span>
      </a>
      <a href="/#ecosystem" class="block text-slate-300 hover:text-emerald-400 py-1">
        <span class="lang-uz">Ekosistema</span>
        <span class="lang-en">Ecosystem</span>
      </a>
      <a href="/#roadmap" class="block text-slate-300 hover:text-emerald-400 py-1">
        <span class="lang-uz">Status & Reja</span>
        <span class="lang-en">Live Status</span>
      </a>
      <a href="/#for-businesses" class="block text-slate-300 hover:text-emerald-400 py-1">
        <span class="lang-uz">Bizneslar uchun</span>
        <span class="lang-en">For Merchants</span>
      </a>
      <a href="/#developers" class="block text-slate-300 hover:text-emerald-400 py-1">
        <span class="lang-uz">MCP & API</span>
        <span class="lang-en">MCP Protocol</span>
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
            text: 'Zayuno — AI agentlar uchun biznes tarmog\u2018i. U real biznes xizmatlarini Model Context Protocol (MCP) orqali ChatGPT, Claude va boshqa AI agentlarga ulaydi. Mijozlar AI orqali xizmatlarni topadi, aniq narx hisob-kitobini oladi va faqat tasdiqlaganidan so\u2018ng buyurtma yoki to\u2018lov amalga oshiriladi.',
          },
        },
        {
          '@type': 'Question',
          name: 'Biznesimni Zayuno tarmog\u2018iga qanday ulayman?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Biznesingizning kassa yoki buyurtma API-sini (iiko, BILLZ, Uzum) @zayuno/provider-sdk orqali ulab, Developer Portal orqali ariza topshirasiz. Integratsiya tekshirilib tasdiqlangandan so\u2018ng, xizmatingiz AI agentlar qidiruvida faollashadi.',
          },
        },
        {
          '@type': 'Question',
          name: 'EVOS va Feed Up bilan sinov qanday o\u2018tdi?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '2026-yil sentyabr oyida o\u2018tkazilgan jonli sinovda Toshkent City manziliga haqiqiy buyurtmalar (EVOS #119174768 va Feed Up #315204) tushirildi. O\u2018rtacha server javob vaqti 192 millisoniyani tashkil qildi va buyurtmalar to\u2018liq tasdiqlandi.',
          },
        },
        {
          '@type': 'Question',
          name: 'Zayuno to\u2018lov ma\u2019lumotlarini saqlaydimi?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yo\u2018q. Zayuno chatida karta raqamlari, CVV yoki maxfiy bank ma\u2019lumotlari saqlanmaydi va so\u2018ralmaydi. To\u2018lov faqat providerning o\u2018z checkout sahifasida amalga oshiriladi.',
          },
        },
        {
          '@type': 'Question',
          name: 'Qanday AI agentlar bilan ishlaydi?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Model Context Protocol (MCP) va standart HTTP API qo\u2018llab-quvvatlaydigan barcha AI vositalari (ChatGPT, Claude, Cursor, maxsus avtonom agentlar) bilan ishlaydi.',
          },
        },
      ],
    };

    const softwareAppSchema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Zayuno Commerce OS for AI',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Cloud / Remote MCP / REST',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description:
        'Unified commerce infrastructure connecting AI agents with verified local businesses, POS backends, and logistics.',
    };

    const sharedHead = this.getSharedHead(
      'Zayuno — O\u2018zbekiston Tijoratini AI Agentlarga Ulaydigan Infratuzilma',
      'Restoranlar, savdo tarmoqlari va xizmatlarni ChatGPT, Claude, Telegram va avtonom agentlar bilan real vaqtda bog\u2018lang. Zero-risk Approval Gate va 0.2 soniyalik to\u2018g\u2018ridan-to\u2018g\u2018ri kassa ijrosi.',
      '/',
      [softwareAppSchema, landingFaqSchema],
    );

    return renderLandingPageHtml(
      sharedHead,
      this.getSharedNavbar(),
      this.getSharedFooter(),
    );
  }

  private renderAccountDeletionHtml(): string {
    const deletionSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Hisobni o‘chirish — Zayuno',
      url: 'https://zayuno.uz/delete-account',
      description: 'Zayuno hisobi va unga bog‘liq shaxsiy ma’lumotlarni o‘chirish tartibi.',
    };

    return `<!DOCTYPE html>
<html lang="uz" class="dark">
<head>
  ${this.getSharedHead(
    'Hisobni o‘chirish — Zayuno',
    'Zayuno hisobi va unga bog‘liq shaxsiy ma’lumotlarni o‘chirish tartibi.',
    '/delete-account',
    [deletionSchema],
  )}
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased lang-uz">
  ${this.getSharedNavbar()}
  <main class="flex-grow py-12 lg:py-16">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
        <span class="lang-uz">Zayuno hisobini o‘chirish</span>
        <span class="lang-en">Delete your Zayuno account</span>
      </h1>
      <div class="mt-8 p-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 space-y-5 leading-relaxed">
        <p class="lang-uz">Hisobingizni o‘chirishni so‘rash uchun quyidagi tugmani bosing. Xatni hisobga bog‘langan email manzilidan yuboring va Google orqali kirishda ishlatgan emailingizni ko‘rsating.</p>
        <p class="lang-en">To request deletion, use the button below. Send the request from the email linked to your account and include the email used for Google sign-in.</p>
        <a href="mailto:support@zayuno.uz?subject=Zayuno%20hisobini%20o%27chirish%20%2F%20Delete%20my%20account" class="inline-flex px-6 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold transition">
          <span class="lang-uz">O‘chirish so‘rovini yuborish</span>
          <span class="lang-en">Send deletion request</span>
        </a>
        <div class="border-t border-slate-800 pt-5 space-y-3 text-sm">
          <p class="lang-uz"><strong class="text-white">O‘chiriladi:</strong> profil, identifikatorlar, Zayuno chatlari, buyurtma ma’lumotlari va hisobga bog‘langan boshqa shaxsiy ma’lumotlar.</p>
          <p class="lang-en"><strong class="text-white">Deleted:</strong> profile, identifiers, Zayuno chats, order information, and other personal data linked to the account.</p>
          <p class="lang-uz"><strong class="text-white">Muddat:</strong> shaxsni tasdiqlagandan keyin 30 kun ichida. Qonun, firibgarlikning oldini olish yoki moliyaviy hisobot uchun saqlanishi shart bo‘lgan ma’lumotlar talab etilgan muddatgacha alohida saqlanishi mumkin.</p>
          <p class="lang-en"><strong class="text-white">Timing:</strong> within 30 days after verification. Records required for legal, fraud-prevention, or financial reporting purposes may be retained separately for the required period.</p>
        </div>
        <p class="text-xs text-slate-400">Support: <a href="mailto:support@zayuno.uz" class="text-emerald-400 underline">support@zayuno.uz</a></p>
      </div>
    </div>
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
          <span class="lang-uz">Kuchga kirish sanasi: 2026-yil 9-sentabr</span>
          <span class="lang-en">Effective Date: September 9, 2026</span>
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
            <li class="lang-uz"><strong>Hisob ma’lumotlari:</strong> Google orqali kirilganda foydalanuvchi ID, ism va email.</li>
            <li class="lang-en"><strong>Account Information:</strong> User ID, name, and email when signing in with Google.</li>
            <li class="lang-uz"><strong>Chat tarixi:</strong> Suhbat matni va tanlovlar hisobga bog‘langan holda saqlanadi, shunda boshqa sessiyada yoki qayta kirganda tarix tiklanadi.</li>
            <li class="lang-en"><strong>Chat History:</strong> Conversation text and selections are stored with the account so history can be restored across sessions and sign-ins.</li>
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
          <p class="lang-uz">
            Chat so‘rovining javob yaratish uchun zarur qismi Zayuno nomidan ishlovchi AI provayderiga uzatilishi mumkin. Saqlangan chatlar reklama maqsadida sotilmaydi.
          </p>
          <p class="lang-en">
            The portion of a chat request needed to generate a response may be sent to an AI provider acting for Zayuno. Stored chats are not sold for advertising.
          </p>
          <p class="lang-uz">
            Mahsulotni yaxshilash uchun PostHog’ga pseudonymous account identifikatori, feature interactionlari, status, count va latency kabi texnik ko‘rsatkichlar yuboriladi. Raw chat yoki prompt matni, ism, email, telefon, manzil va to‘lov ma’lumotlari analytics eventlariga qo‘shilmaydi. Session replay’da matn inputlari va rasmlar maskalanadi, console loglar yozib olinmaydi.
          </p>
          <p class="lang-en">
            To improve the product, Zayuno sends a pseudonymous account identifier, feature interactions, status, counts, and latency metrics to PostHog. Raw chat or prompt text, name, email, phone, address, and payment data are excluded from analytics events. Text inputs and images are masked in session replay, and console logs are not recorded.
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">
            <span class="lang-uz">5. Mahsulot talabi va ixtiyoriy personalization</span>
            <span class="lang-en">5. Product Demand and Optional Personalization</span>
          </h2>
          <p class="lang-uz">Zayunoda hali qo‘llanmaydigan xizmat so‘ralganda, so‘rov mavzusi va uni yuborgan account mahsulot rejalashtirish uchun bog‘langan holda saqlanishi mumkin. Bu bizga nechta noyob mijoz bir xizmatni kutayotganini aniqlashga yordam beradi. Xizmat qo‘shilganda notification yuborish faqat foydalanuvchi “Qo‘shilganda xabar ber” kabi aniq rozilik berganida yoqiladi va uni chat orqali bekor qilish mumkin. Bu talab yozuvlari ko‘pi bilan 365 kun saqlanadi va account o‘chirilsa birga o‘chadi.</p>
          <p class="lang-en">When a customer asks for a service Zayuno does not yet support, the request topic may be linked to the requesting account for product planning. This lets us measure how many unique customers are waiting for a service. Availability notifications are enabled only after an explicit request such as “notify me when it is added,” can be cancelled in chat, are retained for no more than 365 days, and are deleted with the account.</p>
          <p class="lang-uz">Aqlli tavsiyalar faqat foydalanuvchi ilova ichida aniq rozilik berganidan keyin ishlaydi. Har 10 ta yangi xabardan keyin taom/restoran afzalligi, budjet, buyurtma usuli, til, umumiy faol vaqt, dalilga tayangan tanlash usuli, narxga munosabat, yangi variantlarga qiziqish, javob formati va vaqtinchalik interaction qiyinchiliklari yangilanishi mumkin. Behavior signali kamida ikki interaction daliliga tayanadi; har bir signal manba dalili, ishonchlilik darajasi va amal qilish muddati bilan saqlanadi.</p>
          <p class="lang-en">Smart recommendations operate only after explicit in-app consent. After each 10 new messages, useful signals such as food or restaurant preferences, budget, fulfillment preference, language, broad activity window, evidence-based decision style, price sensitivity, novelty preference, response format, and temporary interaction friction may be refreshed. A behavioral signal requires at least two supporting interactions; every signal is stored with provenance, confidence, and an expiry.</p>
          <p class="lang-uz">Zayuno personalization uchun jins, xarakter, kayfiyat, sog‘liq, din, siyosiy qarash, aniq manzil, telefon, email yoki to‘lov ma’lumotlarini avtomatik profil qilmaydi. Hosil qilingan xotirani ilovada ko‘rish, tuzatish, alohida unutish, eksport qilish yoki to‘liq o‘chirish mumkin. Personalization o‘chirilsa, hosil qilingan profil darhol o‘chadi; asosiy chat va buyurtma funksiyalari ishlashda davom etadi.</p>
          <p class="lang-en">Zayuno does not automatically profile gender, personality, mood, health, religion, political views, precise address, phone, email, or payment information for personalization. Derived memory can be viewed, corrected, individually forgotten, exported, or fully deleted in the app. Disabling personalization immediately removes the derived profile while core chat and ordering remain available.</p>
          <p class="lang-uz">Memory signallari ko‘pi bilan 365 kun, suggestion interactionlari 180 kun va texnik analysis joblari 30 kun saqlanadi. Chat tarixi foydalanuvchi o‘chirguncha yoki hisob o‘chirilguncha saqlanadi. Chat matni bazada shifrlangan holda saqlanadi.</p>
          <p class="lang-en">Memory signals are retained for no more than 365 days, suggestion interactions for 180 days, and technical analysis jobs for 30 days. Chat history remains until the user deletes it or deletes the account. Chat text is encrypted at rest.</p>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-bold text-white tracking-tight">
            <span class="lang-uz">6. Aloqa va murojaat</span>
            <span class="lang-en">6. Contact & Inquiries</span>
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
